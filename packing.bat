@echo off
echo =====================================
echo Packing project to release.zip ...
echo =====================================

REM 設定輸出檔案名稱
set OUTPUT=release.zip

REM 刪除舊的壓縮檔（如果存在）
if exist %OUTPUT% del %OUTPUT%

REM 使用 7za 壓縮當前目錄的內容，排除特定資料夾和檔案
7za a -tzip %OUTPUT% * -xr!database -xr!.vscode -xr!data -xr!node_modules -x!.env -x!.gitignore -x!%OUTPUT% -xr!.git -x!README.md -x!test.html -xr!dist -x!7za.exe -xr!example -xr!uploads

echo =====================================
echo Done! Output: %OUTPUT%
echo =====================================
pause
