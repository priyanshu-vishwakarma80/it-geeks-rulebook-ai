#!/usr/bin/env bash
echo "===================================================================="
echo "  The Rulebook That Argues With Itself - Apex Institute Q&A Engine"
echo "  IT Geeks Placement Round"
echo "===================================================================="
echo ""

if [ ! -f "venv/bin/python" ]; then
    echo "[*] Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "[*] Installing dependencies..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "[*] Validating corpus and PDF generation..."
python backend/scripts/build_corpus.py

echo ""
echo "===================================================================="
echo "  Starting FastAPI Server on http://127.0.0.1:8000"
echo "  Open http://127.0.0.1:8000 in your browser"
echo "===================================================================="
echo ""

python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
