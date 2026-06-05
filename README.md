# Streak Life

Streak Life e um PWA de habitos saudaveis com IA. O usuario informa rotina,
objetivo, treino, alimentacao e sono; a IA monta um plano revisavel com
lembretes; o app acompanha consistencia diaria por dashboard, mapa de evolucao,
chat e notificacoes.

## Stack

- React 18
- Vite
- Supabase Auth, Database e Edge Functions
- Gemini API
- PWA com Service Worker
- date-fns
- idb-keyval
- lucide-react

## Funcionalidades

- Cadastro e login via Supabase.
- Onboarding com plano gerado por IA.
- Revisao manual dos habitos antes de ativar.
- Dashboard diario.
- Mapa de evolucao.
- Chat com IA.
- Push notifications com acao rapida.
- WhatsApp via Evolution API.
- Configuracao global de canais de lembrete.

## Como Rodar

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
```

Preview local:

```bash
npm run preview
```

## Variaveis de Ambiente

Frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```

Supabase Edge Functions:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
N8N_SERVICE_ROLE_KEY=
```

## Estrutura

```txt
src/
  components/
  contexts/
  lib/
  pages/
  sw.js

supabase/
  functions/
  migrations/
  templates/
```

## Aviso de Saude

Streak Life e uma ferramenta de organizacao de habitos e educacao geral. Ele nao
substitui nutricionista, medico, psicologo ou atendimento de emergencia.

## Documentacao

Os documentos internos ficam em `docs/`:

- `docs/01-visao-geral.md`
- `docs/02-arquitetura.md`
- `docs/03-banco-de-dados.md`
- `docs/04-edge-functions.md`
- `docs/05-pwa-push.md`
- `docs/06-roadmap.md`
