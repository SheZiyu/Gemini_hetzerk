"""
DiffDock as an agent tool
"""
from pathlib import Path
from typing import Dict, Any

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.tools.diffdock_wrapper import DiffDockWrapper
from src.config import Config


def execute_diffdock(
    protein_pdb: str,
    ligand_sdf: str,
    parameters: Dict[str, Any]
) -> Dict:
    """
    Execute DiffDock and return results in agent-friendly format
    """

    wrapper = DiffDockWrapper()

    # Get parameters
    num_poses = parameters.get('num_poses', 40)

    # Run docking
    output_dir = Config.RESULTS_DIR / "agent_diffdock"

    raw_results = wrapper.run_docking(
        protein_path=protein_pdb,
        ligand_path=ligand_sdf,
        output_dir=str(output_dir),
        complex_name="agent_docking"
    )

    # Format for agent
    agent_results = {
        'num_poses': raw_results['num_poses'],
        'poses': raw_results['poses'],
        'top_confidence': raw_results['poses'][0]['confidence'] if raw_results['poses'] else None,
        'output_dir': raw_results['output_dir']
    }

    return agent_results