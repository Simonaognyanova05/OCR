#!/bin/sh
set -eu

if command -v freshclam >/dev/null 2>&1; then
  freshclam --stdout || echo "ClamAV signature update failed; continuing with the bundled database if available."
fi

exec npm start
