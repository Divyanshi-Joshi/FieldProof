#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " FieldProof: Orbit-to-Field Google Earth Engine Connector"
echo "=========================================================="

python3 scripts/orbit_to_field_gee.py --plot-id P-0142 --lat -1.8021 --lon 37.6253
