"""Test complete pipeline: DiffDock → Scoring → Analysis"""
import sys
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import Config
from src.tools.diffdock_wrapper import DiffDockWrapper
from src.tools.scoring import MolecularScorer


def test_full_pipeline():
    """Test end-to-end pipeline"""

    print("\n" + "="*70)
    print("FULL PIPELINE TEST: DiffDock → Scoring → Analysis")
    print("="*70)

    # Setup
    wrapper = DiffDockWrapper()
    scorer = MolecularScorer()

    # TODO: Update these paths
    protein_pdb = Path("~/hackathon-data/test/1A2C.pdb").expanduser()  # ⚠️ UPDATE THIS
    ligand_sdf = Path("~/hackathon-data/test/test_ligand.sdf").expanduser()  # ⚠️ UPDATE THIS

    if not Path(protein_pdb).exists():
        print("\n⚠️  Please update file paths in tests/test_pipeline.py")
        return

    output_dir = Config.RESULTS_DIR / "pipeline_test"

    # STEP 1: Docking
    print("\n" + "-"*70)
    print("STEP 1: DIFFDOCK POSE GENERATION")
    print("-"*70)

    docking_results = wrapper.run_docking(
        protein_path=protein_pdb,
        ligand_path=ligand_sdf,
        output_dir=str(output_dir),
        complex_name="pipeline_test"
    )

    print(f"✅ Generated {docking_results['num_poses']} poses")

    # STEP 2: Scoring
    print("\n" + "-"*70)
    print("STEP 2: MOLECULAR SCORING")
    print("-"*70)

    all_scores = []
    max_to_score = min(Config.MAX_POSES_TO_SCORE, docking_results['num_poses'])

    for i, pose in enumerate(docking_results['poses'][:max_to_score], 1):
        print(f"   Scoring pose {i}/{max_to_score} (rank {pose['rank']})...")

        scores = scorer.score_pose(
            protein_pdb=protein_pdb,
            ligand_sdf=pose['file_path'],
            pose_rank=pose['rank']
        )

        # Add DiffDock confidence
        scores['diffdock_confidence'] = pose['confidence']
        scores['composite_score'] = scorer.calculate_composite_score(scores)

        all_scores.append(scores)

    # STEP 3: Analysis
    print("\n" + "-"*70)
    print("STEP 3: RESULTS ANALYSIS")
    print("-"*70)

    # Create DataFrame
    df = pd.DataFrame(all_scores)
    df = df.sort_values('composite_score', ascending=False)
    df['rerank'] = range(1, len(df) + 1)

    # Save scores
    scores_csv = output_dir / "scores.csv"
    df.to_csv(scores_csv, index=False)
    print(f"💾 Scores saved: {scores_csv}")

    # Display top 5
    print(f"\n🏆 TOP 5 POSES (by composite score):")
    print("-"*70)

    display_cols = ['rank', 'diffdock_confidence', 'composite_score',
                    'num_hbonds', 'num_contacts', 'lipinski_violations']

    print(df[display_cols].head(5).to_string(index=False))

    # Summary
    print("\n" + "="*70)
    print("PIPELINE TEST COMPLETE")
    print("="*70)
    print(f"📊 Processed {len(all_scores)} poses")
    print(f"📁 Results in: {output_dir}")
    print(f"🥇 Best pose: Rank {df.iloc[0]['rank']} (composite score: {df.iloc[0]['composite_score']:.2f})")
    print("="*70 + "\n")

    return docking_results, df


if __name__ == "__main__":
    test_full_pipeline()