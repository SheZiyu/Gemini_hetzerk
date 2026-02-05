from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List
import base64
import gzip
import os
import sys
import tempfile
import uuid
from pathlib import Path

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
    from agents.orchestrator import AgentOrchestrator
    from config import GEMINI_API_KEY
    AGENT_AVAILABLE = True
except ImportError as e:
    print(f"Warning: AI Agent module not available: {e}")
    AGENT_AVAILABLE = False


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


def run_agent_analysis(protein_pdb: str, ligand_sdf: str) -> Dict[str, Any]:
    """运行 AI Agent 进行分析"""
    if not AGENT_AVAILABLE:
        raise RuntimeError("AI Agent module is not available")
    
    # 创建临时目录保存文件
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # 保存 protein 和 ligand 文件
        protein_file = temp_path / "protein.pdb"
        ligand_file = temp_path / "ligand.sdf"
        
        protein_file.write_text(protein_pdb)
        ligand_file.write_text(ligand_sdf)
        
        # 初始化并运行 Agent
        orchestrator = AgentOrchestrator(api_key=GEMINI_API_KEY)
        
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
        result = orchestrator.run(query)
        
        # 解析 Agent 返回结果
        return parse_agent_result(result, protein_pdb, ligand_sdf)


def parse_agent_result(agent_result: Dict[str, Any], protein_pdb: str, ligand_sdf: str) -> Dict[str, Any]:
    """解析 Agent 返回结果并格式化为前端需要的格式"""
    
    # 从 Agent 结果中提取候选
    candidates = []
    
    # 如果 Agent 返回了多个 poses
    if "poses" in agent_result:
        for i, pose in enumerate(agent_result["poses"][:5]):  # 取前5个
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
        "targetName": "Uploaded Target Protein",
        "candidates": candidates
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "agent_available": AGENT_AVAILABLE
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
        if AGENT_AVAILABLE:
            result = run_agent_analysis(protein_pdb, ligand_sdf)
        else:
            # 如果 Agent 不可用，返回简单的响应
            result = {
                "targetName": "Uploaded Target Protein",
                "candidates": [{
                    "id": "pose-1",
                    "name": "Binding Pose 1",
                    "rank": 1,
                    "score": -8.5,
                    "targetPdb": protein_pdb,
                    "ligandSdf": ligand_sdf,
                    "aiAnalysis": """**Analysis Summary**

AI Agent is currently unavailable. Please ensure:
1. AI Agent module is properly installed
2. GEMINI_API_KEY is configured
3. DiffDock is available at configured path

This is a placeholder response.""",
                    "admet": {"molecularWeight": 0}
                }]
            }
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
