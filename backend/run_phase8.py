"""Executable CLI Runner for Phase 8 Final Model Freeze & Locked DS2 Test Evaluation."""
import logging
from pathlib import Path
import sys

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.phase8_evaluator import execute_phase8_final_evaluation

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

if __name__ == "__main__":
    print("=" * 78)
    print("PHASE 8 — FINAL MODEL FREEZE & LOCKED DS2 TEST EVALUATION")
    print("Single Independent Evaluation on 22 Held-Out MIT-BIH DS2 Records")
    print("=" * 78)
    try:
        results = execute_phase8_final_evaluation()
        report = results["report"]
        res_json = results["results_json"]

        print("\n" + "=" * 78)
        print("PHASE 8 DS2 EVALUATION COMPLETE")
        print("=" * 78)
        print(f"Evaluated Test Records: 22 DS2 records")
        print(f"Evaluated Usable Beats: {res_json['evaluated_beats_count']:,} (4-class, bidirectional valid)")
        print(f"Overall Accuracy:       {report.accuracy:.4f} ({report.accuracy*100:.2f}%)")
        print(f"Balanced Accuracy:      {report.balanced_accuracy:.4f}")
        print(f"Macro F1 Score:         {report.macro_f1:.4f}")
        print(f"Weighted F1 Score:      {report.weighted_f1:.4f}")

        print("\n" + "-" * 78)
        print("PER-CLASS METRICS (AAMI EC57)")
        print("-" * 78)
        for cls in ["N", "S", "V", "F"]:
            pcm = report.per_class[cls]
            print(f"  Class {cls}: Precision={pcm.precision:.4f} | Recall={pcm.recall:.4f} | F1={pcm.f1_score:.4f} | Support={pcm.support:,}")

        print("\n" + "-" * 78)
        print("4x4 CONFUSION MATRIX (Rows: True [N, S, V, F], Cols: Pred [N, S, V, F])")
        print("-" * 78)
        for row, cls in zip(report.confusion_matrix, ["N", "S", "V", "F"]):
            print(f"  True {cls:2s}: {row}")

        print("\n" + "=" * 78)
        print("PHASE 8 FINISHED SUCCESSFULLY — MODEL IS PERMANENTLY FROZEN")
        print("=" * 78)

    except Exception as e:
        print(f"\nExecution error in Phase 8 pipeline: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
