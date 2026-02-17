@echo off
setlocal

set "PY=python"
set "SCRIPT=generate_profile_js_from_xlsx_v2.py"
set "XLSX=HD2_Profile_Tuner_Condensed.xlsx"

echo === HD2 Profile Generator ===
echo Current folder: %CD%
echo Script: %SCRIPT%
echo XLSX:   %XLSX%
echo.

if not exist "%SCRIPT%" (
  echo ERROR: Missing "%SCRIPT%" in this folder.
  pause
  exit /b 1
)

if not exist "%XLSX%" (
  echo ERROR: Missing "%XLSX%" in this folder.
  pause
  exit /b 1
)

set /p PROFILE=Enter profile name (automatons / terminids / illuminate / random): 
if "%PROFILE%"=="" (
  echo No profile entered. Exiting.
  pause
  exit /b 1
)

if not exist "_generated" mkdir "_generated"

set "OUT=_generated\%PROFILE%.profile.js"

echo.
echo Running:
echo %PY% "%SCRIPT%" "%XLSX%" "%OUT%"
echo.

%PY% "%SCRIPT%" "%XLSX%" "%OUT%"
set "ERR=%ERRORLEVEL%"

echo.
echo Python exit code: %ERR%
if not "%ERR%"=="0" (
  echo ERROR: Generator failed. Output was not created.
  pause
  exit /b %ERR%
)

if not exist "%OUT%" (
  echo ERROR: Generator reported success but output file is missing: "%OUT%"
  pause
  exit /b 1
)

echo SUCCESS: Wrote "%OUT%"
pause
endlocal
