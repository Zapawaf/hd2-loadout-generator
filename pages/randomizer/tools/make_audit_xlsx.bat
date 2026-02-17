@echo off
setlocal ENABLEDELAYEDEXPANSION

echo ----------------------------------------
echo HD2 Audit ^> Excel Workbook Generator
echo ----------------------------------------

REM Find item CSV
set "ITEMS="
for %%f in (hd2_audit_items_*.csv) do (
  set "ITEMS=%%f"
  goto :found_items
)

:found_items
if "%ITEMS%"=="" (
  echo ERROR: No hd2_audit_items_*.csv found
  pause
  exit /b 1
)

REM Find tag CSV (optional)
set "TAGS="
for %%f in (hd2_audit_tags_*.csv) do (
  set "TAGS=%%f"
  goto :found_tags
)

:found_tags

REM Find slot1 stratagem CSV (optional)
set "SLOT1="
for %%f in (hd2_audit_strat_slot1_*.csv) do (
  set "SLOT1=%%f"
  goto :found_slot1
)

:found_slot1

REM Build output filename
set "OUT=%ITEMS:hd2_audit_items_=hd2_audit_%"
set "OUT=%OUT:.csv=.xlsx%"

echo Items CSV : %ITEMS%
if not "%TAGS%"=="" (
  echo Tags CSV  : %TAGS%
) else (
  echo Tags CSV  : (none)
)
if not "%SLOT1%"=="" (
  echo Slot1 CSV : %SLOT1%
) else (
  echo Slot1 CSV : (none)
)
echo Output XLSX: %OUT%
echo.

REM Run Python
REM NOTE: In Windows cmd.exe, do NOT use backslash-escaped quotes (\") inside variables.
REM Use plain quotes so argparse receives clean paths.
set "CMD=python make_audit_xlsx.py --items "%ITEMS%" --out "%OUT%""
if not "%TAGS%"=="" (
  set "CMD=!CMD! --tags "%TAGS%""
)
if not "%SLOT1%"=="" (
  set "CMD=!CMD! --slot1 "%SLOT1%""
)

call %CMD%

echo.
echo Done.
pause
