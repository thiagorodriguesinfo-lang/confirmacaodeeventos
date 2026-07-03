# Confirmação de Eventos — RSVP via WhatsApp

Plataforma completa de confirmação de presença (RSVP) para eventos, com
importação de convidados pelo WhatsApp, chatbot de confirmação automática,
painel administrativo e página pública de convite.

## Stack

Next.js 14 (App Router) · TypeScript · TailwindCSS · Prisma ORM · PostgreSQL
(Supabase) · React Hook Form · Zod · TanStack Query · Server Actions · Docker

## Arquitetura

O projeto segue **Clean Architecture** com Repository Pattern e Use Cases,
para manter a lógica de negócio independente de framework/infra:

```
src/
  core/                     # Domínio — nao depende de Next.js nem de Prisma diretamente
    dtos/                   # Data Transfer Objects
    repositories/           # Interfaces (contratos) de persistência
    services/                # Regras de negocio puras (parsers, NLP, state machine, templates)
    use-cases/               # Orquestracao de regras de negocio
      events/ guests/ chatbot/ dispatch/ dashboard/ export/ auth/
  infrastructure/           # Implementações concretas
    database/                # Repositórios Prisma
    whatsapp/                 # WhatsappProvider (Meta Cloud API / Evolution API)
    queue/                     # Worker de disparo em lote
    container.ts               # Composition root (injeção de dependência simples)
  actions/                  # Server Actions (ponte entre UI e use-cases)
  app/                      # Rotas Next.js (App Router)
  components/               # Componentes de UI (design system próprio, Tailwind + Radix)
  lib/                      # Auth, validações Zod, utilitários
prisma/
  schema.prisma             # events, guests, companions, messages, imports, import_logs,
                             # conversation_states, whatsapp_logs, users, dispatch_jobs...
```

### Por que essa organização

- **Repository Pattern**: `core/repositories/*.ts` define interfaces; `infrastructure/database/prisma-*.repository.ts`
  implementa com Prisma. Os use-cases dependem apenas das interfaces.
- **WhatsappProvider**: uma única interface (`infrastructure/whatsapp/whatsapp-provider.interface.ts`)
  com métodos `sendText`, `sendImage`, `sendTemplate`, `sendButtons`, `receiveWebhook`,
  `markAsRead`, `sendTyping`. Duas implementações prontas — `MetaCloudApiProvider` e
  `EvolutionApiProvider` — selecionadas via `WHATSAPP_PROVIDER` no `.env` (`whatsapp-provider.factory.ts`).
  Trocar de provedor não exige alterar nenhuma outra camada da aplicação.
- **Use Cases**: cada ação de negócio relevante (criar evento, importar contatos, aprovar
  importação, processar resposta do chatbot, criar disparo, exportar lista...) é uma classe
  isolada e testável em `core/use-cases`.

## Módulos implementados

| Módulo | Onde está | Observações |
|---|---|---|
| Eventos (CRUD + mensagens configuráveis) | `app/(dashboard)/dashboard/events`, `core/use-cases/events` | Variáveis `{{nome}} {{evento}} {{data}} {{hora}} {{local}} {{maps}} {{link}}` |
| Importação (manual, CSV, Excel, colar lista) | `core/use-cases/guests/import-guests.use-case.ts` | Sempre cai em fila de revisão (`ImportLog`) |
| Importação via WhatsApp (contatos/VCard/texto) | `core/use-cases/guests/import-from-whatsapp-contacts.use-case.ts`, `core/services/vcard-parser.service.ts`, `core/services/contact-text-parser.service.ts` | Nunca dispara mensagem automaticamente — só entra na fila |
| Fila "Contatos recebidos" (revisão/edição/aprovação) | `app/(dashboard)/dashboard/events/[id]/imports` | Aprovar, editar antes de aprovar, rejeitar |
| Convidados (status, timeline, acompanhantes) | `core/repositories/guest.repository.ts`, `prisma/schema.prisma` (`Guest`, `Companion`, `TimelineEvent`) | |
| Disparo em lote com rate limit | `core/use-cases/dispatch`, `infrastructure/queue/dispatch-worker.ts` | Pausar/retomar/cancelar; processo Node separado (`npm run worker:dispatch`) |
| Chatbot de RSVP (máquina de estados) | `core/services/rsvp-state-machine.ts` | Estados: `AWAITING_CONFIRMATION → AWAITING_PEOPLE → AWAITING_NAMES → AWAITING_AGES → COMPLETED / DECLINED` |
| Interpretação de linguagem natural | `core/services/nlp-intent.service.ts` | Regras para "sim/não/vou/não vou/vamos em quatro/eu e minha esposa"... |
| Painel administrativo (dashboard, gráficos, filtros) | `app/(dashboard)/dashboard`, `components/dashboard` | Recharts: evolução diária + distribuição por status |
| Exportação (Excel/CSV/PDF, várias ordenações) | `core/use-cases/export/export-guests.use-case.ts`, `app/api/exports/[eventId]` | alfabética, por confirmação, por idade, lista de buffet |
| Página pública de convite | `app/convite/[token]/[guestId]` | Confirmar presença + acompanhantes direto no navegador |
| Webhooks (Meta e Evolution) | `app/api/webhooks/whatsapp`, `app/api/webhooks/evolution` | Verificação de assinatura/token incluída |
| Autenticação (login, recuperação de senha, papéis) | `lib/auth.ts`, `middleware.ts`, `app/(auth)` | NextAuth + JWT, roles `ADMIN`/`OPERATOR` |
| Notificações ao administrador | tabela `notifications`, criadas nos use-cases de confirmação/recusa/importação/disparo | Consumo no painel fica como próximo passo (ver "Roadmap") |

