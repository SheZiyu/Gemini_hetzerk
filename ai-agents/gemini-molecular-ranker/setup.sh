#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="gemini-dock"
PY_VER="3.9"
TORCH_VER="2.0.1"
CUDA_TAG="cu118"
TORCHVISION_VER="0.15.2"
TORCHAUDIO_VER="2.0.2"
NUMPY_VER="1.26.4"

echo "============================================================"
echo "  GEMINI-DOCK SETUP (NO JUPYTER - AVOIDS NUMPY 2.0)"
echo "============================================================"

source ~/miniforge3/etc/profile.d/conda.sh

echo "==> Removing old env"
conda deactivate >/dev/null 2>&1 || true
conda env remove -n "${ENV_NAME}" -y >/dev/null 2>&1 || true

echo "==> Creating env"
conda create -n "${ENV_NAME}" "python=${PY_VER}" -y

echo "==> Activating env"
conda activate "${ENV_NAME}"

echo "==> Installing NumPy ${NUMPY_VER} FIRST"
python -m pip install -U pip
python -m pip install "numpy==${NUMPY_VER}"

echo "==> Installing PyTorch ${TORCH_VER}+${CUDA_TAG}"
python -m pip install \
  "torch==${TORCH_VER}" \
  "torchvision==${TORCHVISION_VER}" \
  "torchaudio==${TORCHAUDIO_VER}" \
  --index-url "https://download.pytorch.org/whl/${CUDA_TAG}"

python -c "import torch; print('PyTorch:', torch.__version__, 'CUDA:', torch.cuda.is_available())"

echo "==> Installing PyTorch Geometric"
PYG_WHL="https://data.pyg.org/whl/torch-${TORCH_VER}%2B${CUDA_TAG}.html"
python -m pip install \
  pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv \
  -f "${PYG_WHL}"
python -m pip install torch_geometric

echo "==> Installing DiffDock deps"
python -m pip install pyyaml pandas tqdm biopython prody "e3nn==0.5.1"
python -m pip install --no-cache-dir rdkit-pypi
python -m pip install spyrmsd fair-esm

python -c "import numpy, prody; print('NumPy:', numpy.__version__, 'ProDy:', prody.__version__)"

echo "==> Installing hackathon tools"
python -m pip install python-dotenv pyyaml tqdm
python -m pip install matplotlib seaborn plotly
python -m pip install py3Dmol nglview
python -m pip install streamlit streamlit-extras

echo "==> Installing AutoDock Vina"
conda install -c conda-forge vina -y

python -m pip install google.generativeai
python -m pip install langchain langchain-google-genai langchain-community
python -m pip install python-dotenv aiohttp openpyxl xlsxwriter

# Final NumPy check
FINAL_NUMPY=$(python -c "import numpy; print(numpy.__version__)")
if [ "$FINAL_NUMPY" != "$NUMPY_VER" ]; then
  echo "⚠️ NumPy changed to $FINAL_NUMPY - fixing..."
  python -m pip install --force-reinstall "numpy==$NUMPY_VER"
  python -m pip install --force-reinstall "prody"
fi

echo ""
echo "==> FINAL VERIFICATION"
python << 'EOF'
import numpy, torch, prody
from rdkit import Chem
print("="*60)
print(f"✅ NumPy: {numpy.__version__}")
print(f"✅ PyTorch: {torch.__version__}")
print(f"✅ CUDA: {torch.cuda.is_available()}")
print(f"✅ ProDy: {prody.__version__}")
print(f"✅ RDKit: OK")
try:
    import streamlit, google.generativeai, langchain
    print(f"✅ Streamlit: OK")
    print(f"✅ Gemini: OK")
    print(f"✅ LangChain: OK")
except: pass
print("="*60)
print("🎉 READY FOR HACKATHON!")
print("="*60)
EOF

echo ""
echo "✅ SETUP COMPLETE!"
echo "To use: conda activate gemini-dock"
echo ""
echo "NOTE: Jupyter NOT installed to avoid NumPy conflicts."
echo "For notebooks, use: pip install notebook (will upgrade NumPy)"
echo "Or use: VS Code, PyCharm, or just scripts."