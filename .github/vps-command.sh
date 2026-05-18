#!/bin/bash
set -e
echo "=== SSH OK: $(whoami)@$(hostname) ==="
pm2 list
docker ps --format 'table {{.Names}}\t{{.Status}}'