## Como rodar localmente

### 1. Pré-requisitos
- Node.js 20+
- PostgreSQL 16 (ou uma instância Supabase)
- Docker (opcional, recomendado para produção)

### 2. Instalação

```bash
cp .env.example .env
# edite .env com as credenciais do banco e do provedor de WhatsApp escolhido

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed   # cria o usuário admin inicial (admin@confirmacaodeeventos.com / admin123)

npm run dev
```

A aplicação sobe em `http://localhost:3000`. Faça login com o usuário criado
pelo seed e troque a senha em seguida.

### 3. Worker de disparo

O envio em lote roda em um processo separado (para não esbarrar em timeout de
função serverless):

```bash
npm run worker:dispatch
```

### 4. Docker (produção)

```bash
docker compose up -d --build
```

Sobe: PostgreSQL, o app Next.js e o worker de disparo (a Evolution API roda
separadamente — veja a seção abaixo). Depois do primeiro `up`, rode as
migrations e o seed:

```bash
docker compose exec app npx --yes prisma@5.22.0 migrate deploy
docker compose exec app npm run prisma:seed
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa e comentada. Principais grupos:

- `DATABASE_URL` / `DIRECT_URL` — conexão PostgreSQL/Supabase
- `NEXT_PUBLIC_SUPABASE_*` — usado para hospedar a imagem do convite (opcional; pode-se usar qualquer URL pública de imagem)
- `NEXTAUTH_SECRET`, `JWT_SECRET` — segredos de autenticação
- `WHATSAPP_PROVIDER` — `meta_cloud_api` ou `evolution_api`
- `META_*` — credenciais da WhatsApp Cloud API
- `EVOLUTION_*` — credenciais da Evolution API

## Configuração da Meta (WhatsApp Cloud API)

1. Crie um app em [developers.facebook.com](https://developers.facebook.com) com o produto **WhatsApp**.
2. Copie `Phone Number ID` e gere um token permanente (via System User) →
   preencha `META_WHATSAPP_PHONE_NUMBER_ID` e `META_WHATSAPP_TOKEN`.
3. Em **Configuration → Webhook**, aponte para:
   `https://SEU_DOMINIO/api/webhooks/whatsapp`
   com o **Verify Token** igual ao valor de `META_WEBHOOK_VERIFY_TOKEN`.
4. Assine os campos `messages` no webhook.
5. Copie o **App Secret** para `META_APP_SECRET` (usado para validar a assinatura `X-Hub-Signature-256`).
6. Defina `WHATSAPP_PROVIDER=meta_cloud_api`.

## Configuração da Evolution API (open source)

A Evolution API roda como um serviço separado (não faz parte do `docker-compose.yml`
deste projeto, para não acoplar o deploy do app a uma dependência externa opcional).

