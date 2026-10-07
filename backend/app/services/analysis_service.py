"""ECG Record Arrhythmia Analysis Orchestration Service.

Connects:
1. WFDB record loading (ecg_service)
2. Lead selection, filtering, and 209-D feature extraction (feature_service)
3. Frozen Random Forest inference with probability calibration (inference_service)
4. Result aggregation into structured, validated Pydantic models.
"""
import logging
from typing import Dict, List, Optional

import numpy as np

from app.core.errors import (
    AnalysisError,
    ModelUnavailableError,
    NoAnnotationsError,
    RecordNotFoundError,
)
from app.models.schemas import (
    AggregateCounts,
    AggregatePercentages,
    BeatAnalysisItem,
    ClassProbabilities,
    RecordAnalysisResponse,
)
from app.services import ecg_service, file_service
from app.services.feature_service import ExtractedBeat, get_record_feature_pipeline
from app.services.inference_service import EDGE_BEAT_CLASS, get_inference_service
from app.utils.validators import validate_record_id

logger = logging.getLogger(__name__)

# In-memory session cache for analyzed records
_analysis_cache: Dict[str, RecordAnalysisResponse] = {}


def analyze_record(record_id: str, force_refresh: bool = False) -> RecordAnalysisResponse:
    """Execute end-to-end arrhythmia analysis for an entire ECG recording.

    Parameters:
      record_id: Identifier of the record (e.g., '100', '208', or upload ID).
      force_refresh: If True, bypasses the in-memory cache and recomputes analysis.

    Returns:
      RecordAnalysisResponse containing per-beat predictions, class probabilities,
      aggregate counts, and percentage breakdowns.
    """
    validate_record_id(record_id)

    # 1. Check in-memory cache
    if not force_refresh and record_id in _analysis_cache:
        logger.info("Returning cached analysis result for record %s", record_id)
        return _analysis_cache[record_id]

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

    # 6. Execute model inference on valid beats
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
                    ground_truth_class=beat.ground_truth_class,
                    predicted_class=pred_class,
                    confidence=round(conf, 4),
                    probabilities=prob_obj,
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
                    ground_truth_class=beat.ground_truth_class,
                    predicted_class=EDGE_BEAT_CLASS,
                    confidence=0.0,
                    probabilities=ClassProbabilities(N=0.0, S=0.0, V=0.0, F=0.0),
                    is_valid=False,
                    exclusion_reason=beat.exclusion_reason or "Boundary edge beat",
                )
            )

    # 8. Compute aggregate statistics
    normal_count = sum(1 for b in beat_items if b.predicted_class == "N")
    supraventricular_count = sum(1 for b in beat_items if b.predicted_class == "S")
    ventricular_count = sum(1 for b in beat_items if b.predicted_class == "V")
    fusion_count = sum(1 for b in beat_items if b.predicted_class == "F")
    edge_count = sum(1 for b in beat_items if b.predicted_class == EDGE_BEAT_CLASS)
    classified_count = normal_count + supraventricular_count + ventricular_count + fusion_count

    assert total_detected == (classified_count + edge_count), (
        f"Sum mismatch: detected {total_detected} != classified {classified_count} + edge {edge_count}"
    )

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
    else:
        percentages = AggregatePercentages(
            normal_percentage=0.0,
            supraventricular_percentage=0.0,
            ventricular_percentage=0.0,
            fusion_percentage=0.0,
            unclassified_edge_percentage=0.0,
        )

    # 9. Build response object
    response = RecordAnalysisResponse(
        record_id=record_id,
        status="completed",
        message="Arrhythmia analysis completed successfully.",
        lead_name=lead_used,
        sampling_rate=metadata.get("sampling_frequency", 360.0),
        duration_seconds=metadata.get("duration_seconds", 0.0),
        total_detected_beats=total_detected,
        total_classified_beats=classified_count,
        total_edge_beats=edge_count,
        aggregate_counts=counts,
        percentages=percentages,
        beats=beat_items,
    )

    # 10. Update session cache and file service history
    _analysis_cache[record_id] = response
    file_service.update_analysis_status(record_id, source, "completed")

    logger.info(
        "Analysis complete for record %s: %d beats detected (%d classified, %d edge beats).",
        record_id, total_detected, classified_count, edge_count
    )
    return response


def run_analysis(record_id: str) -> RecordAnalysisResponse:
    """Alias for analyze_record maintaining backward compatibility with Phase 14/15 routers."""
    return analyze_record(record_id)
