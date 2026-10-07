"""Executable CLI Runner for Phase 15 Model Persistence & Inference Verification."""
import logging
from pathlib import Path
import sys

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.ml.model_persistence import train_and_persist_frozen_model, verify_model_artifact
from app.services.inference_service import get_inference_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

if __name__ == "__main__":
    print("=" * 78)
    print("PHASE 15 — BACKEND MODEL PERSISTENCE & INFERENCE ENGINE")
    print("=" * 78)
    try:
        model_path = train_and_persist_frozen_model(settings.frozen_model_path)
        stats = verify_model_artifact(model_path)

        print("\n" + "-" * 78)
        print("MODEL ARTIFACT VERIFICATION SUMMARY")
        print("-" * 78)
        print(f"Artifact Location:   {stats['file_path']}")
        print(f"Artifact Size:       {stats['file_size_bytes'] / (1024*1024):.2f} MB ({stats['file_size_bytes']:,} bytes)")
        print(f"Algorithm:           {stats['model_type']}")
        print(f"Number of Trees:     {stats['n_estimators']}")
        print(f"Max Depth:           {stats['max_depth']}")
        print(f"Min Samples Split:   {stats['min_samples_split']}")
        print(f"Min Samples Leaf:    {stats['min_samples_leaf']}")
        print(f"Max Features:        {stats['max_features']}")
        print(f"Class Weighting:     {stats['class_weight']}")
        print(f"Random State:        {stats['random_state']}")
        print(f"Expected Features:   {stats['n_features_in']}")
        print(f"Target Classes:      {stats['classes']}")

        # Test InferenceService
        service = get_inference_service()
        service.load_model()
        print("\n" + "-" * 78)
        print("INFERENCE SERVICE TEST")
        print("-" * 78)
        print(f"Singleton Loaded:    {service.is_loaded()}")
        info = service.get_model_info()
        print(f"Service Model Info:  {info['model_name']} ({info['model_version']})")

        print("\n" + "=" * 78)
        print("PHASE 15 FINISHED SUCCESSFULLY — MODEL IS PERSISTED & OPERATIONAL")
        print("=" * 78)

    except Exception as e:
        print(f"\nExecution error in Phase 15 runner: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
