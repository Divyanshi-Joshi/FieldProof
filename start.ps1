# FieldProof Windows Launch Script (Backend + Frontend)
. "$PSScriptRoot\setup-env.ps1"

Write-Host "==================================================" -ForegroundColor Green
Write-Host " Starting FieldProof Platform (Windows)" -ForegroundColor Cyan
Write-Host " Backend:  http://localhost:8080" -ForegroundColor Yellow
Write-Host " Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green

Write-Host "==> Starting Spring Boot backend in a separate window..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$PSScriptRoot\start-server.ps1`""

Write-Host "==> Starting Vite frontend dev server..." -ForegroundColor Cyan
npm run dev --prefix frontend
