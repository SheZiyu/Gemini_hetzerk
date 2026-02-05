"""
Molecular scoring functions
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, Lipinski
from Bio.PDB import PDBParser, Selection
from scipy.spatial.distance import cdist


class MolecularScorer:
    """Calculate various molecular scores"""

    def __init__(self):
        self.pdb_parser = PDBParser(QUIET=True)

    def score_pose(
            self,
            protein_pdb: str,
            ligand_sdf: str,
            pose_rank: int
    ) -> Dict:
        """
        Comprehensive pose scoring

        Returns:
            Dictionary of scores
        """
        scores = {
            'rank': pose_rank,
            'file': ligand_sdf
        }

        # Load molecules
        protein_structure = self.pdb_parser.get_structure('protein', protein_pdb)

        supplier = Chem.SDMolSupplier(ligand_sdf)
        ligand_mol = next(supplier)

        if ligand_mol is None:
            print(f"⚠️  Warning: Could not read {ligand_sdf}")
            return scores

        # Ligand properties
        scores.update(self._calculate_ligand_properties(ligand_mol))

        # Protein-ligand interactions
        scores.update(self._calculate_interactions(protein_structure, ligand_mol))

        # Geometric scores
        scores.update(self._calculate_geometric_scores(protein_structure, ligand_mol))

        return scores

    def _calculate_ligand_properties(self, mol: Chem.Mol) -> Dict:
        """Calculate ligand properties (drug-likeness)"""
        return {
            'molecular_weight': Descriptors.MolWt(mol),
            'logp': Descriptors.MolLogP(mol),
            'hbd': Descriptors.NumHDonors(mol),  # H-bond donors
            'hba': Descriptors.NumHAcceptors(mol),  # H-bond acceptors
            'rotatable_bonds': Descriptors.NumRotatableBonds(mol),
            'tpsa': Descriptors.TPSA(mol),  # Topological polar surface area
            'lipinski_violations': self._lipinski_violations(mol)
        }

    def _lipinski_violations(self, mol: Chem.Mol) -> int:
        """Count Lipinski Rule of Five violations"""
        violations = 0
        if Descriptors.MolWt(mol) > 500:
            violations += 1
        if Descriptors.MolLogP(mol) > 5:
            violations += 1
        if Descriptors.NumHDonors(mol) > 5:
            violations += 1
        if Descriptors.NumHAcceptors(mol) > 10:
            violations += 1
        return violations

    def _calculate_interactions(self, protein_structure, ligand_mol: Chem.Mol) -> Dict:
        """Calculate protein-ligand interactions"""

        # Get protein atoms
        protein_atoms = []
        for atom in Selection.unfold_entities(protein_structure, 'A'):
            coord = atom.get_coord()
            protein_atoms.append({
                'coord': coord,
                'element': atom.element,
                'residue': atom.get_parent().get_resname(),
                'res_id': atom.get_parent().get_id()[1]
            })

        protein_coords = np.array([a['coord'] for a in protein_atoms])

        # Get ligand atoms
        conf = ligand_mol.GetConformer()
        ligand_coords = conf.GetPositions()

        # Calculate distances
        distances = cdist(ligand_coords, protein_coords)
        min_distances = distances.min(axis=1)

        # Find close contacts
        contact_threshold = 4.0  # Angstroms
        num_contacts = (min_distances < contact_threshold).sum()

        # Find H-bonds (simplified: O/N within 3.5 Å)
        hbond_threshold = 3.5
        ligand_hbond_atoms = [i for i, atom in enumerate(ligand_mol.GetAtoms())
                              if atom.GetSymbol() in ['O', 'N']]
        protein_hbond_indices = [i for i, a in enumerate(protein_atoms)
                                 if a['element'] in ['O', 'N']]

        num_hbonds = 0
        hbond_residues = set()
        if ligand_hbond_atoms and protein_hbond_indices:
            hbond_distances = distances[np.ix_(ligand_hbond_atoms, protein_hbond_indices)]
            hbond_pairs = np.argwhere(hbond_distances < hbond_threshold)
            num_hbonds = len(hbond_pairs)

            # Identify residues involved
            for lig_idx, prot_idx in hbond_pairs:
                actual_prot_idx = protein_hbond_indices[prot_idx]
                res_id = protein_atoms[actual_prot_idx]['res_id']
                res_name = protein_atoms[actual_prot_idx]['residue']
                hbond_residues.add(f"{res_name}{res_id}")

        # Hydrophobic contacts (simplified: C atoms within 4.5 Å)
        hydrophobic_threshold = 4.5
        ligand_hydrophobic = [i for i, atom in enumerate(ligand_mol.GetAtoms())
                              if atom.GetSymbol() == 'C']
        protein_hydrophobic_indices = [i for i, a in enumerate(protein_atoms)
                                       if a['element'] == 'C']

        num_hydrophobic = 0
        if ligand_hydrophobic and protein_hydrophobic_indices:
            hydro_distances = distances[np.ix_(ligand_hydrophobic, protein_hydrophobic_indices)]
            num_hydrophobic = (hydro_distances < hydrophobic_threshold).sum()

        return {
            'num_contacts': int(num_contacts),
            'num_hbonds': int(num_hbonds),
            'hbond_residues': list(hbond_residues),
            'num_hydrophobic': int(num_hydrophobic),
            'min_distance': float(min_distances.min()),
            'avg_distance': float(min_distances.mean())
        }

    def _calculate_geometric_scores(self, protein_structure, ligand_mol: Chem.Mol) -> Dict:
        """Calculate geometric complementarity scores"""

        # Get binding pocket volume (simplified)
        protein_atoms = Selection.unfold_entities(protein_structure, 'A')
        protein_coords = np.array([atom.get_coord() for atom in protein_atoms])

        conf = ligand_mol.GetConformer()
        ligand_coords = conf.GetPositions()
        ligand_center = ligand_coords.mean(axis=0)

        # Find pocket atoms (within 10 Å of ligand center)
        distances_to_center = np.linalg.norm(protein_coords - ligand_center, axis=1)
        pocket_atoms = protein_coords[distances_to_center < 10.0]

        # Ligand volume approximation
        ligand_radius = np.linalg.norm(ligand_coords - ligand_center, axis=0).max()
        ligand_volume = (4 / 3) * np.pi * (ligand_radius ** 3)

        # Pocket volume approximation (convex hull would be better)
        if len(pocket_atoms) > 0:
            pocket_ranges = pocket_atoms.max(axis=0) - pocket_atoms.min(axis=0)
            pocket_volume = np.prod(pocket_ranges)
        else:
            pocket_volume = 0

        # Shape complementarity (simplified: volume ratio)
        if pocket_volume > 0:
            shape_complementarity = min(ligand_volume / pocket_volume, 1.0)
        else:
            shape_complementarity = 0.0

        return {
            'ligand_volume': float(ligand_volume),
            'pocket_volume': float(pocket_volume),
            'shape_complementarity': float(shape_complementarity),
            'burial_score': float(len(pocket_atoms) / max(len(ligand_coords), 1))
        }

    def calculate_composite_score(self, scores: Dict) -> float:
        """
        Calculate weighted composite score

        Weighs different factors to create single ranking metric
        """
        # Weights (tunable based on your preferences)
        weights = {
            'hbonds': 2.0,
            'hydrophobic': 1.0,
            'contacts': 0.5,
            'shape': 1.5,
            'lipinski': -2.0  # Negative because violations are bad
        }

        composite = 0.0

        # H-bonds contribution
        composite += weights['hbonds'] * scores.get('num_hbonds', 0)

        # Hydrophobic contribution
        composite += weights['hydrophobic'] * scores.get('num_hydrophobic', 0) / 10.0

        # Contacts contribution
        composite += weights['contacts'] * scores.get('num_contacts', 0) / 20.0

        # Shape complementarity
        composite += weights['shape'] * scores.get('shape_complementarity', 0) * 10

        # Lipinski violations (penalty)
        composite += weights['lipinski'] * scores.get('lipinski_violations', 0)

        return composite


# Batch scoring function
def score_all_poses(
        protein_pdb: str,
        poses_dir: str,
        output_csv: str
) -> pd.DataFrame:
    """
    Score all poses in a directory

    Args:
        protein_pdb: Path to protein PDB
        poses_dir: Directory containing pose SDF files
        output_csv: Where to save results

    Returns:
        DataFrame with all scores
    """
    import pandas as pd
    from pathlib import Path
    from tqdm import tqdm

    scorer = MolecularScorer()

    pose_files = sorted(Path(poses_dir).glob("rank*.sdf"))

    all_scores = []
    for pose_file in tqdm(pose_files, desc="Scoring poses"):
        rank = int(pose_file.stem.replace("rank", ""))
        scores = scorer.score_pose(protein_pdb, str(pose_file), rank)

        # Add composite score
        scores['composite_score'] = scorer.calculate_composite_score(scores)

        all_scores.append(scores)

    # Create DataFrame
    df = pd.DataFrame(all_scores)

    # Sort by composite score
    df = df.sort_values('composite_score', ascending=False)
    df['rerank'] = range(1, len(df) + 1)

    # Save
    df.to_csv(output_csv, index=False)
    print(f"💾 Scores saved to {output_csv}")

    return df