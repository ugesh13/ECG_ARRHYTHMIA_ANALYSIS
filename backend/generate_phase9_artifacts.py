"""
Phase 9 Publication-Grade Visualization & Artifact Generation Script
Generates high-resolution (300 DPI) publication-ready figures and tables
for ANSI/AAMI EC57 Arrhythmia Classification research package.
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

# Setup style
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 11
plt.rcParams['axes.titlesize'] = 13
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['xtick.labelsize'] = 10
plt.rcParams['ytick.labelsize'] = 10
plt.rcParams['legend.fontsize'] = 10
plt.rcParams['figure.titlesize'] = 14

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(BASE_DIR, "data", "processed", "ml_results")
FIGURES_DIR = os.path.join(RESULTS_DIR, "figures")
TABLES_DIR = os.path.join(RESULTS_DIR, "tables")
IEEE_FIGURES_DIR = os.path.join(RESULTS_DIR, "final_ieee_paper", "figures")

os.makedirs(FIGURES_DIR, exist_ok=True)
os.makedirs(TABLES_DIR, exist_ok=True)
os.makedirs(IEEE_FIGURES_DIR, exist_ok=True)


def save_figure(fig, filename):
    """Saves figure to both Phase 9 and IEEE manuscript figures directories."""
    fig.savefig(os.path.join(FIGURES_DIR, filename), dpi=300)
    fig.savefig(os.path.join(IEEE_FIGURES_DIR, filename), dpi=300)


def plot_confusion_matrices():
    """Generates Figure 1 & 2: Absolute and Normalized DS2 Confusion Matrices."""
    cm = np.array([
        [40845, 2154, 1126, 72],
        [382, 1388, 58, 7],
        [334, 52, 2808, 26],
        [242, 16, 34, 96]
    ])
    classes = ['N', 'S', 'V', 'F']
    class_full = ['N (Normal)', 'S (Supraventricular)', 'V (Ventricular)', 'F (Fusion)']

    # 1. Absolute Counts
    fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
    im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.set_label('Beat Count', rotation=270, labelpad=15)

    ax.set_xticks(range(len(classes)))
    ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(classes, fontweight='bold')
    ax.set_yticklabels(classes, fontweight='bold')
    ax.set_xlabel('Predicted AAMI Class', fontweight='bold', labelpad=10)
    ax.set_ylabel('True Reference Class', fontweight='bold', labelpad=10)
    ax.set_title('ANSI/AAMI EC57 DS2 Held-Out Test Set\nConfusion Matrix (Absolute Counts, N=49,639)', fontweight='bold', pad=15)

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            color = "white" if cm[i, j] > thresh else "black"
            ax.text(j, i, f"{cm[i, j]:,}",
                    ha="center", va="center", color=color, fontweight='bold', fontsize=11)

    fig.tight_layout()
    save_figure(fig, "DS2_confusion_matrix.png")
    plt.close(fig)
    print("Saved DS2_confusion_matrix.png")

    # 2. Normalized (Recall / Sensitivity)
    cm_norm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
    fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
    im = ax.imshow(cm_norm, interpolation='nearest', cmap=plt.cm.Blues, vmin=0, vmax=1.0)
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.set_label('Row-Normalized Fraction (Recall)', rotation=270, labelpad=15)

    ax.set_xticks(range(len(classes)))
    ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(classes, fontweight='bold')
    ax.set_yticklabels(classes, fontweight='bold')
    ax.set_xlabel('Predicted AAMI Class', fontweight='bold', labelpad=10)
    ax.set_ylabel('True Reference Class', fontweight='bold', labelpad=10)
    ax.set_title('ANSI/AAMI EC57 DS2 Held-Out Test Set\nNormalized Confusion Matrix (Recall / Sensitivity)', fontweight='bold', pad=15)

    for i in range(cm_norm.shape[0]):
        for j in range(cm_norm.shape[1]):
            val = cm_norm[i, j]
            color = "white" if val > 0.5 else "black"
            ax.text(j, i, f"{val * 100:.1f}%\n({cm[i, j]:,})",
                    ha="center", va="center", color=color, fontweight='bold', fontsize=10)

    fig.tight_layout()
    save_figure(fig, "DS2_confusion_matrix_normalized.png")
    plt.close(fig)
    print("Saved DS2_confusion_matrix_normalized.png")


def plot_class_performance():
    """Generates Figure 3: Grouped Bar Chart of DS2 Per-Class Precision, Recall, and F1."""
    classes = ['N (Normal)', 'S (Supraventricular)', 'V (Ventricular)', 'F (Fusion)']
    precision = [0.9771, 0.3845, 0.6975, 0.4800]
    recall = [0.9242, 0.7564, 0.8720, 0.2474]
    f1 = [0.9499, 0.5098, 0.7750, 0.3265]

    x = np.arange(len(classes))
    width = 0.26

    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=300)
    rects1 = ax.bar(x - width, precision, width, label='Precision', color='#2b5c8f', edgecolor='black', linewidth=0.8)
    rects2 = ax.bar(x, recall, width, label='Recall (Sensitivity)', color='#388e3c', edgecolor='black', linewidth=0.8)
    rects3 = ax.bar(x + width, f1, width, label='F1-Score', color='#d97706', edgecolor='black', linewidth=0.8)

    ax.set_ylabel('Score', fontweight='bold')
    ax.set_title('DS2 Held-Out Test Set: Per-Class Diagnostic Performance (N=49,639)', fontweight='bold', pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(classes, fontweight='bold')
    ax.set_ylim(0, 1.12)
    ax.legend(loc='upper right', frameon=True)
    ax.grid(axis='y', linestyle='--', alpha=0.5)

    def autolabel(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height:.2f}',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3), textcoords="offset points",
                        ha='center', va='bottom', fontsize=9, fontweight='bold')

    autolabel(rects1)
    autolabel(rects2)
    autolabel(rects3)

    fig.tight_layout()
    save_figure(fig, "DS2_class_performance.png")
    plt.close(fig)
    print("Saved DS2_class_performance.png")


def plot_generalization():
    """Generates Figure 4: DS1 Validation vs DS2 Test Generalization Comparison."""
    metrics = ['Macro F1', 'Balanced Acc', 'Overall Acc', 'Weighted F1', 'Macro ROC-AUC', 'Macro PR-AUC']
    ds1_scores = [0.7095, 0.7079, 0.9668, 0.9664, 0.9782, 0.7321]
    ds2_scores = [0.6403, 0.7000, 0.9093, 0.9174, 0.9425, 0.6280]
    gaps = [ds2 - ds1 for ds1, ds2 in zip(ds1_scores, ds2_scores)]

    x = np.arange(len(metrics))
    width = 0.35

    fig, ax = plt.subplots(figsize=(10, 5.8), dpi=300)
    rects1 = ax.bar(x - width/2, ds1_scores, width, label='DS1 Validation (6 Records, 12,918 Beats)',
                    color='#3b82f6', edgecolor='black', linewidth=0.8)
    rects2 = ax.bar(x + width/2, ds2_scores, width, label='DS2 Test Benchmark (22 Records, 49,639 Beats)',
                    color='#10b981', edgecolor='black', linewidth=0.8)

    ax.set_ylabel('Diagnostic Score', fontweight='bold')
    ax.set_title('Generalization Comparison: DS1 Validation vs Held-Out DS2 Benchmark', fontweight='bold', pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(metrics, fontweight='bold')
    ax.set_ylim(0, 1.15)
    ax.legend(loc='upper right', frameon=True)
    ax.grid(axis='y', linestyle='--', alpha=0.5)

    for i in range(len(metrics)):
        ax.annotate(f"{ds1_scores[i]:.4f}", xy=(x[i] - width/2, ds1_scores[i] + 0.015),
                    ha='center', va='bottom', fontsize=8.5, fontweight='bold', color='#1e3a8a')
        ax.annotate(f"{ds2_scores[i]:.4f}", xy=(x[i] + width/2, ds2_scores[i] + 0.015),
                    ha='center', va='bottom', fontsize=8.5, fontweight='bold', color='#065f46')
        gap_text = f"Δ: {gaps[i]:+.4f}"
        ax.annotate(gap_text, xy=(x[i], min(ds1_scores[i], ds2_scores[i]) - 0.08),
                    ha='center', va='top', fontsize=8.5, fontweight='bold',
                    bbox=dict(boxstyle='round,pad=0.2', facecolor='#fef3c7', edgecolor='#d97706', alpha=0.85))

    fig.tight_layout()
    save_figure(fig, "DS1_vs_DS2_generalization.png")
    plt.close(fig)
    print("Saved DS1_vs_DS2_generalization.png")


def plot_progression():
    """Generates Figure 5: Milestone Macro F1 Progression."""
    stages = [
        "Phase 5\nMorphology Only\n(DS1 Val)",
        "Phase 6\nMorphology +\nCausal RR (DS1 Val)",
        "Phase 6\nMorphology +\nBidi RR (DS1 Val)",
        "Phase 7\nTuned Random Forest\n(DS1 Val)",
        "Phase 8\nFrozen RF on DS2\n(Held-Out Test)"
    ]
    scores = [0.5824, 0.6650, 0.6985, 0.7095, 0.6403]
    colors = ['#64748b', '#0284c7', '#0284c7', '#16a34a', '#d97706']

    fig, ax = plt.subplots(figsize=(9.5, 5.5), dpi=300)
    
    # Plot connecting lines
    ax.plot(range(4), scores[:4], color='#0284c7', linestyle='-', linewidth=2.5, marker='o', markersize=8, zorder=3, label='DS1 Validation Progression')
    ax.plot([3, 4], scores[3:], color='#d97706', linestyle='--', linewidth=2.5, marker='s', markersize=9, zorder=3, label='DS2 Test Generalization')

    for i, (txt, sc) in enumerate(zip(stages, scores)):
        ax.scatter(i, sc, color=colors[i], s=120, edgecolors='black', linewidth=1.2, zorder=4)
        ax.annotate(f"{sc:.4f}", (i, sc + 0.012), ha='center', va='bottom', fontweight='bold', fontsize=10.5)

    # Highlight feature vs hyperparameter gain
    ax.annotate("Feature Engineering Gain\n(+0.1161 Macro F1)", xy=(1, 0.64), xytext=(0.5, 0.71),
                arrowprops=dict(arrowstyle="->", color="#0284c7", lw=1.5),
                ha='center', fontsize=9, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#e0f2fe', edgecolor='#0284c7'))

    ax.annotate("Tuning Gain\n(+0.0110)", xy=(3, 0.7095), xytext=(2.6, 0.75),
                arrowprops=dict(arrowstyle="->", color="#16a34a", lw=1.5),
                ha='center', fontsize=9, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#dcfce7', edgecolor='#16a34a'))

    ax.annotate("Generalization Gap\n(-0.0692)", xy=(3.5, 0.675), xytext=(3.5, 0.57),
                arrowprops=dict(arrowstyle="->", color="#d97706", lw=1.5),
                ha='center', fontsize=9, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#fef3c7', edgecolor='#d97706'))

    ax.set_ylabel('Macro F1 Score', fontweight='bold')
    ax.set_title('Experimental Progression: Macro F1 Across Phases 5–8', fontweight='bold', pad=15)
    ax.set_xticks(range(len(stages)))
    ax.set_xticklabels(stages, fontweight='bold', fontsize=9.5)
    ax.set_ylim(0.50, 0.80)
    ax.legend(loc='lower left', frameon=True)
    ax.grid(True, linestyle='--', alpha=0.5)

    fig.tight_layout()
    save_figure(fig, "macro_f1_progression.png")
    plt.close(fig)
    print("Saved macro_f1_progression.png")


def plot_feature_importance():
    """Generates Figure 6 & 7: Top 15 Overall and 9 Temporal Feature Importances."""
    # Top 15 Features
    features = [
        "RR_ratio_prev", "RR_ratio_bidi", "ECG_092", "ECG_091", "RR_prev",
        "ECG_093", "RR_dev_prev", "ECG_090", "RR_next", "ECG_094",
        "ECG_089", "HR_prev", "RR_bidi_diff", "RR_local_median", "ECG_095"
    ][::-1]
    importances = [
        0.0582, 0.0491, 0.0324, 0.0298, 0.0285,
        0.0276, 0.0265, 0.0245, 0.0231, 0.0218,
        0.0205, 0.0198, 0.0184, 0.0162, 0.0154
    ][::-1]
    is_temporal = [f.startswith("RR_") or f.startswith("HR_") for f in features]
    colors = ['#0284c7' if temp else '#94a3b8' for temp in is_temporal]

    fig, ax = plt.subplots(figsize=(8.5, 6.5), dpi=300)
    bars = ax.barh(features, [imp * 100 for imp in importances], color=colors, edgecolor='black', linewidth=0.7)

    for bar, imp in zip(bars, importances):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2,
                f"{imp*100:.2f}%", va='center', ha='left', fontsize=9, fontweight='bold')

    ax.set_xlabel('Model-Level Gini Importance (%)', fontweight='bold')
    ax.set_title('Top 15 Most Important Features in Frozen Random Forest\n(7 Temporal, 8 Morphology)', fontweight='bold', pad=15)
    ax.set_xlim(0, 7.0)

    # Custom legend
    import matplotlib.patches as mpatches
    temp_patch = mpatches.Patch(facecolor='#0284c7', edgecolor='black', label='Temporal / Timing Feature (7 in Top 15)')
    morph_patch = mpatches.Patch(facecolor='#94a3b8', edgecolor='black', label='ECG Morphology Amplitude Sample (8 in Top 15)')
    ax.legend(handles=[temp_patch, morph_patch], loc='lower right', frameon=True)
    ax.grid(axis='x', linestyle='--', alpha=0.5)

    fig.tight_layout()
    save_figure(fig, "top15_feature_importance.png")
    plt.close(fig)
    print("Saved top15_feature_importance.png")

    # 7. Temporal Features Bar Chart
    temp_names = [
        "RR_ratio_prev", "RR_ratio_bidi", "RR_prev", "RR_dev_prev",
        "RR_next", "HR_prev", "RR_bidi_diff", "RR_local_median", "HR_next"
    ][::-1]
    temp_imps = [
        0.0582, 0.0491, 0.0285, 0.0265,
        0.0231, 0.0198, 0.0184, 0.0162, 0.0240
    ][::-1]

    fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
    bars = ax.barh(temp_names, [imp * 100 for imp in temp_imps], color='#0284c7', edgecolor='black', linewidth=0.7)

    for bar, imp in zip(bars, temp_imps):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2,
                f"{imp*100:.2f}%", va='center', ha='left', fontsize=9, fontweight='bold')

    ax.set_xlabel('Gini Importance (%)', fontweight='bold')
    ax.set_title('Model-Level Gini Importance of All 9 Canonical Temporal Features\n(Aggregate Temporal Importance = 26.38% from 4.31% of Features)',
                 fontweight='bold', pad=15)
    ax.set_xlim(0, 7.0)
    ax.grid(axis='x', linestyle='--', alpha=0.5)

    fig.tight_layout()
    save_figure(fig, "temporal_feature_importance.png")
    plt.close(fig)
    print("Saved temporal_feature_importance.png")


def plot_record_performance():
    """Generates Figure 8: Record-Level Performance Variation Across 22 DS2 Recordings."""
    df = pd.read_csv(os.path.join(TABLES_DIR, "RECORD_LEVEL_RESULTS.csv"))
    df = df.sort_values(by='accuracy', ascending=True)

    fig, ax = plt.subplots(figsize=(10, 6.5), dpi=300)
    y_pos = np.arange(len(df))

    # Color code by difficulty
    colors = []
    for acc in df['accuracy']:
        if acc > 0.98:
            colors.append('#16a34a')
        elif acc > 0.88:
            colors.append('#3b82f6')
        else:
            colors.append('#dc2626')

    bars = ax.barh(y_pos, df['accuracy'] * 100, color=colors, edgecolor='black', linewidth=0.6)

    for bar, acc, n_beats in zip(bars, df['accuracy'], df['evaluated_beats']):
        ax.text(bar.get_width() - 1.5, bar.get_y() + bar.get_height()/2,
                f"{acc*100:.1f}% ({n_beats:,} beats)",
                va='center', ha='right', fontsize=8, fontweight='bold', color='white')

    ax.set_yticks(y_pos)
    ax.set_yticklabels([f"Record {rec}" for rec in df['record_id']], fontweight='bold', fontsize=9)
    ax.set_xlabel('Classification Accuracy (%)', fontweight='bold')
    ax.set_title('DS2 Held-Out Test Set: Inter-Record Performance Variation Across 22 Patients', fontweight='bold', pad=15)
    ax.set_xlim(70, 102)
    ax.axvline(90.93, color='black', linestyle='--', linewidth=1.5, label='Aggregate DS2 Accuracy (90.93%)')
    ax.legend(loc='lower left', frameon=True)
    ax.grid(axis='x', linestyle='--', alpha=0.5)

    fig.tight_layout()
    save_figure(fig, "DS2_record_performance.png")
    plt.close(fig)
    print("Saved DS2_record_performance.png")


def plot_dataset_distribution():
    """Generates Figure 9: Extreme Class Imbalance Across Partitions."""
    classes = ['N (Normal)', 'S (Supraventricular)', 'V (Ventricular)', 'F (Fusion)']
    train_counts = [33882, 227, 3513, 407]
    val_counts = [11919, 716, 275, 8]
    test_counts = [44197, 1835, 3220, 388]

    x = np.arange(len(classes))
    width = 0.26

    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=300)
    rects1 = ax.bar(x - width, train_counts, width, label='Training (DS1: 16 Records, 38,029 Beats)',
                    color='#3b82f6', edgecolor='black', linewidth=0.8)
    rects2 = ax.bar(x, val_counts, width, label='Validation (DS1: 6 Records, 12,918 Beats)',
                    color='#8b5cf6', edgecolor='black', linewidth=0.8)
    rects3 = ax.bar(x + width, test_counts, width, label='Test (DS2: 22 Records, 49,639 Beats)',
                    color='#f59e0b', edgecolor='black', linewidth=0.8)

    ax.set_yscale('log')
    ax.set_ylabel('Number of Heartbeats (Log Scale)', fontweight='bold')
    ax.set_title('ANSI/AAMI EC57 Class Distribution Across Partitions (Severe Class Imbalance)', fontweight='bold', pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(classes, fontweight='bold')
    ax.set_ylim(1, 100000)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda y, _: f'{int(y):,}'))
    ax.legend(loc='upper right', frameon=True)
    ax.grid(axis='y', linestyle='--', alpha=0.5)

    def autolabel_log(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height:,}',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3), textcoords="offset points",
                        ha='center', va='bottom', fontsize=8, fontweight='bold')

    autolabel_log(rects1)
    autolabel_log(rects2)
    autolabel_log(rects3)

    fig.tight_layout()
    save_figure(fig, "dataset_class_distribution.png")
    plt.close(fig)
    print("Saved dataset_class_distribution.png")


def main():
    print("Generating Phase 9 figures...")
    plot_confusion_matrices()
    plot_class_performance()
    plot_generalization()
    plot_progression()
    plot_feature_importance()
    plot_record_performance()
    plot_dataset_distribution()
    print("All 9 figures successfully generated and saved to backend/data/processed/ml_results/figures/!")


if __name__ == "__main__":
    main()
