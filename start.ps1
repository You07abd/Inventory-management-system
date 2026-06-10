$root = $PSScriptRoot

Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "Set-Location '$root\backend'; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"

Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "Set-Location '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "All services starting up:" -ForegroundColor Green
Write-Host "  App    -> http://localhost:5173" -ForegroundColor White
Write-Host "  API    -> http://localhost:8000" -ForegroundColor White
Write-Host "  Docs   -> http://localhost:8000/docs" -ForegroundColor White
