@echo off
setlocal

REM === Set variables ===
set "URL=https://hr.ttfic.com.tw/public/release.zip"
set "FILENAME=release.zip"

REM === Download the file ===
echo Downloading %URL% ...
powershell -Command "Invoke-WebRequest -Uri '%URL%' -OutFile '%FILENAME%'" || (
    echo [ERROR] Failed to download %URL%
    pause
    exit /b 1
)

REM === Extract the ZIP file ===
echo Extracting %FILENAME% ...
7za.exe x "%FILENAME%" -o"./" -y

REM === Done ===
echo Done.
pause
endlocal