1. Suba sua própria instância, por exemplo:
   ```bash
   docker run -d --name evolution-api -p 8080:8080 \
     -e AUTHENTICATION_API_KEY=defina-uma-chave-forte \
     atendai/evolution-api
   ```
   (veja a [documentação oficial](https://doc.evolution-api.com/v2/en/install/docker) para volumes persistentes e outras opções).
2. Crie uma instância com o nome definido em `EVOLUTION_INSTANCE_NAME` e conecte via QR Code.
3. Configure o webhook da instância para:
   `https://SEU_DOMINIO/api/webhooks/evolution`
4. Preencha `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`.
5. Defina `WHATSAPP_PROVIDER=evolution_api`.

> É esse número de WhatsApp (Meta ou Evolution) que deve ser usado para
> **receber os contatos encaminhados** pelo administrador — o sistema
> identifica automaticamente VCards ou listas de texto enviadas para ele e
> os coloca na fila "Contatos recebidos" do evento `ACTIVE` mais recente.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Copie a **Connection string** (modo *Session pooler* para app, *Direct connection* para migrations)
   para `DATABASE_URL` / `DIRECT_URL`.
3. (Opcional) Crie um bucket público chamado `convites` para hospedar as imagens
   de convite e preencha `SUPABASE_STORAGE_BUCKET`, `NEXT_PUBLIC_SUPABASE_URL`
   e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Alternativamente, qualquer URL pública de
   imagem funciona no campo "Imagem do convite" do evento.

## Deploy

- **App Next.js**: qualquer plataforma compatível com Next.js standalone
  (Vercel, Railway, Fly.io, VPS com Docker). O `Dockerfile` já produz uma
  imagem `standalone` otimizada.
- **Worker de disparo**: precisa rodar como processo de longa duração (não é
  compatível com funções serverless) — use o serviço `dispatch-worker` do
  `docker-compose.yml`, um Fly Machine, ECS task, ou VM dedicada.
- **Banco**: Supabase (recomendado) ou PostgreSQL gerenciado.
- Lembre de rodar `npx prisma migrate deploy` a cada deploy com mudança de schema.

## Deploy automático em VPS (GitHub Actions + Docker)

Fluxo recomendado para um VPS próprio (ex: Hostinger) com deploy contínuo:

1. **Configuração inicial do servidor (uma única vez):** em um Ubuntu 22.04/24.04
   limpo, como root, rode `scripts/bootstrap-vps.sh`. Ele instala Docker, configura
   o firewall, clona o repositório em `/opt/confirmacaodeeventos`, cria o `.env`,
   sobe os containers e roda as migrations.
2. **(Opcional) HTTPS com domínio próprio:** `DOMAIN=seudominio.com EMAIL=voce@exemplo.com bash scripts/setup-nginx-ssl.sh`
   configura Nginx como proxy reverso + certificado Let's Encrypt.
3. **Deploy contínuo:** o workflow `.github/workflows/deploy.yml` conecta no VPS via
   SSH a cada push na branch `main` e faz `git pull` + rebuild + `prisma migrate deploy`
   automaticamente. Configure estes *secrets* no GitHub
   (`Settings → Secrets and variables → Actions`):
   - `VPS_HOST` — IP do servidor
   - `VPS_USER` — usuário SSH (ex: `root`)
   - `VPS_PORT` — porta SSH (normalmente `22`)
   - `VPS_SSH_KEY` — chave **privada** do par usado pelo `bootstrap-vps.sh` para
     autorizar o GitHub Actions (a chave pública já é adicionada automaticamente
     ao `authorized_keys` do servidor pelo script)

Depois desse setup, todo `git push` (ou merge) na branch `main` atualiza o
servidor sozinho — não é mais necessário acessar o VPS manualmente.

## Validação realizada

Todo o código foi validado localmente antes da entrega: `tsc --noEmit`, `next lint`
e `npm run build` rodaram limpos, e o fluxo completo (login → criar evento →
importar/aprovar convidados → confirmar presença pela página pública →
exportar CSV) foi testado de ponta a ponta com PostgreSQL real e navegador
headless.

## Roadmap sugerido (fora do escopo desta entrega)

- Central de notificações no painel (a tabela `notifications` já é populada;
  falta o dropdown/sino de leitura no `Topbar`).
- Envio de lembretes automáticos agendados (campo `reminderMessage` já existe
  no evento; falta o cron job que dispara N horas antes do evento).
- Testes automatizados (Vitest já está nas dependências) para
  `rsvp-state-machine.ts`, `nlp-intent.service.ts`, `contact-text-parser.service.ts`
  e `vcard-parser.service.ts` — são serviços puros, ideais para testes unitários.
- Mapa de calor dos convidados (endereços) no dashboard.
- Suporte a múltiplos números de WhatsApp mapeados 1:1 por evento (hoje contatos
  encaminhados entram no evento `ACTIVE` mais recente — ver comentário em
  `route-incoming-message.use-case.ts`).
