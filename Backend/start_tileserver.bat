@echo off
cd /d "%~dp0"
echo --- Starting GridVision Tile Server ---

:: 1. Read variables from .env (Located in Backend folder)
if exist .env (
    for /f "usebackq tokens=1* delims==" %%A in (".env") do set %%A=%%B
) else (
    echo ERROR: .env file not found in Backend folder!
    pause
    exit /b
)

:: 2. Construct the Database URL
set DATABASE_URL=postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%

:: 3. Switch to 'bin' folder and run
if exist "bin\pg_tileserv.exe" (
    cd bin
    echo Connecting to: postgresql://%DB_USER%:****@%DB_HOST%:%DB_PORT%/%DB_NAME%
    pg_tileserv.exe
) else (
    echo ERROR: pg_tileserv.exe not found in 'Backend/bin' folder.
    echo Please download it and place it there.
    pause
)