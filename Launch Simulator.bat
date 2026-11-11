@echo off
title All-22 Football Simulator
cd /d "%~dp0"

echo ===================================================
echo   ALL-22 CHESS // TACTICAL KINEMATIC SIMULATOR
echo ===================================================
echo.

if not exist "node_modules" (
    echo [1/2] Installing required components...
    call npm install
)

echo [2/2] Opening All-22 Simulator in your default browser...
start "" "http://localhost:5173"

echo.
echo Server active! Leave this window open while playing.
echo To close, simply close this window.
echo.

call npm run dev
