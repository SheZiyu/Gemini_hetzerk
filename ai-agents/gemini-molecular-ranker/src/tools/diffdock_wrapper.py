"""DiffDock wrapper matching your working setup"""
import subprocess
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import Config


class DiffDockWrapper:
    """Wrapper for DiffDock molecular docking"""

    def __init__(self, diffdock_path: Optional[Path] = None):
        self.diffdock_path = diffdock_path or Config.DIFFDOCK_PATH
        self.samples = Config.DIFFDOCK_SAMPLES
        self.steps = Config.DIFFDOCK_STEPS
        self.actual_steps = Config.DIFFDOCK_ACTUAL_STEPS
        self.batch_size = Config.BATCH_SIZE

        # Validate
        if not self.diffdock_path.exists():
            raise FileNotFoundError(f"DiffDock not found at {self.diffdock_path}")

        self.inference_script = self.diffdock_path / "inference.py"
        if not self.inference_script.exists():
            raise FileNotFoundError(f"inference.py not found")

    def run_docking(
        self,
        protein_path: str,
        ligand_path: str,
        output_dir: str,
        complex_name: str = "complex"
    ) -> Dict:
        """Run DiffDock docking"""

        print(f"🔬 Running DiffDock for {complex_name}...")

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Create input CSV
        input_csv = output_path / "input.csv"
        df = pd.DataFrame({
            'complex_name': [complex_name],
            'protein_path': [str(protein_path)],
            'ligand_description': [str(ligand_path)],
            'protein_sequence': ['']
        })
        df.to_csv(input_csv, index=False)

        # Command (exactly matching your working setup)
        cmd = [
            "python", str(self.inference_script),
            "--protein_ligand_csv", str(input_csv),
            "--out_dir", str(output_path),
            "--inference_steps", str(self.steps),
            "--samples_per_complex", str(self.samples),
            "--batch_size", str(self.batch_size),
            "--actual_steps", str(self.actual_steps),
            "--no_final_step_noise"
        ]

        print(f"  🚀 Generating up to {self.samples} poses...")
        print(f"  📁 Output: {output_path}")
        print(f"  ⏳ This may take several minutes...")
        print(f"  Command: {' '.join(cmd[:5])}...")

        try:
            # 使用 Popen 实时输出日志
            process = subprocess.Popen(
                cmd,
                cwd=str(self.diffdock_path),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            # 实时打印输出
            output_lines = []
            for line in iter(process.stdout.readline, ''):
                line = line.rstrip()
                if line:
                    output_lines.append(line)
                    # 只打印关键信息
                    if any(kw in line.lower() for kw in ['error', 'exception', 'download', 'loading', 'progress', 'complete', 'fail', 'success', '%']):
                        print(f"  📋 {line}")

            process.wait(timeout=600)

            if process.returncode != 0:
                print(f"  ❌ DiffDock stderr (last 10 lines):")
                for line in output_lines[-10:]:
                    print(f"     {line}")
                raise RuntimeError(f"DiffDock failed with code {process.returncode}")

            print("  ✅ DiffDock completed")

        except subprocess.TimeoutExpired:
            process.kill()
            raise RuntimeError("DiffDock timed out (600s)")

        # Parse results
        poses = self._parse_output(output_path, complex_name)

        return {
            'complex_name': complex_name,
            'num_poses': len(poses),
            'poses': poses,
            'output_dir': str(output_path),
            'poses_dir': str(output_path / complex_name)
        }

    def _parse_output(self, output_dir: Path, complex_name: str) -> List[Dict]:
        """Parse DiffDock output (format: rankN_confidence-X.XX.sdf)"""

        complex_dir = output_dir / complex_name
        if not complex_dir.exists():
            raise FileNotFoundError(f"No output: {complex_dir}")

        rank_files = sorted(complex_dir.glob("rank*_confidence*.sdf"))

        poses = []
        for rank_file in rank_files:
            filename = rank_file.stem
            parts = filename.split('_confidence')

            if len(parts) == 2:
                try:
                    rank = int(parts[0].replace('rank', ''))
                    confidence = float(parts[1])

                    poses.append({
                        'rank': rank,
                        'file_path': str(rank_file),
                        'filename': rank_file.name,
                        'confidence': confidence
                    })
                except ValueError:
                    continue

        return sorted(poses, key=lambda x: x['rank'])

    def get_best_pose(self, results: Dict) -> Dict:
        """Get best pose (lowest confidence score)"""
        if not results['poses']:
            raise ValueError("No poses found")
        return results['poses'][0]