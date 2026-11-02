#!/bin/bash
# Runs once, the first time the Oracle container starts.
# Connects as the application user (not SYS) so every table, view and
# package is owned by STOCKTRACK.
set -e

for f in /opt/stocktrack-sql/*.sql; do
  echo "StockTrack: running $f"
  sqlplus -s "${APP_USER}/${APP_USER_PASSWORD}@//localhost/FREEPDB1" <<EOF
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET DEFINE OFF
@$f
EXIT
EOF
done
