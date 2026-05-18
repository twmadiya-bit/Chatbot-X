#!/bin/bash
echo '=== SSH OK ==='
whoami
pm2 list
docker ps --format 'table {{.Names}}\t{{.Status}}'
