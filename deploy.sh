#!/usr/bin/env bash
# ============================================================
#  Chatbot-X  —  VPS Deploy Script
#  Safe to run on servers with existing services.
#  Only adds new Docker containers + one Nginx vhost.
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()   { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
APP_DIR="/opt/chatbot-x"
REPO_URL="https://github.com/twmadiya-bit/chatbot-x.git"
BRANCH="claude/saas-chatbot-platform-o6Isq"
DOMAIN="${DOMAIN:-chatbot.profitx.online}"
API_PORT=3100          # internal port for NestJS API  (won't conflict with :3000)
DASH_PORT=3101         # internal port for Next.js dashboard
PG_PORT=5433           # internal postgres  (won't conflict with existing :5432)
REDIS_PORT=6380        # internal redis     (won't conflict with existing :6379)
PG_USER=chatbotx
PG_DB=chatbotx

# ── 1. Audit what's live ──────────────────────────────────────────────────────
info "Auditing existing services..."
echo ""
echo "  Docker containers:"
docker ps --format '    {{.Names}}  ({{.Image}})  {{.Ports}}' 2>/dev/null || echo "    docker not running"
echo ""
echo "  Listening ports:"
ss -tlnp 2>/dev/null | grep LISTEN | awk '{print "    "$4}' || true
echo ""
echo "  Nginx sites:"
ls /etc/nginx/sites-enabled/ 2>/dev/null | awk '{print "    "$0}' || echo "    none"
echo ""

# ── 2. Install dependencies ───────────────────────────────────────────────────
info "Checking system dependencies..."

# Node.js 22
if ! node --version 2>/dev/null | grep -q "v2[2-9]"; then
  info "Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -y nodejs >/dev/null 2>&1
  ok "Node.js $(node --version) installed"
else
  ok "Node.js $(node --version) already present"
fi

# pnpm
if ! command -v pnpm &>/dev/null; then
  info "Installing pnpm..."
  npm install -g pnpm >/dev/null 2>&1
  ok "pnpm $(pnpm --version) installed"
else
  ok "pnpm $(pnpm --version) already present"
fi

# pm2
if ! command -v pm2 &>/dev/null; then
  info "Installing pm2..."
  npm install -g pm2 >/dev/null 2>&1
  ok "pm2 installed"
else
  ok "pm2 already present"
fi

# Docker
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | bash >/dev/null 2>&1
  systemctl enable docker && systemctl start docker
  ok "Docker installed"
else
  ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') already present"
fi

# ── 3. Generate secrets ───────────────────────────────────────────────────────
PG_PASS=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 48)
JWT_REFRESH_SECRET=$(openssl rand -hex 48)
ENCRYPTION_KEY=$(openssl rand -hex 16)   # 32 hex chars = 32 bytes

# ── 4. Create directory structure ─────────────────────────────────────────────
info "Setting up $APP_DIR..."
mkdir -p "$APP_DIR"/{data/postgres,data/redis,app}

# ── 5. Docker Compose for Postgres + Redis ────────────────────────────────────
info "Writing docker-compose.yml (isolated ports $PG_PORT / $REDIS_PORT)..."
cat > "$APP_DIR/docker-compose.yml" <<DCEOF
version: '3.9'
services:
  chatbotx-postgres:
    image: pgvector/pgvector:pg16
    container_name: chatbotx-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${PG_USER}
      POSTGRES_PASSWORD: ${PG_PASS}
      POSTGRES_DB: ${PG_DB}
    volumes:
      - ${APP_DIR}/data/postgres:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:${PG_PORT}:5432"

  chatbotx-redis:
    image: redis:7-alpine
    container_name: chatbotx-redis
    restart: unless-stopped
    volumes:
      - ${APP_DIR}/data/redis:/data
    ports:
      - "127.0.0.1:${REDIS_PORT}:6379"
DCEOF

info "Starting Postgres + Redis containers..."
docker compose -f "$APP_DIR/docker-compose.yml" up -d
sleep 5

# Verify
docker ps | grep chatbotx-postgres &>/dev/null && ok "chatbotx-postgres running" || die "Postgres failed to start"
docker ps | grep chatbotx-redis &>/dev/null && ok "chatbotx-redis running" || die "Redis failed to start"

# ── 6. Clone / update repo ────────────────────────────────────────────────────
info "Cloning repository..."
if [ -d "$APP_DIR/app/.git" ]; then
  info "Repo exists — pulling latest..."
  git -C "$APP_DIR/app" fetch origin
  git -C "$APP_DIR/app" checkout "$BRANCH"
  git -C "$APP_DIR/app" pull origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR/app"
fi
ok "Repo ready at $APP_DIR/app"

