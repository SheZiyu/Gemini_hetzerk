"""Visualization utilities for molecular structures"""
import py3Dmol
from pathlib import Path
from typing import Optional, List
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


def visualize_pose_3d(
        protein_pdb: str,
        ligand_sdf: str,
        width: int = 800,
        height: int = 600
) -> str:
    """
    Create interactive 3D visualization

    Returns:
        HTML string for embedding
    """
    view = py3Dmol.view(width=width, height=height)

    # Load protein
    with open(protein_pdb) as f:
        protein_data = f.read()
    view.addModel(protein_data, 'pdb')

    # Style protein (cartoon)
    view.setStyle({'model': 0}, {'cartoon': {'color': 'spectrum'}})

    # Load ligand
    with open(ligand_sdf) as f:
        ligand_data = f.read()
    view.addModel(ligand_data, 'sdf')

    # Style ligand (sticks)
    view.setStyle({'model': 1}, {'stick': {'colorscheme': 'greenCarbon'}})

    # Center view
    view.zoomTo()

    return view._make_html()


def create_comparison_view(
        protein_pdb: str,
        pose_files: List[str],
        labels: Optional[List[str]] = None
) -> str:
    """
    Create side-by-side comparison of multiple poses
    """
    if labels is None:
        labels = [f"Pose {i + 1}" for i in range(len(pose_files))]

    n_poses = len(pose_files)
    view = py3Dmol.view(width=400 * n_poses, height=400, viewergrid=(1, n_poses))

    # Load protein for each viewer
    with open(protein_pdb) as f:
        protein_data = f.read()

    for i in range(n_poses):
        view.addModel(protein_data, 'pdb', viewer=(0, i))
        view.setStyle({'model': -1}, {'cartoon': {'color': 'lightgray'}}, viewer=(0, i))

        # Load ligand
        with open(pose_files[i]) as f:
            ligand_data = f.read()
        view.addModel(ligand_data, 'sdf', viewer=(0, i))
        view.setStyle({'model': -1}, {'stick': {}}, viewer=(0, i))

        # Add label
        view.addLabel(labels[i], {'position': {'x': 0, 'y': 20, 'z': 0}}, viewer=(0, i))

        view.zoomTo(viewer=(0, i))

    return view._make_html()


def plot_score_distribution(scores_df: pd.DataFrame, output_path: Optional[str] = None):
    """Plot score distributions"""

    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    fig.suptitle('Molecular Scoring Analysis', fontsize=16)

    # 1. Composite score vs DiffDock confidence
    axes[0, 0].scatter(scores_df['diffdock_confidence'],
                       scores_df['composite_score'],
                       alpha=0.6, s=100)
    axes[0, 0].set_xlabel('DiffDock Confidence')
    axes[0, 0].set_ylabel('Composite Score')
    axes[0, 0].set_title('Composite Score vs DiffDock Confidence')
    axes[0, 0].grid(True, alpha=0.3)

    # 2. H-bonds distribution
    axes[0, 1].bar(scores_df['rank'], scores_df['num_hbonds'], color='steelblue')
    axes[0, 1].set_xlabel('Pose Rank')
    axes[0, 1].set_ylabel('Number of H-bonds')
    axes[0, 1].set_title('Hydrogen Bonds per Pose')
    axes[0, 1].grid(True, alpha=0.3, axis='y')

    # 3. Contacts distribution
    axes[1, 0].bar(scores_df['rank'], scores_df['num_contacts'], color='coral')
    axes[1, 0].set_xlabel('Pose Rank')
    axes[1, 0].set_ylabel('Number of Contacts')
    axes[1, 0].set_title('Protein-Ligand Contacts per Pose')
    axes[1, 0].grid(True, alpha=0.3, axis='y')

    # 4. Top 5 poses comparison
    top5 = scores_df.nsmallest(5, 'rank')
    metrics = ['num_hbonds', 'num_contacts', 'shape_complementarity']

    x = range(len(top5))
    width = 0.25

    for i, metric in enumerate(metrics):
        if metric in top5.columns:
            values = top5[metric].values
            if metric == 'shape_complementarity':
                values = values * 10  # Scale for visibility
            axes[1, 1].bar([xi + i * width for xi in x], values,
                           width=width, label=metric)

    axes[1, 1].set_xlabel('Pose')
    axes[1, 1].set_ylabel('Score')
    axes[1, 1].set_title('Top 5 Poses - Metrics Comparison')
    axes[1, 1].set_xticks([xi + width for xi in x])
    axes[1, 1].set_xticklabels([f"Rank {r}" for r in top5['rank']])
    axes[1, 1].legend()
    axes[1, 1].grid(True, alpha=0.3, axis='y')

    plt.tight_layout()

    if output_path:
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"📊 Plot saved: {output_path}")

    return fig