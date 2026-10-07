"""Executable CLI Runner for Phase 7 Controlled Model Optimization and Hyperparameter Tuning."""
import logging
from pathlib import Path
import sys

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.phase7_trainer import PHASE6_BASELINES, run_phase7_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

if __name__ == "__main__":
    print("=" * 78)
    print("PHASE 7 — CONTROLLED MODEL OPTIMIZATION & HYPERPARAMETER TUNING")
    print("Record-Grouped Cross-Validation (Train Only) & Validation Benchmarking")
    print("=" * 78)
    try:
        results = run_phase7_pipeline()
        print("\n" + "=" * 78)
        print("PHASE 7 OPTIMIZATION & EVALUATION COMPLETE")
        print("=" * 78)
        print(f"Models directory:   {results['models_dir']}")
        print(f"Results directory:  {results['results_dir']}")
        print(f"Feature dimension:  {results['feature_dim']} (200 morphology + 9 bidirectional RR)")
        print(f"Training samples:   {results['train_samples']:,} (16 records, grouped CV)")
        print(f"Validation samples: {results['val_samples']:,} (6 records, unseen DS1)")
        print(f"DS2 Test Set:       LOCKED & UNTOUCHED (0 records, 0 beats evaluated)")

        print("\n" + "-" * 78)
        print("SELECTED OPTIMAL HYPERPARAMETERS (Selected strictly via Training CV)")
        print("-" * 78)
        for m_name, params in results["best_params"].items():
            print(f"  [{m_name.upper()}]:")
            for k, v in params.items():
                print(f"    - {k}: {v}")

        print("\n" + "-" * 78)
        print("PHASE 6 BASELINE VS PHASE 7 TUNED VALIDATION COMPARISON")
        print("-" * 78)
        tuned_reports = results["tuned_reports"]
        for m_name in ["logistic_regression", "random_forest", "hist_gradient_boosting"]:
            base = PHASE6_BASELINES[m_name]
            rep = tuned_reports[m_name]
            f1_gain = rep["macro_f1"] - base["macro_f1"]
            rel_gain = (f1_gain / base["macro_f1"]) * 100.0
            bal_gain = rep["balanced_accuracy"] - base["balanced_accuracy"]
            print(f"\n  --- {m_name.replace('_', ' ').upper()} ---")
            print(f"    Phase 6 Baseline: Macro F1 = {base['macro_f1']:.4f} | Bal Acc = {base['balanced_accuracy']:.4f}")
            print(f"    Phase 7 Tuned:    Macro F1 = {rep['macro_f1']:.4f} | Bal Acc = {rep['balanced_accuracy']:.4f}")
            print(f"    Delta:            Macro F1 = {f1_gain:+.4f} ({rel_gain:+.2f}%) | Bal Acc = {bal_gain:+.4f}")
            print(f"    Per-Class Recall: S={rep['per_class']['S']['recall']:.4f}, V={rep['per_class']['V']['recall']:.4f}, F={rep['per_class']['F']['recall']:.4f}, N={rep['per_class']['N']['recall']:.4f}")

        print("\n" + "=" * 78)
        print("PHASE 7 EXECUTION FINISHED SUCCESSFULLY")
        print("=" * 78)

    except Exception as e:
        print(f"\nExecution error in Phase 7 pipeline: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
