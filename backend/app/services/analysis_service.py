"""ECG Record Arrhythmia Analysis Orchestration Service.

Connects:
1. WFDB record loading (ecg_service)
2. Lead selection, filtering, and 209-D feature extraction (feature_service)
3. Frozen Random Forest inference with probability calibration (inference_service)
4. Result aggregation, caching, and pagination into structured Pydantic models.
"""
from dataclasses import dataclass
import logging
import time
from typing import Dict, List, Optional

import numpy as np

from app.core.errors import (
    AnalysisError,
    BeatNotFoundError,
    ModelUnavailableError,
    NoAnnotationsError,
    RecordNotFoundError,
)
from app.models.schemas import (
    AggregateCounts,
    AggregatePercentages,
    BeatAnalysisItem,
    BeatDetailResponse,
    ClassProbabilities,
    MorphologyData,
    PaginatedBeatsResponse,
    RecordAnalysisResponse,
    RecordAnalysisSummaryResponse,
)
from app.services import ecg_service, file_service
from app.services.feature_service import ExtractedBeat, get_record_feature_pipeline
from app.services.inference_service import EDGE_BEAT_CLASS, get_inference_service
from app.utils.validators import validate_record_id

logger = logging.getLogger(__name__)


@dataclass
class CachedAnalysisBundle:
    """Internal cache entry storing both response models and raw extracted waveforms."""
    response: RecordAnalysisResponse
    extracted_beats: List[ExtractedBeat]
    execution_time_ms: float


# In-memory session cache for analyzed records
_analysis_cache: Dict[str, CachedAnalysisBundle] = {}


