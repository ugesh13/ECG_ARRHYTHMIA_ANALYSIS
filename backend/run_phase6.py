"""Executable CLI Runner for Phase 6 ECG Temporal / RR-Interval Experiments."""
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.phase6_trainer import run_phase6_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

if __name__ == "__main__":
    print("=" * 75)
    print("PHASE 6 — ECG TEMPORAL / RR-INTERVAL FEATURE ENGINEERING")
    print("Controlled Experiment: Morphology vs. Morphology + Cardiac Timing")
    print("=" * 75)
    try:
        res = run_phase6_pipeline()
        print("\n" + "=" * 75)
        print("PHASE 6 EXPERIMENT PIPELINE COMPLETE")
        print("=" * 75)
        print(f"Models directory:   {res['models_dir']}")
        print(f"Results directory:  {res['results_dir']}")

        t_stats = res["train_stats"]
        v_stats = res["val_stats"]
        print(f"\n[Dataset Partitions & Usable Samples]")
        print(f"  Train Primary Examined:  {t_stats.total_beats_examined:,}")
        print(f"  Train Usable (Causal):   {t_stats.usable_causal_beats:,} (excluded {t_stats.excluded_edge_beats_causal} edge beats)")
        print(f"  Train Usable (Bidi):     {t_stats.usable_bidi_beats:,} (excluded {t_stats.excluded_edge_beats_bidi} edge beats)")
        print(f"  Val Primary Examined:    {v_stats.total_beats_examined:,}")
        print(f"  Val Usable (Causal):     {v_stats.usable_causal_beats:,} (excluded {v_stats.excluded_edge_beats_causal} edge beats)")
        print(f"  Val Usable (Bidi):       {v_stats.usable_bidi_beats:,} (excluded {v_stats.excluded_edge_beats_bidi} edge beats)")

        print(f"\n[Validation Performance Comparison]")
        for m_name, f_dict in res["results"].items():
            print(f"\n  --- {m_name.upper()} ---")
            for f_name, rep in f_dict.items():
                print(f"    [{f_name}]")
                print(f"      Accuracy:          {rep['accuracy']:.4f}")
                print(f"      Balanced Accuracy: {rep['balanced_accuracy']:.4f}")
                print(f"      Macro F1:          {rep['macro_f1']:.4f}")
                print(f"      S Recall:          {rep['per_class']['S']['recall']:.4f}")
                print(f"      V Recall:          {rep['per_class']['V']['recall']:.4f}")
                print(f"      F Recall:          {rep['per_class']['F']['recall']:.4f}")
                print(f"      N Recall:          {rep['per_class']['N']['recall']:.4f}")

    except Exception as e:
        print(f"\nExecution error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
