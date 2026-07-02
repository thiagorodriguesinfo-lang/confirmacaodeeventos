#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Bootstrap do VPS — configuracao inicial (rodar UMA UNICA VEZ, como root, em
# um Ubuntu 22.04/24.04 limpo) para hospedar o sistema de Confirmacao de
# Eventos (RSVP via WhatsApp).
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/thiagorodriguesinfo-lang/confirmacaodeeventos/main/scripts/bootstrap-vps.sh -o bootstrap-vps.sh
#   bash bootstrap-vps.sh
#
# Depois deste script rodar com sucesso, os proximos deploys acontecem
# automaticamente via GitHub Actions (.github/workflows/deploy.yml) a cada
# push na branch "main" — nao e mais preciso mexer no servidor manualmente.
# ==============================================================================

REPO_URL="${REPO_URL:-https://github.com/thiagorodriguesinfo-lang/confirmacaodeeventos.git}"
BRANCH="${BRANCH:-main}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/confirmacaodeeventos}"

# Chave publica do par gerado para o GitHub Actions conectar via SSH e fazer
# o deploy automatico. A privada correspondente deve ser cadastrada como o
# secret VPS_SSH_KEY no repositorio (ver README / instrucoes do chat).
DEPLOY_PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHY/FrxzVafgXe0VQY9nw3rk4no3HqDohQqeSvCO2l+U github-actions-deploy@confirmacaodeeventos"

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode este script como root (sudo bash bootstrap-vps.sh)." >&2
  exit 1
fi

echo "==> Atualizando pacotes..."
apt-get update -y
apt-get upgrade -y

echo "==> Instalando dependencias basicas..."
apt-get install -y ca-certificates curl gnupg git ufw openssl

echo "==> Instalando Docker Engine + Compose plugin..."
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "Docker ja instalado, pulando."
fi

echo "==> Configurando firewall (ufw)..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Autorizando a chave de deploy do GitHub Actions..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
grep -qxF "$DEPLOY_PUBLIC_KEY" ~/.ssh/authorized_keys || echo "$DEPLOY_PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo "==> Clonando/atualizando o repositorio em $DEPLOY_DIR..."
if [ -d "$DEPLOY_DIR/.git" ]; then
  cd "$DEPLOY_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
fi

if [ ! -f .env ]; then
  echo "==> Criando .env a partir do .env.example..."
  cp .env.example .env
  sed -i "s#NEXTAUTH_SECRET=.*#NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"#" .env
  sed -i "s#JWT_SECRET=.*#JWT_SECRET=\"$(openssl rand -base64 32)\"#" .env
  echo
  echo "!!! IMPORTANTE: edite $DEPLOY_DIR/.env agora e configure pelo menos:"
  echo "    - NEXT_PUBLIC_APP_URL e NEXTAUTH_URL (dominio ou http://<IP-do-VPS>:3000)"
  echo "    - WHATSAPP_PROVIDER e as credenciais do provider escolhido (Meta ou Evolution API)"
  echo "    - Dados do Supabase, se for usar"
  echo
  read -r -p "Pressione ENTER depois de editar o .env (nano .env) para continuar... " _
fi

echo "==> Subindo os containers (app + worker + postgres)..."
docker compose up -d --build

echo "==> Aguardando o Postgres ficar pronto..."
sleep 10

echo "==> Rodando migrations e seed inicial..."
docker compose exec -T app npx prisma migrate deploy
docker compose exec -T app npm run prisma:seed || true

echo
echo "============================================================"
echo " Deploy inicial concluido!"
echo " Acesse: http://<IP-do-VPS>:3000"
echo " Login padrao: admin@confirmacaodeeventos.com / admin123 (troque a senha!)"
echo
echo " Proximos passos:"
echo " 1. Configure os secrets VPS_HOST, VPS_USER, VPS_PORT e VPS_SSH_KEY"
echo "    no GitHub (Settings > Secrets and variables > Actions)."
echo " 2. (Opcional) Rode scripts/setup-nginx-ssl.sh para HTTPS com dominio proprio."
echo " 3. A partir de agora, cada push na branch main faz deploy automatico."
echo "============================================================"
