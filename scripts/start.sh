#!/usr/bin/env bash
# ==============================================================================
# Quick-start script for FieldProof (Backend + Frontend)
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${HOME}/fieldproof.env"
if [[ -f "$ENV_FILE" ]]; then
    echo "==> Sourcing environment from $ENV_FILE..."
    # shellcheck disable=SC1090
    source "$ENV_FILE"
fi

echo "=================================================="
echo " Starting FieldProof Platform"
echo " Backend:  http://localhost:8080"
echo " Frontend: http://localhost:5173"
echo "=================================================="

# Start backend in background
echo "==> Launching Spring Boot backend on port 8080..."
./mvnw spring-boot:run -pl backend &
BACKEND_PID=$!

# Trap Ctrl+C to terminate backend process
trap 'echo "==> Stopping FieldProof services..."; kill $BACKEND_PID 2>/dev/null || true; exit 0' SIGINT SIGTERM

# Start frontend in foreground
echo "==> Launching Vite frontend on port 5173..."
npm run dev --prefix frontend

# Wait for background process if frontend stops
wait $BACKEND_PID
