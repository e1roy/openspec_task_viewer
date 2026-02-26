@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

set /p VERSION=<version.txt
for /f "tokens=* delims= " %%a in ("%VERSION%") do set VERSION=%%a

echo Building OpenSpec Task Viewer v%VERSION% ...

:: Update version in package.json
powershell -Command "(Get-Content package.json) -replace '\"version\": \".*\"', '\"version\": \"%VERSION%\"' | Set-Content package.json"

:: Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo npm install failed.
    exit /b 1
)

:: Compile TypeScript
echo Compiling TypeScript...
call npm run compile
if %errorlevel% neq 0 (
    echo Compile failed.
    exit /b 1
)

:: Package as VSIX
echo Packaging VSIX...
call npx @vscode/vsce package --no-dependencies --allow-missing-repository --no-rewrite-relative-links
if %errorlevel% neq 0 (
    echo VSIX packaging failed.
    exit /b 1
)

set OUTPUT_FILE=openspec-task-viewer-%VERSION%.vsix
if exist "%OUTPUT_FILE%" (
    echo.
    echo Build successful!
    echo Output: %OUTPUT_FILE%
) else (
    echo Build failed: %OUTPUT_FILE% not found.
    exit /b 1
)

endlocal
