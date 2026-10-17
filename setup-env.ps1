# FieldProof PowerShell Environment Setup

# 1. Load variables from .env if present
if (Test-Path "$PSScriptRoot\.env") {
    Get-Content "$PSScriptRoot\.env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line -match "^\s*([A-Za-z0-9_]+)\s*=\s*[`"']?([^`"'\r\n]+)[`"']?\s*$") {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
}

# 2. Defaults if not specified in .env or environment
if (-not $env:FIELDPROOF_GCP_PROJECT) { $env:FIELDPROOF_GCP_PROJECT = "fieldproof-prod" }
if (-not $env:FIELDPROOF_VERTEX_LOCATION) { $env:FIELDPROOF_VERTEX_LOCATION = "global" }
if (-not $env:FIELDPROOF_GEMINI_MODEL) { $env:FIELDPROOF_GEMINI_MODEL = "gemini-3-flash-preview" }
if (-not $env:CR_REGION) { $env:CR_REGION = "asia-south1" }

Write-Host "FieldProof environment variables loaded:" -ForegroundColor Green
Write-Host "  FIELDPROOF_GCP_PROJECT     = $env:FIELDPROOF_GCP_PROJECT" -ForegroundColor Cyan
Write-Host "  FIELDPROOF_VERTEX_LOCATION = $env:FIELDPROOF_VERTEX_LOCATION" -ForegroundColor Cyan
Write-Host "  FIELDPROOF_GEMINI_MODEL    = $env:FIELDPROOF_GEMINI_MODEL" -ForegroundColor Cyan
Write-Host "  CR_REGION                  = $env:CR_REGION" -ForegroundColor Cyan
if ($env:GEMINI_API_KEY) {
    Write-Host "  GEMINI_API_KEY             = [Configured from .env]" -ForegroundColor Cyan
}
