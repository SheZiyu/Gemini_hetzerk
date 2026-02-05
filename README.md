# DrugDiffusion

AI-powered molecular docking and drug design platform with Gemini LLM orchestration.

## Quick Start

```bash
./build.sh setup  # Install dependencies and create config files
./build.sh dev    # Start development servers
```

## Project Structure

```
Gemini_hetzerk/
├── frontend/          # Next.js 15 + React 19 (Port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # File upload page
│   │   │   ├── results/page.tsx      # Results display page
│   │   │   └── api/analyze/route.ts  # API proxy: compress and forward
│   │   └── components/
│   │       ├── Molecule3D.tsx        # 3D molecule viewer
│   │       └── ProteinViewerPanel.tsx
│   └── package.json
│
├── backend/           # FastAPI (Port 8000)
│   ├── main.py        # Decompress files, call AI Agent
│   └── requirements.txt
│
└── ai-agents/         # AI Agent modules
    └── gemini-molecular-ranker/
        ├── src/
        │   ├── agents/
        │   │   ├── orchestrator.py   # Gemini orchestrator
        │   │   ├── tools_registry.py
        │   │   └── prompts.py
        │   ├── tools/
        │   │   ├── diffdock_tool.py
        │   │   ├── vina_tool.py
        │   │   ├── scoring_tool.py
        │   │   └── validation_tool.py
        │   └── config.py
        └── requirements.txt
```

## Data Flow

```
1. Frontend (page.tsx)
   └─> User uploads protein.pdb + ligand.sdf

2. Frontend API (api/analyze/route.ts)
   └─> Compress files with pako.gzip()
   └─> Convert to Base64
   └─> POST to backend /api/analyze

3. Backend (backend/main.py)
   └─> Base64 decode
   └─> gzip decompress
   └─> Save temp files
   └─> Call AI Agent orchestrator.run()

4. AI Agent (orchestrator.py)
   └─> Gemini LLM generates analysis plan
   └─> Call DiffDock for molecular docking
   └─> Score with Vina
   └─> Validate and rank poses
   └─> Return PDB files + AI suggestions

5. Backend returns results to frontend

6. Frontend display (results/page.tsx)
   └─> 3D visualization (PDBe Molstar)
   └─> AI suggestions and scores
   └─> Export PDB files
```

## Build Commands

| Command | Description |
|---------|-------------|
| `./build.sh setup` | Initialize environment and install dependencies |
| `./build.sh check` | Check configuration |
| `./build.sh dev` | Start development servers |
| `./build.sh build` | Build for production |
| `./build.sh verify` | Verify project integrity |
| `./build.sh help` | Show help |

## Prerequisites

1. **Node.js 18+** (frontend)
2. **Python 3.8+** (backend and AI Agent)
3. **DiffDock**:
   ```bash
   git clone https://github.com/gcorso/DiffDock.git
   cd DiffDock
   # Follow DiffDock documentation to install dependencies
   ```
4. **Gemini API Key**: https://aistudio.google.com/

## Configuration

**Backend** (`backend/.env`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
DIFFDOCK_PATH=/path/to/DiffDock
```

**AI Agent** (`ai-agents/gemini-molecular-ranker/.env`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
DIFFDOCK_PATH=/path/to/DiffDock
DIFFDOCK_SAMPLES=40
GEMINI_MODEL=gemini-1.5-pro
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## API Documentation

### POST /api/analyze

**Request**:
```json
{
  "protein": "base64_encoded_gzipped_pdb_content",
  "ligand": "base64_encoded_gzipped_sdf_content",
  "proteinName": "protein.pdb",
  "ligandName": "ligand.sdf"
}
```

**Response**:
```json
{
  "targetName": "Uploaded Target Protein",
  "candidates": [
    {
      "id": "pose-1",
      "name": "Binding Pose 1",
      "rank": 1,
      "score": -9.5,
      "targetPdb": "ATOM...",
      "ligandSdf": "...",
      "aiAnalysis": "**Binding Analysis Summary**\n...",
      "admet": {
        "molecularWeight": 350
      }
    }
  ]
}
```

## Features

### Frontend
- File upload (protein.pdb, ligand.sdf)
- Client-side compression (gzip + Base64)
- 3D molecular structure visualization (PDBe Molstar)
- AI-generated binding analysis
- Candidate pose ranking and comparison
- PDB file export

### Backend
- Decompress uploaded files (gzip + Base64)
- Integration with AI Agent module
- Temp file management
- Async processing

### AI Agents
- **Gemini LLM Orchestration**: Intelligent decision-making and planning
- **DiffDock**: ML-based molecular docking
- **AutoDock Vina**: Traditional docking and scoring
- **Pose Scoring and Validation**
- **AI-generated Analysis Suggestions**

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS |
| Compression | pako (gzip) |
| 3D Visualization | PDBe Molstar |
| Backend | FastAPI, Python 3.8+ |
| AI Orchestration | Google Gemini 1.5 Pro |
| Molecular Docking | DiffDock, AutoDock Vina |
| Cheminformatics | RDKit |

## Debugging

**Check backend status**:
```bash
curl http://localhost:8000/health
```

**Frontend development mode**:
- Open browser developer tools (F12)
- Check API requests in Network tab

## Notes

1. **First run**: Install dependencies first (`./build.sh setup`)
2. **DiffDock**: Ensure DiffDock is properly installed and path configured
3. **API Key**: Gemini API Key is required
4. **File size**: Recommend uploaded files < 10MB
5. **Processing time**: Molecular docking may take several minutes

## License

MIT
