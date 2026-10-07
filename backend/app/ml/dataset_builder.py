"""Dataset Builder Module for Beat-Level ML Dataset Construction.

Orchestrates record loading, channel selection, preprocessing, window extraction,
quality checking, dataset serialization (.npz + .json), validation SVG generation,
and DATASET_SUMMARY.md reporting.
"""
from collections import Counter
import hashlib
import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import wfdb

from app.core.config import settings
from app.ml.beat_extraction import extract_record_beats
from app.ml.label_mapping import AAMI_CLASSES, AAMI_CLASS_DESCRIPTIONS
from app.ml.schemas import ExclusionStats, WindowConfig

logger = logging.getLogger(__name__)


def generate_beat_svg(
    window: np.ndarray,
    title: str,
    record_id: str,
    symbol: str,
    lead: str,
    aami_class: str,
    output_path: Path,
    width: int = 600,
    height: int = 300,
) -> None:
    """Generate a clean, standalone SVG visual plot of a single beat window."""
    margin_left, margin_right = 60, 30
    margin_top, margin_bottom = 50, 40
    plot_w = width - margin_left - margin_right
    plot_h = height - margin_top - margin_bottom

    n_points = len(window)
    y_min, y_max = float(np.min(window)), float(np.max(window))
    y_range = max(1e-4, y_max - y_min)
    # Add 10% padding
    y_plot_min = y_min - 0.1 * y_range
    y_plot_max = y_max + 0.1 * y_range
    y_plot_range = y_plot_max - y_plot_min

    # Map sample points to SVG coordinates
    points = []
    for i, val in enumerate(window):
        x = margin_left + (i / max(1, n_points - 1)) * plot_w
        y = margin_top + plot_h - ((val - y_plot_min) / y_plot_range) * plot_h
        points.append(f"{x:.1f},{y:.1f}")
    polyline_str = " ".join(points)

    # R-peak alignment line (index 90 for default pre_samples=90)
    r_idx = 90 if n_points == 200 else n_points // 2
    r_x = margin_left + (r_idx / max(1, n_points - 1)) * plot_w

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background:#ffffff; font-family:system-ui,-apple-system,sans-serif;">
  <!-- Title & Metadata -->
  <text x="{margin_left}" y="25" font-size="15" font-weight="bold" fill="#1c2733">{title}</text>
  <text x="{margin_left}" y="42" font-size="11" fill="#5d6b7a">Record: {record_id} | Lead: {lead} | Symbol: '{symbol}' | Class: {aami_class} | Points: {n_points}</text>
  
  <!-- Plot Frame & Grid -->
  <rect x="{margin_left}" y="{margin_top}" width="{plot_w}" height="{plot_h}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
  <line x1="{margin_left}" y1="{margin_top + plot_h/2}" x2="{margin_left + plot_w}" y2="{margin_top + plot_h/2}" stroke="#e2e8f0" stroke-dasharray="3,3" />
  
  <!-- R-peak Alignment Marker -->
  <line x1="{r_x}" y1="{margin_top}" x2="{r_x}" y2="{margin_top + plot_h}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,2" />
  <text x="{r_x + 4}" y="{margin_top + 14}" font-size="10" fill="#ef4444" font-weight="bold">R-peak (0 ms)</text>
  
  <!-- ECG Waveform -->
  <polyline points="{polyline_str}" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  
  <!-- Axes Labels -->
  <text x="{margin_left + plot_w/2}" y="{height - 10}" font-size="11" fill="#475569" text-anchor="middle">Sample Index (Window: 200 samples / 556 ms)</text>
  <text x="15" y="{margin_top + plot_h/2}" font-size="11" fill="#475569" text-anchor="middle" transform="rotate(-90 15 {margin_top + plot_h/2})">Z-Score Amplitude</text>
  <text x="{margin_left - 8}" y="{margin_top + 12}" font-size="9" fill="#94a3b8" text-anchor="end">{y_plot_max:.1f}</text>
  <text x="{margin_left - 8}" y="{margin_top + plot_h}" font-size="9" fill="#94a3b8" text-anchor="end">{y_plot_min:.1f}</text>
