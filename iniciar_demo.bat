@echo off
chcp 65001 >nul
echo =========================================================
echo   Conferencia de Titulos - Aplicacao Unificada (Demo)
echo =========================================================
echo [1/2] Compilando interface web (React)...
call npm.cmd run build
if errorlevel 1 (
  echo Falha ao compilar o frontend.
  pause
  exit /b 1
)
echo [2/2] Iniciando servidor unificado (Frontend + API IA) em http://127.0.0.1:5173 ...
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 5173