# ── 7. Write .env files ───────────────────────────────────────────────────────
info "Writing environment files..."
cat > "$APP_DIR/app/apps/api/.env" <<ENVEOF
DATABASE_URL=postgresql://${PG_USER}:${PG_PASS}@localhost:${PG_PORT}/${PG_DB}
REDIS_URL=redis://localhost:${REDIS_PORT}

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

ENCRYPTION_KEY=${ENCRYPTION_KEY}

DASHBOARD_URL=https://${DOMAIN}
PORT=${API_PORT}
NODE_ENV=production
ENVEOF

cat > "$APP_DIR/app/apps/dashboard/.env.local" <<ENVEOF
NEXT_PUBLIC_API_URL=https://api.${DOMAIN}
ENVEOF

# Save secrets to a safe file
cat > "$APP_DIR/secrets.txt" <<SECEOF
# Chatbot-X secrets — keep this file safe, do not share
Generated: $(date)
PG_PASS=${PG_PASS}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
SECEOF
chmod 600 "$APP_DIR/secrets.txt"
ok "Secrets saved to $APP_DIR/secrets.txt"

# ── 8. Install, migrate, build ────────────────────────────────────────────────
cd "$APP_DIR/app"

# Prisma CLI looks for .env in packages/database/, not apps/api/
cp "$APP_DIR/app/apps/api/.env" "$APP_DIR/app/packages/database/.env"

info "Installing Node dependencies..."
pnpm install --frozen-lockfile

info "Approving build scripts (prisma, bcrypt, sharp, esbuild)..."
pnpm approve-builds --yes 2>/dev/null || true

info "Generating Prisma client..."
pnpm db:generate

info "Running database migrations..."
pnpm --filter @chatbot-x/database migrate:deploy

info "Building all packages (this takes 2-5 min)..."
pnpm build

ok "Build complete"

# ── 9. PM2 process config ─────────────────────────────────────────────────────
info "Writing PM2 ecosystem file..."
cat > "$APP_DIR/ecosystem.config.js" <<PM2EOF
module.exports = {
  apps: [
    {
      name: 'chatbot-api',
      script: '${APP_DIR}/app/apps/api/dist/main.js',
      cwd: '${APP_DIR}/app/apps/api',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production', PORT: ${API_PORT} },
    },
    {
      name: 'chatbot-dashboard',
      script: 'node_modules/.bin/next',
      args: 'start -p ${DASH_PORT}',
      cwd: '${APP_DIR}/app/apps/dashboard',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production', PORT: ${DASH_PORT} },
    },
  ],
};
PM2EOF

info "Starting apps with PM2..."
pm2 start "$APP_DIR/ecosystem.config.js"
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

ok "PM2 processes started"
pm2 list

# ── 10. Nginx vhost ───────────────────────────────────────────────────────────
if command -v nginx &>/dev/null; then
  info "Adding Nginx vhosts for $DOMAIN..."

  cat > "/etc/nginx/sites-available/chatbot-dashboard" <<NGXEOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:${DASH_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGXEOF

  cat > "/etc/nginx/sites-available/chatbot-api" <<NGXEOF
server {
    listen 80;
    server_name api.${DOMAIN};
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$http_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGXEOF

  # Enable only if not already linked
  [ -L /etc/nginx/sites-enabled/chatbot-dashboard ] || ln -s /etc/nginx/sites-available/chatbot-dashboard /etc/nginx/sites-enabled/
  [ -L /etc/nginx/sites-enabled/chatbot-api ]       || ln -s /etc/nginx/sites-available/chatbot-api /etc/nginx/sites-enabled/

  nginx -t && systemctl reload nginx
  ok "Nginx configured for $DOMAIN and api.$DOMAIN"

  # SSL
  if command -v certbot &>/dev/null; then
    info "Requesting SSL certificates..."
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}" || warn "SSL for $DOMAIN failed — point DNS first then run: certbot --nginx -d $DOMAIN"
    certbot --nginx -d "api.$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}" || warn "SSL for api.$DOMAIN failed — run: certbot --nginx -d api.$DOMAIN"
  else
    warn "certbot not found — install it: apt install certbot python3-certbot-nginx"
  fi
else
  warn "Nginx not found. Install it: apt install nginx"
  info "Then run: bash $APP_DIR/nginx-setup.sh"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Chatbot-X deployment complete!              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Dashboard  →  http://${DOMAIN}  (HTTPS after DNS propagation)"
echo "  API        →  http://api.${DOMAIN}"
echo ""
echo "  Secrets    →  $APP_DIR/secrets.txt"
echo "  Logs       →  pm2 logs"
echo "  Status     →  pm2 list"
echo ""
echo "  DNS records to add in Hostinger:"
echo "    A  @              $(curl -s ifconfig.me)"
echo "    A  www            $(curl -s ifconfig.me)"
echo "    A  api            $(curl -s ifconfig.me)"
echo ""
echo -e "${YELLOW}  ⚠  Change your root password now:  passwd${NC}"
