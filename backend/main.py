from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict
import base64
import gzip
import sys
import tempfile
from pathlib import Path
import os

# 🔧 关键修复：在所有导入之前先加载 .env 文件
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# 确保代理环境变量被设置
http_proxy = os.getenv('HTTP_PROXY')
https_proxy = os.getenv('HTTPS_PROXY')
if http_proxy or https_proxy:
    print(f"🌐 Backend proxy configuration:")
    if http_proxy:
        print(f"   HTTP_PROXY: {http_proxy}")
    if https_proxy:
        print(f"   HTTPS_PROXY: {https_proxy}")
else:
    print("⚠️  Warning: No proxy configured in backend/.env")

app = FastAPI()

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入 AI Agent 模块
sys.path.insert(0, str(Path(__file__).parent.parent / "ai-agents" / "gemini-molecular-ranker" / "src"))

try:
    from agents.orchestrator import OrchestratorAgent
    from config import GEMINI_API_KEY, Config
    AGENT_AVAILABLE = True
    print(f"✅ AI Agent module loaded successfully")
    print(f"   GEMINI_API_KEY configured: {'Yes' if GEMINI_API_KEY else 'No'}")
except ImportError as e:
    print(f"⚠️  Warning: AI Agent module not available: {e}")
    AGENT_AVAILABLE = False
    GEMINI_API_KEY = None


class AnalyzeRequest(BaseModel):
    protein: str  # Base64 encoded gzipped protein PDB content
    ligand: str   # Base64 encoded gzipped ligand SDF content
    proteinName: str
    ligandName: str


def decompress_base64(data: str) -> str:
    """解压缩 Base64 编码的 gzip 数据"""
    try:
        compressed = base64.b64decode(data)
        decompressed = gzip.decompress(compressed)
        return decompressed.decode('utf-8')
    except Exception as e:
        raise ValueError(f"Failed to decompress data: {e}")


def run_agent_analysis(protein_pdb: str, ligand_sdf: str, protein_name: str, ligand_name: str) -> Dict[str, Any]:
    """运行 AI Agent 进行分析"""
    if not AGENT_AVAILABLE:
        raise RuntimeError("AI Agent module is not available")

    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    # 创建临时目录保存文件
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)

        # 保存 protein 和 ligand 文件
        protein_file = temp_path / "protein.pdb"
        ligand_file = temp_path / "ligand.sdf"

        protein_file.write_text(protein_pdb)
        ligand_file.write_text(ligand_sdf)

        # 初始化并运行 Agent
        orchestrator = OrchestratorAgent(api_key=GEMINI_API_KEY)

        query = f"""
        Perform molecular docking analysis for:
        - Protein: {protein_file}
        - Ligand: {ligand_file}

        Please:
        1. Run DiffDock to generate binding poses
        2. Score the poses using appropriate scoring functions
        3. Validate the top poses
        4. Provide detailed analysis and recommendations
        """

        # 运行 Agent
        result = orchestrator.run(
            user_query=query,
            protein_pdb=str(protein_file),
            ligand_sdf=str(ligand_file)
        )

        # 解析 Agent 返回结果
        return parse_agent_result(result, protein_pdb, ligand_sdf, protein_name)


def parse_agent_result(agent_result: Dict[str, Any], protein_pdb: str, ligand_sdf: str, protein_name: str) -> Dict[str, Any]:
    """解析 Agent 返回结果并格式化为前端需要的格式"""

    candidates = []

    # 如果 Agent 返回了多个 poses
    if "poses" in agent_result:
        for i, pose in enumerate(agent_result["poses"][:5]):
            candidates.append({
                "id": f"pose-{i+1}",
                "name": f"Binding Pose {i+1}",
                "rank": i + 1,
                "score": pose.get("score", 0.0),
                "targetPdb": pose.get("pdb_content", protein_pdb),
                "ligandSdf": pose.get("sdf_content", ligand_sdf),
                "aiAnalysis": pose.get("analysis", "Analysis in progress..."),
                "admet": {
                    "molecularWeight": pose.get("molecular_weight", 0)
                }
            })
    else:
        # 如果没有 poses，使用 final answer
        candidates.append({
            "id": "pose-1",
            "name": "Binding Pose 1",
            "rank": 1,
            "score": 0.0,
            "targetPdb": protein_pdb,
            "ligandSdf": ligand_sdf,
            "aiAnalysis": agent_result.get("final_answer", "Analysis completed."),
            "admet": {"molecularWeight": 0}
        })

    return {
        "targetName": protein_name.replace('.pdb', ''),
        "candidates": candidates
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "agent_available": AGENT_AVAILABLE,
        "api_key_configured": bool(GEMINI_API_KEY)
    }


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    """
    接收压缩的 protein 和 ligand 文件，解压后调用 AI Agent 进行分析
    """
    try:
        # 解压缩文件
        protein_pdb = decompress_base64(req.protein)
        ligand_sdf = decompress_base64(req.ligand)

        print(f"Received files: {req.proteinName}, {req.ligandName}")
        print(f"Protein PDB size: {len(protein_pdb)} bytes")
        print(f"Ligand SDF size: {len(ligand_sdf)} bytes")

        # 调用 AI Agent 进行分析
        result = run_agent_analysis(protein_pdb, ligand_sdf, req.proteinName, req.ligandName)
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
