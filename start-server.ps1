# Quick-start script for FieldProof Spring Boot & Frontend
$env:JAVA_HOME = "C:\Users\giris\AppData\Local\Programs\Microsoft\jdk-25.0.4.101-hotspot"
$env:Path = "$env:JAVA_HOME\bin;C:\Users\giris\Downloads\apache-maven-3.10.0-bin\apache-maven-3.10.0\bin;$env:Path"

# FieldProof Environment Variables
if (-not $env:FIELDPROOF_GCP_PROJECT) { $env:FIELDPROOF_GCP_PROJECT = "fieldproof-prod" }
if (-not $env:FIELDPROOF_VERTEX_LOCATION) { $env:FIELDPROOF_VERTEX_LOCATION = "global" }
if (-not $env:FIELDPROOF_GEMINI_MODEL) { $env:FIELDPROOF_GEMINI_MODEL = "gemini-3-flash-preview" }
if (-not $env:CR_REGION) { $env:CR_REGION = "asia-south1" }

# Load GEMINI_API_KEY from .env if present (never hardcode in repo)
if (Test-Path "$PSScriptRoot\.env") {
    Get-Content "$PSScriptRoot\.env" | ForEach-Object {
        if ($_ -match "^\s*GEMINI_API_KEY\s*=\s*[`"']?([^`"'\s]+)[`"']?\s*$") {
            $env:GEMINI_API_KEY = $matches[1].Trim()
        }
    }
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host "Starting FieldProof Spring Boot Application..." -ForegroundColor Cyan
Write-Host "Java: $env:JAVA_HOME" -ForegroundColor DarkGray
Write-Host "Project: $env:FIELDPROOF_GCP_PROJECT" -ForegroundColor DarkGray
Write-Host "Model: $env:FIELDPROOF_GEMINI_MODEL" -ForegroundColor DarkGray
Write-Host "Serving on: http://localhost:8080" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green

.\mvnw.cmd spring-boot:run -pl backend