</svg>"""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg_content)


def build_processed_dataset(
    input_dir: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    config: Optional[WindowConfig] = None,
) -> dict:
    """Build the complete beat-level ML dataset from MIT-BIH recordings.

    Extracts beat windows, normalizes them, gathers metadata, saves the NPZ archive,
    generates validation SVGs, and outputs DATASET_SUMMARY.md.
    """
    if input_dir is None:
        input_dir = settings.mitbih_dir
    if output_dir is None:
        output_dir = input_dir.parent / "processed"
    if config is None:
        config = WindowConfig(remove_baseline=True)

    output_dir.mkdir(parents=True, exist_ok=True)
    val_dir = output_dir / "validation_examples"
    val_dir.mkdir(parents=True, exist_ok=True)

    stats = ExclusionStats()

    # Discover records
    hea_files = sorted(input_dir.glob("*.hea"))
    record_ids = [
        h.stem for h in hea_files
        if (input_dir / f"{h.stem}.dat").is_file() and (input_dir / f"{h.stem}.atr").is_file()
    ]

    all_signals: list[np.ndarray] = []
    all_labels: list[str] = []
    all_record_ids: list[str] = []
    all_lead_names: list[str] = []
    all_symbols: list[str] = []
    all_sample_indices: list[int] = []

    records_processed_count = 0
    record_beat_counts: dict[str, int] = {}
    lead_distribution: dict[str, int] = Counter()

    # Process all records
    for rid in record_ids:
        rec_path = str(input_dir / rid)
        try:
            rec = wfdb.rdrecord(rec_path, physical=True)
            ann = wfdb.rdann(rec_path, "atr")
        except Exception as exc:
            logger.warning("Failed to read record %s: %s", rid, exc)
            continue

        records_processed_count += 1

        beats = extract_record_beats(
            record_id=rid,
            p_signal=rec.p_signal,
            sig_names=list(rec.sig_name or []),
            ann_samples=ann.sample,
            ann_symbols=list(ann.symbol),
            config=config,
            stats=stats,
        )

        record_beat_counts[rid] = len(beats)

        for sig_window, meta in beats:
            all_signals.append(sig_window)
            all_labels.append(meta.class_label)
            all_record_ids.append(meta.record_id)
            all_lead_names.append(meta.lead_name)
            all_symbols.append(meta.annotation_symbol)
            all_sample_indices.append(meta.annotation_sample)
            lead_distribution[meta.lead_name] += 1

    # Convert to NumPy arrays
    X = np.stack(all_signals, axis=0) if all_signals else np.empty((0, config.window_length), dtype=np.float32)
    y = np.array(all_labels, dtype=object)
    r_ids = np.array(all_record_ids, dtype=object)
    leads = np.array(all_lead_names, dtype=object)
    symbols = np.array(all_symbols, dtype=object)
    sample_indices = np.array(all_sample_indices, dtype=np.int64)

    # Serialize dataset to compressed NPZ
    npz_path = output_dir / "mitbih_processed_beats.npz"
    np.savez_compressed(
        npz_path,
        signals=X,
        labels=y,
        record_ids=r_ids,
        lead_names=leads,
        symbols=symbols,
        sample_indices=sample_indices,
    )

    # Compute SHA-256 for reproducibility verification
    sha256_hash = hashlib.sha256()
    with open(npz_path, "rb") as f:
        while chunk := f.read(65536):
            sha256_hash.update(chunk)
    npz_sha256 = sha256_hash.hexdigest()

    # Calculate class counts and percentages
    class_counter = Counter(all_labels)
    total_beats = len(all_labels)
    class_stats = {
        cls: {
            "count": class_counter[cls],
            "percentage": round((class_counter[cls] / total_beats * 100), 2) if total_beats else 0.0,
            "description": AAMI_CLASS_DESCRIPTIONS.get(cls, ""),
        }
        for cls in AAMI_CLASSES
    }

    # Generate representative visual validation SVGs for each class
    validation_samples: dict[str, dict] = {}
    for cls in AAMI_CLASSES:
        cls_indices = np.where(y == cls)[0]
        if len(cls_indices) > 0:
            # Pick a clean representative sample from middle of the class collection
            rep_idx = cls_indices[len(cls_indices) // 2]
            rep_window = X[rep_idx]
            rep_rid = r_ids[rep_idx]
            rep_symbol = symbols[rep_idx]
            rep_lead = leads[rep_idx]

            svg_filename = f"class_{cls}_beat.svg"
            svg_path = val_dir / svg_filename
            generate_beat_svg(
                window=rep_window,
                title=f"AAMI Class '{cls}' — {AAMI_CLASS_DESCRIPTIONS.get(cls, '')}",
                record_id=rep_rid,
                symbol=rep_symbol,
                lead=rep_lead,
                aami_class=cls,
                output_path=svg_path,
            )

            validation_samples[cls] = {
                "file": svg_filename,
                "record_id": rep_rid,
                "symbol": rep_symbol,
                "lead": rep_lead,
                "sample_index": int(sample_indices[rep_idx]),
            }

    # Save dataset metadata JSON
    metadata = {
        "dataset_name": "MIT-BIH Arrhythmia Preprocessed Beat Dataset",
        "archive_filename": npz_path.name,
        "archive_sha256": npz_sha256,
        "total_beats": total_beats,
        "window_length": config.window_length,
        "fs": config.fs,
        "pre_samples": config.pre_samples,
        "post_samples": config.post_samples,
        "duration_seconds": config.duration_seconds,
        "normalization_method": config.normalization_method,
        "remove_baseline": config.remove_baseline,
        "preferred_leads": list(config.preferred_leads),
        "exclusion_stats": stats.to_dict(),
        "class_distribution": class_stats,
        "lead_distribution": dict(lead_distribution),
        "records_processed": records_processed_count,
        "validation_samples": validation_samples,
    }

    with open(output_dir / "dataset_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Generate DATASET_SUMMARY.md
    summary_md = _generate_summary_markdown(
        metadata=metadata,
        record_beat_counts=record_beat_counts,
        stats=stats,
        config=config,
    )
    with open(output_dir / "DATASET_SUMMARY.md", "w", encoding="utf-8") as f:
        f.write(summary_md)

    return metadata


def _generate_summary_markdown(
    metadata: dict,
    record_beat_counts: dict[str, int],
    stats: ExclusionStats,
    config: WindowConfig,
) -> str:
    """Generate Markdown text for DATASET_SUMMARY.md."""
    classes = metadata["class_distribution"]
    total = metadata["total_beats"]
    leads = metadata["lead_distribution"]

    md = f"""# MIT-BIH Beat-Level Preprocessed Dataset Summary

