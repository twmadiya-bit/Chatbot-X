#!/bin/bash
# Test connection and show system status
echo "=== SSH CONNECTION OK ==="
whoami
echo ""
echo "=== PM2 STATUS ==="
pm2 list
echo ""
echo "=== SERVICES ==="
docker ps --format 'table {{.Names}}\t{{.Status}}'
echo ""
echo "=== DISK ==="
df -h / | tail -1
