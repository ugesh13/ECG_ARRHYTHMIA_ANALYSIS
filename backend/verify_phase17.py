"""Verification script for Phase 17 - Experimental Results & Model Provenance APIs.

Tests all 7 endpoints against the locked Phase 8/9 artifacts:
1. GET /api/model/info
2. GET /api/experiments/benchmark
3. GET /api/experiments/generalization
4. GET /api/experiments/feature-importance
5. GET /api/experiments/record-breakdown
6. GET /api/experiments/dataset-distribution
7. GET /api/experiments/artifacts
"""

import sys
from fastapi.testclient import TestClient

from app.main import app

def run_verification():
    print("=" * 60)
    print("PHASE 17 ENDPOINT VERIFICATION")
    print("=" * 60)

    client = TestClient(app)

    # 1. /api/model/info
    print("\n[1] Testing GET /api/model/info ...")
    r1 = client.get("/api/model/info")
    assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
    d1 = r1.json()
    print(f"  Model Type: {d1['model_type']}")
    print(f"  Estimators: {d1['n_estimators']}, Max Depth: {d1['max_depth']}")
    print(f"  Dimension: {d1['feature_dimension']} (Morphology: {d1['morphology_dimension']}, RR: {d1['rr_dimension']})")
    print(f"  Classes: {d1['class_labels']}")
    print(f"  Model Loaded: {d1['model_loaded']}")
    assert d1["model_type"] == "RandomForestClassifier"
    assert d1["feature_dimension"] == 209
    assert d1["class_labels"] == ["N", "S", "V", "F"]

    # 2. /api/experiments/benchmark
    print("\n[2] Testing GET /api/experiments/benchmark ...")
    r2 = client.get("/api/experiments/benchmark")
    assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
    d2 = r2.json()
    m2 = d2["metrics"]
    print(f"  Accuracy: {m2['accuracy']:.4f}")
    print(f"  Balanced Accuracy: {m2['balanced_accuracy']:.4f}")
    print(f"  Macro Precision: {m2['macro_precision']:.4f}")
    print(f"  Macro Recall: {m2['macro_recall']:.4f}")
    print(f"  Macro F1: {m2['macro_f1']:.4f}")
    print(f"  Weighted F1: {m2['weighted_f1']:.4f}")
    print(f"  ROC-AUC: {m2['roc_auc']:.4f}")
    print(f"  PR-AUC: {m2['pr_auc']:.4f}")
    print(f"  Evaluated Beats: {m2['evaluated_beats']:,}")

    assert m2["accuracy"] == 0.9093
    assert m2["balanced_accuracy"] == 0.7000
    assert m2["macro_precision"] == 0.6348
    assert m2["macro_recall"] == 0.7000
    assert m2["macro_f1"] == 0.6403
    assert m2["weighted_f1"] == 0.9174
    assert m2["roc_auc"] == 0.9425
    assert m2["pr_auc"] == 0.6280
    assert m2["evaluated_beats"] == 49639

    cm = d2["confusion_matrix"]
    print(f"  Confusion Matrix Order: {cm['class_order']}")
    print(f"  Raw Matrix:\n    {cm['raw']}")
    assert cm["class_order"] == ["N", "S", "V", "F"]
    assert cm["raw"] == [
        [40845, 2154, 1126, 72],
        [382, 1388, 58, 7],
        [334, 52, 2808, 26],
        [242, 16, 34, 96]
    ]

    # 3. /api/experiments/generalization
    print("\n[3] Testing GET /api/experiments/generalization ...")
    r3 = client.get("/api/experiments/generalization")
    assert r3.status_code == 200, f"Expected 200, got {r3.status_code}"
    d3 = r3.json()
    print(f"  Evaluation: {d3['evaluation_type']}")
    print(f"  DS1 Val F1: {d3['ds1_validation']['macro_f1']} -> DS2 Test F1: {d3['ds2_test']['macro_f1']} (Delta: {d3['differences']['macro_f1']})")
    assert d3["ds1_validation"]["macro_f1"] == 0.7095
    assert d3["ds2_test"]["macro_f1"] == 0.6403
    assert d3["differences"]["macro_f1"] == -0.0692

    # 4. /api/experiments/feature-importance
    print("\n[4] Testing GET /api/experiments/feature-importance ...")
    r4 = client.get("/api/experiments/feature-importance")
    assert r4.status_code == 200, f"Expected 200, got {r4.status_code}"
    d4 = r4.json()
    print(f"  Top 1: {d4['top_features'][0]['feature_name']} ({d4['top_features'][0]['gini_importance']})")
    print(f"  Temporal Features Total Importance: {d4['temporal_features_total_importance'] * 100:.2f}%")
    assert d4["top_features"][0]["feature_name"] == "RR_ratio_prev"
    assert d4["temporal_features_total_importance"] == 0.2638

    # 5. /api/experiments/record-breakdown
    print("\n[5] Testing GET /api/experiments/record-breakdown ...")
    r5 = client.get("/api/experiments/record-breakdown?sort_by=accuracy&sort_order=desc&limit=5")
    assert r5.status_code == 200, f"Expected 200, got {r5.status_code}"
    d5 = r5.json()
    print(f"  Returned {len(d5['records'])} records (Total: {d5['total_records']})")
    print(f"  Top Record: {d5['records'][0]['record_id']} with Accuracy: {d5['records'][0]['accuracy']}")
    assert d5["total_records"] == 22
    assert len(d5["records"]) == 5

    # 6. /api/experiments/dataset-distribution
    print("\n[6] Testing GET /api/experiments/dataset-distribution ...")
    r6 = client.get("/api/experiments/dataset-distribution")
    assert r6.status_code == 200, f"Expected 200, got {r6.status_code}"
    d6 = r6.json()
    print(f"  Cohorts returned: {len(d6['cohorts'])}")
    for c in d6["cohorts"]:
        print(f"    - {c['partition']}: {c['record_count']} records, {c['usable_beats']} beats")
    assert len(d6["cohorts"]) == 5

    # 7. /api/experiments/artifacts
    print("\n[7] Testing GET /api/experiments/artifacts ...")
    r7 = client.get("/api/experiments/artifacts")
    assert r7.status_code == 200, f"Expected 200, got {r7.status_code}"
    d7 = r7.json()
    print(f"  Artifact availability: Benchmark={d7['benchmark']}, ModelConfig={d7['model_config']}, RecordBreakdown={d7['record_breakdown']}")
    assert d7["benchmark"] is True
    assert d7["model_config"] is True

    print("\n" + "=" * 60)
    print("ALL PHASE 17 VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_verification()
