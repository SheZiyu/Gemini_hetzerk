"""
AutoDock Vina wrapper for agent
"""
import subprocess
from pathlib import Path
from typing import Dict, Any, List
import tempfile
import shutil

from rdkit import Chem
from rdkit.Chem import AllChem


class VinaWrapper:
    """Wrapper for AutoDock Vina"""

    def __init__(self):
        # Check if vina is available
        try:
            result = subprocess.run(['vina', '--help'],
                                    capture_output=True, timeout=5)
            if result.returncode != 0:
                raise RuntimeError("Vina not found")
        except FileNotFoundError:
            raise RuntimeError("Vina not installed. Install: conda install -c conda-forge vina")

    def run_docking(
            self,
            protein_pdbqt: str,
            ligand_pdbqt: str,
            center: tuple,
            box_size: tuple = (20, 20, 20),
            exhaustiveness: int = 8,
            num_modes: int = 20,
            output_dir: str = None
    ) -> Dict:
        """
        Run Vina docking

        Args:
            protein_pdbqt: Path to protein in PDBQT format
            ligand_pdbqt: Path to ligand in PDBQT format
            center: (x, y, z) center of search box
            box_size: (x, y, z) size of search box in Angstroms
            exhaustiveness: Search thoroughness (default: 8)
            num_modes: Number of binding modes (default: 20)
            output_dir: Where to save results

        Returns:
            Dictionary with results
        """

        if output_dir is None:
            output_dir = tempfile.mkdtemp()

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Output file
        output_pdbqt = output_dir / "vina_out.pdbqt"
        log_file = output_dir / "vina_log.txt"

        # Vina command
        cmd = [
            'vina',
            '--receptor', str(protein_pdbqt),
            '--ligand', str(ligand_pdbqt),
            '--center_x', str(center[0]),
            '--center_y', str(center[1]),
            '--center_z', str(center[2]),
            '--size_x', str(box_size[0]),
            '--size_y', str(box_size[1]),
            '--size_z', str(box_size[2]),
            '--exhaustiveness', str(exhaustiveness),
            '--num_modes', str(num_modes),
            '--out', str(output_pdbqt),
            '--log', str(log_file)
        ]

        print(f"🔬 Running Vina...")
        print(f"   Command: {' '.join(cmd)}")

        # Run Vina
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=1800  # 30 min timeout
            )

            if result.returncode != 0:
                raise RuntimeError(f"Vina failed: {result.stderr}")

            print("✅ Vina completed")

        except subprocess.TimeoutExpired:
            raise RuntimeError("Vina timed out (>30 min)")

        # Parse results
        poses = self._parse_vina_output(output_pdbqt, log_file)

        return {
            'num_poses': len(poses),
            'poses': poses,
            'output_dir': str(output_dir),
            'output_pdbqt': str(output_pdbqt)
        }

    def _parse_vina_output(self, output_pdbqt: Path, log_file: Path) -> List[Dict]:
        """Parse Vina output"""

        poses = []

        # Parse log for scores
        with open(log_file) as f:
            lines = f.readlines()

        # Find results section
        in_results = False
        for line in lines:
            if 'mode |   affinity' in line:
                in_results = True
                continue

            if in_results and line.strip().startswith('---'):
                break

            if in_results and line.strip():
                try:
                    parts = line.split()
                    if len(parts) >= 3:
                        mode = int(parts[0])
                        affinity = float(parts[1])

                        poses.append({
                            'rank': mode,
                            'affinity': affinity,  # kcal/mol (lower is better)
                            'file_path': str(output_pdbqt)
                        })
                except ValueError:
                    continue

        return sorted(poses, key=lambda x: x['affinity'])

    def prepare_protein(self, pdb_file: str, output_pdbqt: str):
        """Convert PDB to PDBQT (simplified)"""
        # For quick hackathon: use obabel if available
        # For production: use MGLTools prepare_receptor4.py

        try:
            cmd = [
                'obabel',
                pdb_file,
                '-O', output_pdbqt,
                '-xr'  # Add polar hydrogens
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return output_pdbqt
        except:
            print("⚠️ obabel not found. Using PDB directly (not ideal)")
            shutil.copy(pdb_file, output_pdbqt.replace('.pdbqt', '.pdb'))
            return output_pdbqt.replace('.pdbqt', '.pdb')

    def prepare_ligand(self, sdf_file: str, output_pdbqt: str):
        """Convert SDF to PDBQT"""

        try:
            cmd = [
                'obabel',
                sdf_file,
                '-O', output_pdbqt,
                '-h'  # Add hydrogens
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return output_pdbqt
        except:
            print("⚠️ obabel not found. Using SDF directly")
            shutil.copy(sdf_file, output_pdbqt.replace('.pdbqt', '.sdf'))
            return output_pdbqt.replace('.pdbqt', '.sdf')


# Quick test
if __name__ == "__main__":
    wrapper = VinaWrapper()
    print("✅ Vina wrapper initialized")