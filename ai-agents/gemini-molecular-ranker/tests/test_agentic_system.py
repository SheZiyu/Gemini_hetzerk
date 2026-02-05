"""
Test the complete agentic system
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.agents.orchestrator import OrchestratorAgent
from src.config import Config


def test_agentic_docking():
    """Test full agentic workflow"""

    print("\n" + "=" * 70)
    print("TESTING AGENTIC MOLECULAR DOCKING SYSTEM")
    print("=" * 70)

    # Initialize agent
    agent = OrchestratorAgent()

    # Test inputs (UPDATE THESE PATHS)
    protein_pdb = Path("~/hackathon-data/test/1A2C.pdb").expanduser()  # ⚠️ UPDATE THIS
    ligand_sdf = Path("~/hackathon-data/test/test_ligand.sdf").expanduser()  # ⚠️ UPDATE THIS

    if not Path(protein_pdb).exists():
        print("\n⚠️  Please update file paths in tests/test_agentic_system.py")
        return

    # User query
    user_query = "Find the best binding pose for this drug candidate and validate it"

    # Run agent
    results = agent.run(
        user_query=user_query,
        protein_pdb=protein_pdb,
        ligand_sdf=ligand_sdf,
        max_steps=8,
        save_memory=True
    )

    # Display results
    print("\n" + "=" * 70)
    print("FINAL ANSWER:")
    print("=" * 70)
    print(results['final_answer'])
    print("=" * 70)

    print(f"\n📊 Session Summary:")
    print(f"   Session ID: {results['session_id']}")
    print(f"   Total time: {results['total_time']:.1f}s")
    print(f"   Steps taken: {len(results['plan']['steps'])}")

    print(f"\n📝 Full reasoning trace saved to:")
    print(f"   data/results/agentic_sessions/{results['session_id']}/")


if __name__ == "__main__":
    test_agentic_docking()