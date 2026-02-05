from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List
import random
import time

app = FastAPI()

# Hackathon / demo: 先放寬 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    pdb_id: str

TARGET_NAMES = {
    "6gfs": "Beta-Lactoglobulin",
    "1iep": "Abl Kinase Domain",
    "8aw3": "EGFR Kinase Domain",
    "3poz": "JAK2 Kinase Domain",
    "2hyy": "EGFR with Gefitinib",
    "4yne": "ALK Kinase Domain",
}

DRUG_NAMES = [
    "Palmitic-DG", "Oleic-DG", "Linoleic-DG", "Stearic-DG", "Arachidonic-DG",
    "Docosa-DG", "Myris-DG", "Lauric-DG", "Caprylic-DG", "Eicosa-DG",
]

SMILES_LIST = [
    "CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5",
    "COC1=C(C=C2C(=C1)N=CN=C2NC3=CC(=C(C=C3)F)Cl)OCCCN4CCOCC4",
    "COC1=CC2=C(C=C1OCCCN3CCOCC3)C(=NC=N2)NC4=CC(=C(C=C4)F)Cl",
    "CC1=C(C(=O)N(C2=NC(=NC=C12)NC3=CC=C(C=C3)NC(=O)NC4=CC=CC=C4)C)C",
]

def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def mock_plddt(num_residues: int) -> Dict[str, Any]:
    scores: List[float] = []
    residue_numbers: List[int] = []
    chain_ids: List[str] = []
    total = 0.0

    for i in range(num_residues):
        if i < int(num_residues * 0.05) or i > int(num_residues * 0.95):
            base = 35 + random.random() * 25
        else:
            base = 70 + random.random() * 25

        s = max(0.0, min(100.0, base + (random.random() - 0.5) * 8))
        scores.append(s)
        residue_numbers.append(i + 1)
        chain_ids.append("A")
        total += s

    return {
        "scores": scores,
        "residueNumbers": residue_numbers,
        "chainIds": chain_ids,
        "averageScore": total / num_residues if num_residues else 0.0,
    }

def mock_pae(num_residues: int) -> Dict[str, Any]:
    matrix: List[List[float]] = []
    max_pae = 0.0

    for i in range(num_residues):
        row: List[float] = []
        for j in range(num_residues):
            if i == j:
                v = 0.0
            else:
                dist = abs(i - j)
                v = min(30.0, dist * 0.12 + random.random() * 2.0)
            row.append(v)
            if v > max_pae:
                max_pae = v
        matrix.append(row)

    return {
        "matrix": matrix,
        "maxPAE": max_pae,
        "chainBoundaries": [],
        "numResidues": num_residues,
    }

def mock_candidates(pdb_id: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []

    for i in range(10):
        score = -10.5 + (i * 0.35) + (random.random() * 0.2 - 0.1)
        logp = 2.5 + random.random() * 2.0
        mw = 450 + (i * 15) + (random.random() * 30)
        qed = 0.85 - (i * 0.03) + (random.random() * 0.05)

        out.append({
            "id": f"cand-{i+1}",
            "name": DRUG_NAMES[i] if i < len(DRUG_NAMES) else f"DrugGen-{100+i}",
            "rank": i + 1,
            "score": score,
            "smiles": SMILES_LIST[i % len(SMILES_LIST)],
            "targetPdb": "",
            "ligandSdf": "",
            "admet": {
                "molecularWeight": mw,
                "logP": logp,
                "qed": max(0.4, min(0.95, qed)),
                "saScore": 2.0 + (i * 0.2) + (random.random() * 0.5),
                "toxicity": "Low" if i < 3 else "Medium" if i < 7 else "High",
                "hbd": int(2 + random.random() * 3),
                "hba": int(4 + random.random() * 4),
                "tpsa": 60 + random.random() * 80,
                "rotBonds": int(3 + random.random() * 5),
            },
            "aiAnalysis": f"Mock analysis for {pdb_id.upper()} / {DRUG_NAMES[i] if i < len(DRUG_NAMES) else 'DrugGen'}",
        })

    return out

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/api/generate")
def generate(req: GenerateRequest):
    pdb_id = (req.pdb_id or "").strip().lower() or "6gfs"

    num_residues = 120
    plddt = mock_plddt(num_residues)
    pae = mock_pae(num_residues)

    chains = [{
        "chainId": "A",
        "startIndex": 0,
        "endIndex": num_residues,
        "residueCount": num_residues,
        "type": "protein",
    }]

    quality_data = {
        "modelConfidence": {
            "pTM": 0.70 + (plddt["averageScore"] / 100.0) * 0.25,
            "ipTM": None,
        },
        "plddt": plddt,
        "pae": pae,
        "chains": chains,
    }

    return {
        "jobId": f"job-{int(time.time())}-{random.randint(1000,9999)}",
        "status": "completed",
        "targetName": TARGET_NAMES.get(pdb_id, f"Target ({pdb_id.upper()})"),
        "targetPdbId": pdb_id.upper(),
        "candidates": mock_candidates(pdb_id),
        "qualityData": quality_data,
        "paeData": pae,
        "generatedAt": now_iso(),
    }
