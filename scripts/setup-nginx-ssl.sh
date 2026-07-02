#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Configura Nginx como proxy reverso na frente do app (porta 3000) e emite um
# certificado HTTPS gratuito via Let's Encrypt (Certbot).
#
# Pre-requisito: o dominio informado ja deve estar apontando (registro DNS A)
# para o IP deste VPS.
#
# Uso:
#   DOMAIN=meudominio.com EMAIL=voce@exemplo.com bash scripts/setup-nginx-ssl.sh
# ==============================================================================

DOMAIN="${DOMAIN:?Defina a variavel DOMAIN, ex: DOMAIN=meudominio.com EMAIL=voce@exemplo.com bash setup-nginx-ssl.sh}"
EMAIL="${EMAIL:?Defina a variavel EMAIL para o cadastro no Let's Encrypt}"
APP_PORT="${APP_PORT:-3000}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode este script como root." >&2
  exit 1
fi

echo "==> Instalando Nginx e Certbot..."
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Criando configuracao do site para $DOMAIN..."
cat > "/etc/nginx/sites-available/$DOMAIN" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
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
EOF

ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t
systemctl reload nginx

echo "==> Emitindo certificado HTTPS via Let's Encrypt..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo "==> Configurando renovacao automatica..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo
echo "============================================================"
echo " HTTPS configurado! Acesse: https://$DOMAIN"
echo
echo " Lembre-se de atualizar no .env do projeto (e reiniciar os containers):"
echo "   NEXT_PUBLIC_APP_URL=\"https://$DOMAIN\""
echo "   NEXTAUTH_URL=\"https://$DOMAIN\""
echo "============================================================"