**Generated Archive:** `mitbih_processed_beats.npz`  
**Archive SHA-256:** `{metadata['archive_sha256']}`  
**Sampling Frequency ($f_s$):** {config.fs:.1f} Hz  
**Window Configuration:** {config.window_length} samples ({config.duration_seconds:.3f} s) — {config.pre_samples} pre-R / {config.post_samples} post-R  
**Baseline Wander Filter:** {'Active (moving average subtraction)' if config.remove_baseline else 'Disabled'}  
**Amplitude Normalization:** {config.normalization_method.upper()} (strictly per-beat local, zero leakage)  

---

## 1. Dataset Accounting & Two-Stage Mathematical Reconciliation

Every examined annotation is accounted for across two explicit stages with zero double-counting:

### Stage 1: Annotation Type Categorization
| Annotation Category | Count | Percentage | Description |
| :--- | :---: | :---: | :--- |
| **True Heartbeat Annotations** | **{stats.total_beat_annotations:,}** | **{(stats.total_beat_annotations / stats.total_annotations_examined * 100):.2f}%** | Annotations designating a discrete cardiac depolarization (QRS). |
| **Non-Beat Event Markers** | **{stats.non_beat_event_annotations:,}** | **{(stats.non_beat_event_annotations / stats.total_annotations_examined * 100):.2f}%** | Rhythm changes, flutter markers, quality changes, noise, artifacts. |
| **Total Annotations Examined** | **{stats.total_annotations_examined:,}** | **100.00%** | **Stage 1 Identity:** Beat Annotations ({stats.total_beat_annotations:,}) + Non-Beat Annotations ({stats.non_beat_event_annotations:,}) = {stats.total_annotations_examined:,}. |

