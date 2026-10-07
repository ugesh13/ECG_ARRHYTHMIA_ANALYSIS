"""Executable CLI Runner for Phase 16 End-to-End ECG Analysis API Verification."""
import logging
from pathlib import Path
import sys

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.ml.model_persistence import train_and_persist_frozen_model
from app.services.analysis_service import analyze_record
from app.services.inference_service import EDGE_BEAT_CLASS, get_inference_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

if __name__ == "__main__":
    print("=" * 78)
    print("PHASE 16 — BACKEND ECG ANALYSIS API & END-TO-END INFERENCE INTEGRATION")
    print("=" * 78)
    try:
        # Ensure model is ready
        print("\n[Step 1] Verifying frozen model persistence...")
        train_and_persist_frozen_model(settings.frozen_model_path)
        service = get_inference_service()
        service.load_model()
        print(f"Model loaded: {service.is_loaded()}")

        # Run end-to-end analysis on record 100
        test_record_id = "100"
        print(f"\n[Step 2] Executing end-to-end arrhythmia analysis on MIT-BIH record {test_record_id}...")
        result = analyze_record(test_record_id, force_refresh=True)

        print("\n" + "-" * 78)
        print("END-TO-END ANALYSIS SUMMARY FOR RECORD " + test_record_id)
        print("-" * 78)
        print(f"Status:                   {result.status}")
        print(f"Lead Analyzed:            {result.lead_name}")
        print(f"Sampling Frequency:       {result.sampling_rate} Hz")
        print(f"Recording Duration:       {result.duration_seconds:.1f} s ({result.duration_seconds / 60.0:.1f} min)")
        print(f"Total Detected Beats:     {result.total_detected_beats:,}")
        print(f"Total Classified Beats:   {result.total_classified_beats:,}")
        print(f"Unclassified Edge Beats:  {result.total_edge_beats:,}")

        counts = result.aggregate_counts
        pct = result.percentages
        print("\n" + "-" * 78)
        print("DETECTED ARRHYTHMIA CATEGORY COUNTS & BURDEN")
        print("-" * 78)
        print(f"  Normal (N):             {counts.normal_count:>6,} beats ({pct.normal_percentage:>6.2f}%)")
        print(f"  Supraventricular (S):   {counts.supraventricular_count:>6,} beats ({pct.supraventricular_percentage:>6.2f}%)")
        print(f"  Ventricular (V):        {counts.ventricular_count:>6,} beats ({pct.ventricular_percentage:>6.2f}%)")
        print(f"  Fusion (F):             {counts.fusion_count:>6,} beats ({pct.fusion_percentage:>6.2f}%)")
        print(f"  Edge Beats:             {counts.unclassified_edge_count:>6,} beats ({pct.unclassified_edge_percentage:>6.2f}%)")

        print("\n" + "-" * 78)
        print("SAMPLE BEAT PREDICTIONS (First 5 beats)")
        print("-" * 78)
        for b in result.beats[:5]:
            probs_str = f"P(N)={b.probabilities.N:.3f}, P(S)={b.probabilities.S:.3f}, P(V)={b.probabilities.V:.3f}, P(F)={b.probabilities.F:.3f}"
            pred_str = str(b.predicted_class) if b.predicted_class is not None else "unclassified_edge_beat"
            print(f"  Beat {b.beat_index:>4d} @ {b.time_seconds:>7.2f}s | Sample: {b.sample_index:>7d} | Symbol: {b.symbol:1s} | Pred: {pred_str:24s} | Conf: {b.confidence:.3f} | {probs_str}")

        print("\n" + "=" * 78)
        print("PHASE 16 FINISHED SUCCESSFULLY — END-TO-END INFERENCE INTEGRATED")
        print("=" * 78)

    except Exception as e:
        print(f"\nExecution error in Phase 16 runner: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
