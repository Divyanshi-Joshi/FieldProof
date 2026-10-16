# Quick-start script for FieldProof Spring Boot & Frontend
$env:JAVA_HOME = "C:\Users\giris\AppData\Local\Programs\Microsoft\jdk-25.0.4.101-hotspot"
$env:Path = "$env:JAVA_HOME\bin;C:\Users\giris\Downloads\apache-maven-3.10.0-bin\apache-maven-3.10.0\bin;$env:Path"

Write-Host "==================================================" -ForegroundColor Green
Write-Host "Starting FieldProof Spring Boot Application..." -ForegroundColor Cyan
Write-Host "Java: $env:JAVA_HOME" -ForegroundColor DarkGray
Write-Host "Serving on: http://localhost:8080" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green

mvn spring-boot:run