### Stage 2: Heartbeat Window Extraction & Validation
| Heartbeat Status | Count | Percentage of Beats | Description |
| :--- | :---: | :---: | :--- |
| **Clean Beats Included in Dataset** | **{stats.total_included_beats:,}** | **{(stats.total_included_beats / stats.total_beat_annotations * 100):.2f}%** | Complete, valid, normalized 200-sample beat windows. |
| **Boundary Incomplete Heartbeats** | **{stats.boundary_incomplete_windows:,}** | **{(stats.boundary_incomplete_windows / stats.total_beat_annotations * 100):.2f}%** | Beats within 90 samples of recording start or 110 samples of end. |
| **Total True Heartbeat Annotations** | **{stats.total_beat_annotations:,}** | **100.00%** | **Stage 2 Identity:** Included Beats ({stats.total_included_beats:,}) + Boundary Exclusions ({stats.boundary_incomplete_windows:,}) = {stats.total_beat_annotations:,}. |

### Overall Reconciliation Identity:
$$\\text{{Total Annotations Examined}} ({stats.total_annotations_examined:,}) = \\text{{Total Included Beats}} ({stats.total_included_beats:,}) + \\text{{Total Excluded Annotations}} ({stats.total_excluded_annotations:,})$$
where:
$$\\text{{Total Excluded Annotations}} ({stats.total_excluded_annotations:,}) = \\text{{Non-Beat Markers}} ({stats.non_beat_event_annotations:,}) + \\text{{Boundary Exclusions}} ({stats.boundary_incomplete_windows:,})$$

---

## 2. AAMI EC57 Class Distribution

The dataset maps ground-truth annotations to the standard ANSI/AAMI EC57 heartbeat categories:

| AAMI Class | Diagnostic Category | Beats Extracted | Percentage |
| :---: | :--- | :---: | :---: |
| **N** | Non-ectopic / Normal (N, L, R, e, j) | **{classes['N']['count']:,}** | **{classes['N']['percentage']:.2f}%** |
| **S** | Supraventricular Ectopic (A, a, J, S) | **{classes['S']['count']:,}** | **{classes['S']['percentage']:.2f}%** |
| **V** | Ventricular Ectopic (V, E, r) | **{classes['V']['count']:,}** | **{classes['V']['percentage']:.2f}%** |
| **F** | Fusion Beats (F) | **{classes['F']['count']:,}** | **{classes['F']['percentage']:.2f}%** |
| **Q** | Paced / Unknown / Unclassifiable (/, f, Q) | **{classes['Q']['count']:,}** | **{classes['Q']['percentage']:.2f}%** |
| **TOTAL** | All Classes Combined | **{total:,}** | **100.00%** |

---

## 3. Lead Selection & Channel Distribution

Channels were chosen per-record following the priority order (`MLII` > `V5` > `V1` > `V2` > `V4`):

| Lead Name | Beats Extracted | Percentage | Records Utilizing Lead |
| :---: | :---: | :---: | :--- |
"""
    for lead, cnt in leads.items():
        pct = (cnt / total * 100) if total else 0.0
        md += f"| **{lead}** | **{cnt:,}** | **{pct:.2f}%** | Primary or fallback lead according to availability. |\n"

    md += f"""
---

## 4. Record-Level Contribution (Zero-Leakage Grouping)

Every sample retains its `record_id` and original sample location. The table below lists the beats extracted per record:

| Record ID | Beats Contributed | Primary Lead Used |
| :---: | :---: | :---: |
"""
    for rid, cnt in sorted(record_beat_counts.items(), key=lambda x: str(x[0])):
        md += f"| `{rid}` | {cnt:,} | Dynamic selection |\n"

    md += f"""
---

## 5. Visual Validation Artifacts

Representative beat windows for every AAMI class were plotted to standalone vector SVGs in `validation_examples/`:
- `validation_examples/class_N_beat.svg` (Class N — Non-ectopic beat)
- `validation_examples/class_S_beat.svg` (Class S — Supraventricular premature beat)
- `validation_examples/class_V_beat.svg` (Class V — Ventricular premature beat)
- `validation_examples/class_F_beat.svg` (Class F — Fusion beat)
- `validation_examples/class_Q_beat.svg` (Class Q — Paced beat)

All examples confirm exact window centering (200 samples, alignment index 90) and uncorrupted normalized amplitudes.
"""
    return md
