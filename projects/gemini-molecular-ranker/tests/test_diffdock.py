"""Test DiffDock integration"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import Config
from src.tools.diffdock_wrapper import DiffDockWrapper


def test_basic_docking():
    """Test basic DiffDock functionality"""

    print("\n" + "=" * 60)
    print("TESTING DIFFDOCK INTEGRATION")
    print("=" * 60)

    # Initialize wrapper
    wrapper = DiffDockWrapper()
    print(f"✅ DiffDock wrapper initialized")
    print(f"   Path: {wrapper.diffdock_path}")
    print(f"   Samples: {wrapper.samples}")

    # TODO: Update these paths to your actual test files
    protein_pdb = Path("~/hackathon-data/test/1A2C.pdb").expanduser()  # ⚠️ UPDATE THIS
    ligand_sdf = Path("~/hackathon-data/test/test_ligand.sdf").expanduser()   # ⚠️ UPDATE THIS

    if not Path(protein_pdb).exists():
        print(f"\n⚠️  Test protein not found: {protein_pdb}")
        print("Please update the paths in tests/test_diffdock.py")
        return

    output_dir = Config.RESULTS_DIR / "test_diffdock"

    # Run docking
    print(f"\n🔬 Running docking...")
    print(f"   Protein: {protein_pdb}")
    print(f"   Ligand:  {ligand_sdf}")
    print(f"   Output:  {output_dir}")

    try:
        results = wrapper.run_docking(
            protein_path=protein_pdb,
            ligand_path=ligand_sdf,
            output_dir=str(output_dir),
            complex_name="test_diffdock"
        )

        print(f"\n✅ Docking completed successfully!")
        print(f"   Generated {results['num_poses']} poses")
        print(f"   Output directory: {results['output_dir']}")

        # Show top 3 poses
        print(f"\n🏆 Top 3 Poses:")
        for i, pose in enumerate(results['poses'][:3], 1):
            print(f"   {i}. Rank {pose['rank']}: "
                  f"confidence {pose['confidence']:.2f}, "
                  f"file: {Path(pose['file_path']).name}")

        # Get best pose
        best = wrapper.get_best_pose(results)
        print(f"\n⭐ Best pose:")
        print(f"   File: {best['file_path']}")
        print(f"   Confidence: {best['confidence']:.2f}")

        return results

    except Exception as e:
        print(f"\n❌ Docking failed: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    test_basic_docking()