def analyze_record(record_id: str, force_refresh: bool = False) -> RecordAnalysisResponse:
    """Execute end-to-end arrhythmia analysis for an entire ECG recording.

    Parameters:
      record_id: Identifier of the record (e.g., '100', '208', or upload ID).
      force_refresh: If True, bypasses the in-memory cache and recomputes analysis.

    Returns:
      RecordAnalysisResponse containing per-beat predictions, class probabilities,
      aggregate counts, and percentage breakdowns.
    """
    start_time = time.perf_counter()
    validate_record_id(record_id)

    # 1. Check in-memory cache
    if not force_refresh and record_id in _analysis_cache:
        logger.info("Returning cached analysis result for record %s", record_id)
        return _analysis_cache[record_id].response

    # 2. Locate and resolve record (raises RecordNotFoundError if missing)
    directory, stem, source = ecg_service.resolve_record(record_id)
    metadata = ecg_service.get_record_metadata(record_id)

    # 3. Ensure inference service and frozen model are ready
    inference_service = get_inference_service()
    if not inference_service.is_loaded():
        try:
            inference_service.load_model()
        except Exception as exc:
            logger.error("Failed to load ML model for analysis: %s", exc)
            raise ModelUnavailableError("Arrhythmia classification model is currently unavailable.") from exc

    # 4. Extract 209-D beat features from continuous signal and annotations
    pipeline = get_record_feature_pipeline()
    try:
        extracted_beats: List[ExtractedBeat] = pipeline.extract_record_features(record_id)
    except Exception as exc:
        logger.error("Feature extraction failed for record %s: %s", record_id, exc)
        raise AnalysisError(f"Failed to extract ECG features from record '{record_id}': {exc}") from exc

    total_detected = len(extracted_beats)
    if total_detected == 0:
        if not metadata.get("has_annotations", False):
            raise NoAnnotationsError(
                f"Record '{record_id}' does not contain an annotation file (.atr). "
                "Beat-level arrhythmia classification requires reference R-peak annotations."
            )
        raise AnalysisError(f"No analyzable heartbeats could be extracted from record '{record_id}'.")

    # 5. Partition beats into valid 209-D beats and edge beats
    valid_indices: List[int] = []
    valid_feature_list: List[np.ndarray] = []

    for idx, beat in enumerate(extracted_beats):
        if beat.is_valid_bidirectional:
            valid_indices.append(idx)
            valid_feature_list.append(beat.feature_vector)

    # 6. Execute model inference on valid beats in a single efficient batch
    if len(valid_feature_list) > 0:
        valid_matrix = np.stack(valid_feature_list, axis=0).astype(np.float32)
        assert valid_matrix.shape[1] == 209, f"Feature dimension must be 209, got {valid_matrix.shape[1]}"
        predictions = inference_service.predict(valid_matrix)
        probabilities = inference_service.predict_proba(valid_matrix)
    else:
        predictions = np.empty((0,), dtype=str)
        probabilities = np.empty((0, 4), dtype=np.float32)

    # 7. Reassemble per-beat analysis items in chronological order
    beat_items: List[BeatAnalysisItem] = []
    valid_pointer = 0

    lead_used = extracted_beats[0].lead_name if extracted_beats else "MLII"

    for idx, beat in enumerate(extracted_beats):
        if beat.is_valid_bidirectional:
            pred_class = str(predictions[valid_pointer])
            probs = probabilities[valid_pointer]
            conf = float(np.max(probs))
            prob_obj = ClassProbabilities(
                N=float(probs[0]),
                S=float(probs[1]),
                V=float(probs[2]),
                F=float(probs[3]),
            )
            beat_items.append(
                BeatAnalysisItem(
                    beat_index=beat.beat_index,
                    sample_index=beat.sample_index,
                    time_seconds=beat.time_seconds,
                    symbol=beat.symbol,
                    ground_truth_symbol=beat.symbol,
                    ground_truth_class=beat.ground_truth_class,
                    predicted_class=pred_class,
                    confidence=round(conf, 4),
                    probabilities=prob_obj,
                    is_edge_beat=False,
                    status="classified",
                    is_valid=True,
                    exclusion_reason=None,
                )
            )
            valid_pointer += 1
        else:
            # Controlled edge beat
            beat_items.append(
                BeatAnalysisItem(
                    beat_index=beat.beat_index,
                    sample_index=beat.sample_index,
                    time_seconds=beat.time_seconds,
                    symbol=beat.symbol,
                    ground_truth_symbol=beat.symbol,
                    ground_truth_class=beat.ground_truth_class,
                    predicted_class=None,
                    confidence=0.0,
                    probabilities=ClassProbabilities(N=0.0, S=0.0, V=0.0, F=0.0),
                    is_edge_beat=True,
                    status="unclassified_edge_beat",
                    is_valid=False,
                    exclusion_reason=beat.exclusion_reason or "Boundary edge beat",
                )
            )

    # 8. Compute aggregate statistics
    normal_count = sum(1 for b in beat_items if b.predicted_class == "N")
    supraventricular_count = sum(1 for b in beat_items if b.predicted_class == "S")
    ventricular_count = sum(1 for b in beat_items if b.predicted_class == "V")
    fusion_count = sum(1 for b in beat_items if b.predicted_class == "F")
    edge_count = sum(1 for b in beat_items if b.is_edge_beat)
    classified_count = normal_count + supraventricular_count + ventricular_count + fusion_count

    assert total_detected == (classified_count + edge_count), (
        f"Sum mismatch: detected {total_detected} != classified {classified_count} + edge {edge_count}"
    )

    class_counts = {
        "N": normal_count,
        "S": supraventricular_count,
        "V": ventricular_count,
        "F": fusion_count,
    }

    counts = AggregateCounts(
        normal_count=normal_count,
        supraventricular_count=supraventricular_count,
        ventricular_count=ventricular_count,
        fusion_count=fusion_count,
        unclassified_edge_count=edge_count,
        total_detected_beats=total_detected,
        total_classified_beats=classified_count,
    )

    if total_detected > 0:
        percentages = AggregatePercentages(
            normal_percentage=round((normal_count / total_detected) * 100.0, 2),
            supraventricular_percentage=round((supraventricular_count / total_detected) * 100.0, 2),
            ventricular_percentage=round((ventricular_count / total_detected) * 100.0, 2),
            fusion_percentage=round((fusion_count / total_detected) * 100.0, 2),
            unclassified_edge_percentage=round((edge_count / total_detected) * 100.0, 2),
        )
        class_percentages = {
            "N": round((normal_count / total_detected) * 100.0, 2),
            "S": round((supraventricular_count / total_detected) * 100.0, 2),
            "V": round((ventricular_count / total_detected) * 100.0, 2),
            "F": round((fusion_count / total_detected) * 100.0, 2),
        }
    else:
        percentages = AggregatePercentages(
            normal_percentage=0.0,
            supraventricular_percentage=0.0,
            ventricular_percentage=0.0,
            fusion_percentage=0.0,
            unclassified_edge_percentage=0.0,
        )
        class_percentages = {"N": 0.0, "S": 0.0, "V": 0.0, "F": 0.0}

    execution_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    # 9. Build response object
    response = RecordAnalysisResponse(
        record_id=record_id,
        status="completed",
        message="Arrhythmia analysis completed successfully.",
        lead_name=lead_used,
        sampling_rate=metadata.get("sampling_frequency", 360.0),
        duration_seconds=metadata.get("duration_seconds", 0.0),
        total_beats_detected=total_detected,
        valid_beats_analyzed=classified_count,
        edge_beats=edge_count,
        total_detected_beats=total_detected,
        total_classified_beats=classified_count,
        total_edge_beats=edge_count,
        class_counts=class_counts,
        class_percentages=class_percentages,
        execution_time_ms=execution_time_ms,
        aggregate_counts=counts,
        percentages=percentages,
        beats=beat_items,
    )

    # 10. Update session cache and file service history
    _analysis_cache[record_id] = CachedAnalysisBundle(
        response=response,
        extracted_beats=extracted_beats,
        execution_time_ms=execution_time_ms,
    )
    file_service.update_analysis_status(record_id, source, "completed")

    logger.info(
        "Analysis complete for record %s: %d beats detected (%d classified, %d edge beats) in %.2f ms.",
        record_id, total_detected, classified_count, edge_count, execution_time_ms
    )
    return response


