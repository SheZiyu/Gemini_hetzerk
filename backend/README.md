## Local run
python -m venv .venv
source .venv/Scripts/activate   # Git Bash on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8080

## Test
curl -X POST http://localhost:8080/api/generate \
  -H "Content-Type: application/json" \
  -d '{"pdb_id":"6gfs"}'
