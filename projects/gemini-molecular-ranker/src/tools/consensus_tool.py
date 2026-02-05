"""
Multi-method consensus for agent
"""
from typing import Dict, List
import numpy as np
from scipy.spatial.distance import cdist
from rdkit import Chem


def execute_consensus(
        diffdock_results: Dict,
        vina_results: Dict,
        parameters: Dict
) -> Dict:
    """
    Compare DiffDock and Vina results to find consensus

    Returns:
        Consensus analysis
    """

    print("🔍 Analyzing consensus between DiffDock and Vina...")

    # Get top poses from each method
    diffdock_top = diffdock_results['poses'][0]
    vina_top = vina_results['poses'][0]

    # Calculate RMSD between top poses
    rmsd = calculate_rmsd(
        diffdock_top['file_path'],
        vina_results['output_dir'] + '/vina_out.pdbqt'
    )

    # Determine consensus
    if rmsd < 2.0:
        consensus = "strong"
        interpretation = f"Both methods agree (RMSD {rmsd:.2f} Å < 2.0 Å threshold)"
    elif rmsd < 4.0:
        consensus = "moderate"
        interpretation = f"Methods show similar binding region (RMSD {rmsd:.2f} Å)"
    else:
        consensus = "weak"
        interpretation = f"Methods disagree significantly (RMSD {rmsd:.2f} Å > 4.0 Å)"

    # Score comparison
    confidence_comparison = {
        'diffdock_confidence': diffdock_top['confidence'],
        'vina_affinity': vina_top['affinity'],
        'diffdock_rank': diffdock_top['rank'],
        'vina_rank': vina_top['rank']
    }

    # Recommendation
    if consensus == "strong":
        recommendation = "High confidence - both methods agree"
        recommended_pose = diffdock_top
    elif rmsd < 4.0 and abs(diffdock_top['confidence']) < 3.0:
        recommendation = "Use DiffDock pose (better confidence)"
        recommended_pose = diffdock_top
    elif rmsd < 4.0 and vina_top['affinity'] < -7.0:
        recommendation = "Use Vina pose (better affinity)"
        recommended_pose = vina_top
    else:
        recommendation = "Low confidence - consider refinement or additional validation"
        recommended_pose = diffdock_top  # Default

    return {
        'consensus_level': consensus,
        'rmsd_between_tops': float(rmsd),
        'interpretation': interpretation,
        'confidence_comparison': confidence_comparison,
        'recommendation': recommendation,
        'recommended_pose': recommended_pose,
        'needs_refinement': consensus == "weak"
    }


def calculate_rmsd(pose1_file: str, pose2_file: str) -> float:
    """
    Calculate RMSD between two poses

    Simplified version - just compares centers of mass
    For production, use proper RMSD with alignment
    """

    # Load molecules
    if pose1_file.endswith('.sdf'):
        mol1 = Chem.SDMolSupplier(pose1_file, removeHs=False)[0]
    elif pose1_file.endswith('.pdbqt'):
        # Simple parsing - just get coordinates
        mol1 = parse_pdbqt(pose1_file)
    else:
        return float('inf')

    if pose2_file.endswith('.pdbqt'):
        mol2 = parse_pdbqt(pose2_file)
    else:
        return float('inf')

    if mol1 is None or mol2 is None:
        return float('inf')

    # Get centers of mass
    coords1 = mol1.GetConformer().GetPositions()
    coords2 = mol2.GetConformer().GetPositions()

    center1 = coords1.mean(axis=0)
    center2 = coords2.mean(axis=0)

    # Distance between centers (simplified RMSD)
    rmsd = np.linalg.norm(center1 - center2)

    return rmsd


def parse_pdbqt(pdbqt_file: str):
    """
    Simple PDBQT parser
    Returns RDKit mol with coordinates from first model
    """

    from rdkit import Chem
    from rdkit.Chem import AllChem

    # Read PDBQT
    with open(pdbqt_file) as f:
        lines = f.readlines()

    # Extract first MODEL
    model_lines = []
    in_model = False

    for line in lines:
        if line.startswith('MODEL'):
            in_model = True
            continue
        if line.startswith('ENDMDL'):
            break
        if in_model and (line.startswith('ATOM') or line.startswith('HETATM')):
            model_lines.append(line)

    if not model_lines:
        return None

    # Parse coordinates
    coords = []
    for line in model_lines:
        x = float(line[30:38])
        y = float(line[38:46])
        z = float(line[46:54])
        coords.append([x, y, z])

    # Create dummy molecule with coordinates
    mol = Chem.MolFromSmiles('C' * len(coords))  # Dummy
    if mol:
        conf = Chem.Conformer(len(coords))
        for i, coord in enumerate(coords):
            conf.SetAtomPosition(i, coord)
        mol.AddConformer(conf)

    return mol