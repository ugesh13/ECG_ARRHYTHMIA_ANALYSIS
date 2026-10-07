"""Executable CLI runner for Phase 5 Baseline Machine Learning Experiments."""
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.trainer import run_phase5_baseline_experiment

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

if __name__ == "__main__":
    print("=" * 70)
    print("PHASE 5 — BASELINE MACHINE LEARNING EXPERIMENTS")
    print("ECG Arrhythmia Analysis — ANSI/AAMI EC57 4-Class Formulation")
    print("=" * 70)
    try:
        results = run_phase5_baseline_experiment()
        print("\n" + "=" * 70)
        print("EXPERIMENT EXECUTION COMPLETE")
        print("=" * 70)
        print(f"Training samples:   {results['train_samples']:,} (16 DS1 records)")
        print(f"Validation samples: {results['val_samples']:,} (6 DS1 records)")
        print(f"Feature dimension:  {results['feature_dim']} samples/beat")
        print(f"Models directory:   {results['models_dir']}")
        print(f"Results directory:  {results['results_dir']}")
        print("\nValidation Summary:")
        for model_name, rep in results["reports"].items():
            print(f"\n[{model_name.upper()}]")
            print(f"  Accuracy:          {rep['accuracy']:.4f}")
            print(f"  Balanced Accuracy: {rep['balanced_accuracy']:.4f}")
            print(f"  Macro F1:          {rep['macro_f1']:.4f}")
            print(f"  Weighted F1:       {rep['weighted_f1']:.4f}")
            roc_str = f"{rep['roc_auc_ovr_macro']:.4f}" if rep['roc_auc_ovr_macro'] is not None else "N/A"
            pr_str = f"{rep['pr_auc_ovr_macro']:.4f}" if rep['pr_auc_ovr_macro'] is not None else "N/A"
            print(f"  ROC-AUC (Macro):   {roc_str}")
            print(f"  PR-AUC (Macro):    {pr_str}")
            print("  Per-Class Metrics:")
            for cls, pcm in rep["per_class"].items():
                print(f"    Class {cls}: Precision={pcm['precision']:.4f}, Recall={pcm['recall']:.4f}, F1={pcm['f1_score']:.4f}, Support={pcm['support']:,}")
    except Exception as e:
        print(f"\nExecution error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
