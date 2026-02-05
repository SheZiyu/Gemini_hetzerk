"""
Test multi-method consensus
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.tools.diffdock_tool import execute_diffdock
from src.tools.vina_tool import execute_vina
from src.tools.consensus_tool import execute_consensus


def test_consensus():
    """Test DiffDock + Vina consensus"""

    # Your test files
    protein_pdb = "/path/to/1A2C.pdb"  # UPDATE
    ligand_sdf = "/path/to/ligand.sdf"  # UPDATE

    print("🔬 Running DiffDock...")
    diffdock_results = execute_diffdock(protein_pdb, ligand_sdf, {})

    print("\n🔬 Running Vina...")
    vina_results = execute_vina(protein_pdb, ligand_sdf, {})

    print("\n🔍 Analyzing consensus...")
    consensus = execute_consensus(diffdock_results, vina_results, {})

    print("\n" + "=" * 70)
    print("CONSENSUS ANALYSIS")
    print("=" * 70)
    print(f"Level: {consensus['consensus_level']}")
    print(f"RMSD: {consensus['rmsd_between_tops']:.2f} Å")
    print(f"Interpretation: {consensus['interpretation']}")
    print(f"Recommendation: {consensus['recommendation']}")
    print("=" * 70)


if __name__ == "__main__":
    test_consensus()