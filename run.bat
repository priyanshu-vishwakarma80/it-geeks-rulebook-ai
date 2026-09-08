@echo off
echo ====================================================================
echo   The Rulebook That Argues With Itself - Apex Institute Q&A Engine
echo   IT Geeks Placement Round
echo ====================================================================
echo.

IF NOT EXIST "venv\Scripts\python.exe" (
    echo [*] Virtual environment not found. Creating venv...
    py -m venv venv
    call .\venv\Scripts\activate
    echo [*] Installing required dependencies...
    pip install -r requirements.txt
) ELSE (
    call .\venv\Scripts\activate
)

echo [*] Validating corpus and PDF generation...
python backend\scripts\build_corpus.py

echo.
echo ====================================================================
echo   Starting FastAPI Server on http://127.0.0.1:8000
echo   Open your browser to http://127.0.0.1:8000 to view the Dashboard
echo   Press Ctrl+C to stop the server
echo ====================================================================
echo.

python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