def get_record_summary(record_id: str) -> RecordAnalysisSummaryResponse:
    """Retrieve cached summary of arrhythmia analysis for a record.

    Does not trigger a heavy re-computation if the record has not been analyzed yet.
    """
    validate_record_id(record_id)
    # Check that record physically exists
    ecg_service.resolve_record(record_id)

    if record_id in _analysis_cache:
        bundle = _analysis_cache[record_id]
        resp = bundle.response
        return RecordAnalysisSummaryResponse(
            record_id=record_id,
            status="completed",
            message=resp.message,
            lead_name=resp.lead_name,
            sampling_rate=resp.sampling_rate,
            duration_seconds=resp.duration_seconds,
            total_beats_detected=resp.total_beats_detected,
            valid_beats_analyzed=resp.valid_beats_analyzed,
            edge_beats=resp.edge_beats,
            class_counts=resp.class_counts,
            class_percentages=resp.class_percentages,
            execution_time_ms=resp.execution_time_ms,
            model_name=resp.model_name,
            model_version=resp.model_version,
        )

    return RecordAnalysisSummaryResponse(
        record_id=record_id,
        status="not_analyzed",
        message=f"Record '{record_id}' has not been analyzed yet. Run POST /api/analysis/{record_id} to execute inference.",
    )


def get_paginated_beats(
    record_id: str,
    page: int = 1,
    page_size: int = 50,
    class_filter: Optional[str] = None,
    prediction_filter: Optional[str] = None,
    ground_truth_filter: Optional[str] = None,
) -> PaginatedBeatsResponse:
    """Return paginated beat predictions with optional class, prediction, and ground truth filters."""
    validate_record_id(record_id)

    if record_id not in _analysis_cache:
        analyze_record(record_id)

    bundle = _analysis_cache[record_id]
    items = bundle.response.beats

    # Apply filters
    if class_filter:
        items = [
            b for b in items
            if b.predicted_class == class_filter or b.ground_truth_class == class_filter
        ]
    if prediction_filter:
        items = [b for b in items if b.predicted_class == prediction_filter]
    if ground_truth_filter:
        items = [
            b for b in items
            if b.ground_truth_class == ground_truth_filter or b.symbol == ground_truth_filter
        ]

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    paged_items = items[start:end]

    return PaginatedBeatsResponse(
        record_id=record_id,
        page=page,
        page_size=page_size,
        total=total,
        items=paged_items,
    )


def get_beat_detail(record_id: str, beat_idx: int) -> BeatDetailResponse:
    """Retrieve complete 200-sample morphology waveform and 9 RR features for a single beat."""
    validate_record_id(record_id)

    if record_id not in _analysis_cache:
        analyze_record(record_id)

    bundle = _analysis_cache[record_id]
    all_beats = bundle.response.beats
    if beat_idx < 0 or beat_idx >= len(all_beats):
        raise BeatNotFoundError(
            f"Beat index {beat_idx} not found for record '{record_id}'. Range: 0 to {len(all_beats) - 1}."
        )

    item = all_beats[beat_idx]
    extracted = bundle.extracted_beats[beat_idx]

    morphology = MorphologyData(
        samples=extracted.morphology_window.tolist(),
        sample_offsets=list(range(-90, 110)),
    )

    return BeatDetailResponse(
        record_id=record_id,
        beat_index=item.beat_index,
        sample_index=item.sample_index,
        time_seconds=item.time_seconds,
        ground_truth_symbol=item.ground_truth_symbol,
        ground_truth_class=item.ground_truth_class,
        predicted_class=item.predicted_class,
        confidence=item.confidence,
        probabilities=item.probabilities,
        is_edge_beat=item.is_edge_beat,
        status=item.status,
        is_valid=item.is_valid,
        exclusion_reason=item.exclusion_reason,
        morphology=morphology,
        rr_features=extracted.rr_features,
    )


def run_analysis(record_id: str) -> RecordAnalysisResponse:
    """Alias for analyze_record maintaining backward compatibility."""
    return analyze_record(record_id)

