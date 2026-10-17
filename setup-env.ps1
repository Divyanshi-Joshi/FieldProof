# FieldProof PowerShell Environment Setup
if (-not $env:FIELDPROOF_GCP_PROJECT) { $env:FIELDPROOF_GCP_PROJECT = "fieldproof-prod" }
if (-not $env:FIELDPROOF_VERTEX_LOCATION) { $env:FIELDPROOF_VERTEX_LOCATION = "global" }
if (-not $env:FIELDPROOF_GEMINI_MODEL) { $env:FIELDPROOF_GEMINI_MODEL = "gemini-3-flash-preview" }
if (-not $env:CR_REGION) { $env:CR_REGION = "asia-south1" }

# Load GEMINI_API_KEY from .env if present
if (Test-Path "$PSScriptRoot\.env") {
    Get-Content "$PSScriptRoot\.env" | ForEach-Object {
        if ($_ -match "^\s*GEMINI_API_KEY\s*=\s*[`"']?([^`"'\s]+)[`"']?\s*$") {
            $env:GEMINI_API_KEY = $matches[1].Trim()
        }
    }
}

Write-Host "FieldProof environment variables loaded:" -ForegroundColor Green
Write-Host "  FIELDPROOF_GCP_PROJECT     = $env:FIELDPROOF_GCP_PROJECT" -ForegroundColor Cyan
Write-Host "  FIELDPROOF_VERTEX_LOCATION = $env:FIELDPROOF_VERTEX_LOCATION" -ForegroundColor Cyan
Write-Host "  FIELDPROOF_GEMINI_MODEL    = $env:FIELDPROOF_GEMINI_MODEL" -ForegroundColor Cyan
Write-Host "  CR_REGION                  = $env:CR_REGION" -ForegroundColor Cyan
if ($env:GEMINI_API_KEY) {
    Write-Host "  GEMINI_API_KEY             = [Configured from .env]" -ForegroundColor Cyan
}
