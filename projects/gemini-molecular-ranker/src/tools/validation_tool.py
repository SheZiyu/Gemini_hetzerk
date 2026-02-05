"""
Validation tools for agent
"""
from pathlib import Path
from typing import Dict, Any
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors
import numpy as np

import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))


def execute_validation(
        protein_pdb: str,
        pose: Dict,
        parameters: Dict[str, Any]
) -> Dict:
    """
    Validate if a pose is physically reasonable
    """

    ligand_sdf = pose['file_path']

    # Load ligand
    supplier = Chem.SDMolSupplier(ligand_sdf, removeHs=False)
    mol = next(supplier)

    if mol is None:
        return {
            'status': 'failed',
            'summary': 'Could not read ligand file',
            'issues': ['file_read_error']
        }

    issues = []

    # Check 1: Molecular sanity
    try:
        Chem.SanitizeMol(mol)
    except:
        issues.append('sanitization_failed')

    # Check 2: Unreasonable bond lengths
    conf = mol.GetConformer()
    for bond in mol.GetBonds():
        i = bond.GetBeginAtomIdx()
        j = bond.GetEndAtomIdx()
        dist = conf.GetAtomPosition(i).Distance(conf.GetAtomPosition(j))

        # Typical bond lengths: 1.0-2.0 Å
        if dist < 0.8 or dist > 2.5:
            issues.append(f'unusual_bond_length_{i}_{j}')

    # Check 3: Check for clashes (atoms too close)
    coords = conf.GetPositions()
    distances = []
    for i in range(len(coords)):
        for j in range(i + 1, len(coords)):
            dist = np.linalg.norm(coords[i] - coords[j])
            distances.append(dist)

    min_dist = min(distances) if distances else 0
    if min_dist < 0.8:
        issues.append('atomic_clash')

    # Check 4: Drug-likeness
    mw = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)

    if mw > 600:
        issues.append('high_molecular_weight')
    if logp > 6:
        issues.append('high_logp')

    # Determine status
    if len(issues) == 0:
        status = 'excellent'
        summary = 'Pose passes all validation checks'
    elif len(issues) <= 2:
        status = 'acceptable'
        summary = f'Minor issues: {", ".join(issues[:2])}'
    else:
        status = 'problematic'
        summary = f'Multiple issues found: {", ".join(issues)}'

    return {
        'status': status,
        'summary': summary,
        'issues': issues,
        'min_distance': float(min_dist),
        'molecular_weight': float(mw),
        'logp': float(logp)
    }