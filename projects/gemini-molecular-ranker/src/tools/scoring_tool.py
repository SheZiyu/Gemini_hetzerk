"""
Scoring as an agent tool
"""
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd

import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.tools.scoring import MolecularScorer


def execute_scoring(
        protein_pdb: str,
        poses: List[Dict],
        parameters: Dict[str, Any]
) -> Dict:
    """
    Score poses and return agent-friendly results
    """

    scorer = MolecularScorer()

    all_scores = []
    for pose in poses:
        scores = scorer.score_pose(
            protein_pdb=protein_pdb,
            ligand_sdf=pose['file_path'],
            pose_rank=pose['rank']
        )
        scores['diffdock_confidence'] = pose['confidence']
        scores['composite_score'] = scorer.calculate_composite_score(scores)
        all_scores.append(scores)

    # Sort by composite score
    df = pd.DataFrame(all_scores)
    df = df.sort_values('composite_score', ascending=False)

    # Get best
    best = df.iloc[0]

    return {
        'scores': all_scores,
        'best_score': float(best['composite_score']),
        'top_pose_summary': f"Rank {int(best['rank'])}: {int(best.get('num_hbonds', 0))} H-bonds, "
                            f"{int(best.get('num_contacts', 0))} contacts",
        'dataframe': df
    }