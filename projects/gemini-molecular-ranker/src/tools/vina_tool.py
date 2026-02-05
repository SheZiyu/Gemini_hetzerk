"""
Vina as agent tool
"""
from pathlib import Path
from typing import Dict, Any
import tempfile

from src.tools.vina_wrapper import VinaWrapper
from src.config import Config


def execute_vina(
        protein_pdb: str,
        ligand_sdf: str,
        parameters: Dict[str, Any]
) -> Dict:
    """
    Execute Vina docking for agent
    """

    wrapper = VinaWrapper()

    # Prepare temporary directory
    temp_dir = Path(tempfile.mkdtemp(dir=Config.RESULTS_DIR))

    # Convert to PDBQT
    protein_pdbqt = temp_dir / "protein.pdbqt"
    ligand_pdbqt = temp_dir / "ligand.pdbqt"

    wrapper.prepare_protein(protein_pdb, str(protein_pdbqt))
    wrapper.prepare_ligand(ligand_sdf, str(ligand_pdbqt))

    # Get binding site center (from parameters or calculate)
    if 'center' in parameters:
        center = parameters['center']
    else:
        # Calculate from ligand
        from rdkit import Chem
        mol = Chem.SDMolSupplier(ligand_sdf)[0]
        if mol:
            conf = mol.GetConformer()
            coords = conf.GetPositions()
            center = tuple(coords.mean(axis=0))
        else:
            center = (0, 0, 0)

    # Run Vina
    output_dir = Config.RESULTS_DIR / "agent_vina"

    results = wrapper.run_docking(
        protein_pdbqt=str(protein_pdbqt),
        ligand_pdbqt=str(ligand_pdbqt),
        center=center,
        box_size=parameters.get('box_size', (20, 20, 20)),
        exhaustiveness=parameters.get('exhaustiveness', 8),
        num_modes=parameters.get('num_modes', 20),
        output_dir=str(output_dir)
    )

    # Format for agent
    return {
        'num_poses': results['num_poses'],
        'poses': results['poses'],
        'top_affinity': results['poses'][0]['affinity'] if results['poses'] else None,
        'output_dir': results['output_dir'],
        'method': 'vina'
    }