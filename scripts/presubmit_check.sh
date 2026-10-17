#!/usr/bin/env bash
# scripts/presubmit_check.sh
# Verifies all build, security, and integrity requirements prior to deploy or submission (Day 4 §T4.4)
set -eo pipefail

echo "=================================================="
echo "      FieldProof Presubmit Verification Suite      "
echo "=================================================="

echo "[1/4] Running Maven build and automated tests..."
./mvnw -q test

echo "[2/4] Scanning for accidentally committed API keys or private keys..."
if git grep -nIE 'AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|"private_key"' -- ':!scripts/presubmit_check.sh'; then
    echo "ERROR: Potential secrets found in repository!"
    exit 1
fi

echo "[3/4] Verifying no raw dataset photos are staged in git..."
if git ls-files | grep -Ei 'data/.*(jpg|jpeg|png|heic)$'; then
    echo "ERROR: Dataset image files detected in git tracked files!"
    exit 1
fi

echo "[4/4] Verifying FreezeGuard manifest integrity..."
# Run maven test specifically for FreezeGuard
./mvnw -q test -Dtest=FreezeGuardTest

echo "=================================================="
echo "  SUCCESS: All presubmit verification checks pass!"
echo "=================================================="
