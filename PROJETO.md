# Evolui — Streak-Life: Estado Completo do Projeto

**Repo:** `c:\Users\Samsung\Streak-life` | GitHub: `WorkiDigital/streak-life`
**Dev:** `npm run dev` → http://localhost:5173
**Deploy:** Vercel (auto-deploy via push para `main`)
**Supabase projeto:** `rldqzqyhqsftwaiyfbwx`

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18.3.1 + Vite 5.4.21 + JSX (sem TypeScript) |
| Roteamento | React Router v7 |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| PWA | vite-plugin-pwa + Service Worker customizado |
| Notificações push | Web Push API + VAPID + Edge Function `send-push` |
| IA | Gemini API (`gemini-2.5-flash`) via Edge Functions |
| Lembretes | n8n workflow (cron 15min) → Supabase RPC → IA → WhatsApp/Push |

---

## Arquitetura de Pastas

```
src/
  contexts/
    HabitsContext.jsx   — estado global: habits, schedules, logs; mutações com soft-delete
    AuthContext.jsx     — Supabase Auth + perfil + timezone → Service Worker via postMessage
    ToastContext.jsx    — sistema de notificações in-app
  pages/
    DashboardPage.jsx   — hábitos do dia, streak, todos os cálculos em useMemo
    HabitsPage.jsx      — CRUD de hábitos, groupedHabits, filtro dinâmico por categoria
    ProgressPage.jsx    — heatmap, gráfico semanal SVG, modal de detalhe por hábito
    SettingsPage.jsx    — perfil, silent mode, timezone, push notifications
    OnboardingPage.jsx  — wrapper: <ChatPage onboardingMode />
    ChatPage.jsx        — chat com IA (onboarding + assistente de hábitos pós-setup)
  components/
    habits/
      HabitCard.jsx     — card do dia, toggle, mini-modal de valor, spinner, fallback legado
      HabitForm.jsx     — form criar/editar, modo fixo + modo intervalo
      HabitHeatmap.jsx  — heatmap memoizado, HeatmapCell como memo(), tooltip acessível
    layout/
      BottomNav.jsx     — nav com badge de pendentes, useMemo, Chat nav item
  sw.js                 — service worker: push notifications, timezone idb-keyval
  lib/
    supabase.js         — createClient com VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

supabase/
  functions/
    agent-chat/         — IA de onboarding/chat: recebe mensagem → Gemini → aplica blocos
    generate-reminder/  — gera texto do lembrete via Gemini (chamado pelo n8n)
    send-push/          — envia Web Push via web-push + VAPID
    send-whatsapp/      — envia mensagem WhatsApp via Evolution API
    whatsapp-inbound/   — recebe mensagens do WhatsApp (webhook Evolution)
    _shared/agent.ts    — utilitários compartilhados: auth, Gemini, blocos SETUP/ACTION
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_add_silent_mode.sql
    0031_seed_habits.sql
    004_pg_cron_close_day.sql
    005_add_new_categories.sql
    006_add_nota_to_habit_logs.sql
    20260604193031_ai_chat_and_agent_actions.sql  — tabela chat_messages, reminder_snoozes, reminders_sent
    20260604193131_pending_schedules_rpc.sql      — RPC get_pending_schedules
```

---

## Banco de Dados

### Tabelas principais
| Tabela | Descrição |
|--------|-----------|
| `habits` | Hábitos base (user_id null = templates, user_id = do usuário) |
| `habit_schedules` | N rows por habit_id (1 por horário), `ativo: bool`, `canais: text[]`, `dias_semana: int[]` |
| `habit_logs` | UNIQUE(habit_id, user_id, data) — 1 log por hábito por dia, `valor text`, `nota text` |
| `profiles` | nome, whatsapp, tom_preferido, timezone, silent_mode, onboarding_completed, onboarding_data |
| `chat_messages` | role (user/assistant), content, source, metadata (applied blocks) |
| `reminder_snoozes` | adiamentos pedidos pelo usuário, `delivered_at` |
| `reminders_sent` | log de notificações enviadas (dedup) |

### Modelo N-schedules / 1-log
- Um hábito pode ter N schedules (ex: água a cada 20min = 46 rows)
- `getTodayHabits()` agrupa por `habit_id` via Map → 1 card por hábito
- `habit_logs` = 1 check por dia independente do nº de schedules

### RPC `get_pending_schedules`
Retorna hábitos com lembrete pendente na janela atual (±7min), sem envio duplicado, respeitando `silent_mode`. Chamada pelo n8n a cada 15 min.

---

## Edge Functions (Supabase)

### `agent-chat`
- **Rota:** `POST /functions/v1/agent-chat`
- **Auth:** `--no-verify-jwt` (valida internamente via `getAuthUser()`)
- **Fluxo:** Auth → lê histórico → monta contexto (perfil + hábitos + schedules) → Gemini → parse blocos → aplica (SETUP / SETUP_UPDATE / ACTION) → salva mensagem assistant → retorna
- **Blocos invisíveis:** `<!--SETUP:{...}-->`, `<!--SETUP_UPDATE:{...}-->`, `<!--ACTION:{...}-->`
- **SETUP:** cria/atualiza perfil + hábitos + schedules no banco
- **ACTION:** marca feito, adia lembrete, ou nenhuma ação

### `generate-reminder`
- Chamada pelo n8n. Recebe `userId, userName, habitName, category, tomPreferido`
- Retorna texto personalizado do lembrete via Gemini

### `send-push`
- Recebe `{ subscription, title, body, habitId, userId }`
- Envia via `web-push` + VAPID keys (secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)

### `send-whatsapp`
- Repassa para Evolution API

### Secrets configurados
```
GEMINI_API_KEY        ✓
VAPID_PUBLIC_KEY      ✓
VAPID_PRIVATE_KEY     ✓
SUPABASE_URL          ✓ (injetado automaticamente)
SUPABASE_ANON_KEY     ✓ (injetado automaticamente)
SUPABASE_SERVICE_ROLE_KEY ✓ (injetado automaticamente)
```

---

## Variáveis de Ambiente

### Vercel (produção)
```
VITE_SUPABASE_URL=https://rldqzqyhqsftwaiyfbwx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_VAPID_PUBLIC_KEY=BB1j_R2ZwZHe4bpjpiJr...
```

### .env local (desenvolvimento)
```
VITE_SUPABASE_URL=https://rldqzqyhqsftwaiyfbwx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_VAPID_PUBLIC_KEY=BB1j_R2ZwZHe4bpjpiJr...
VITE_GEMINI_API_KEY=     (não usado no frontend)
VITE_EVOLUTION_API_URL=  (não usado no frontend)
```

---

## n8n Workflow (`n8n-workflow.json`)

**Fluxo:** Cron (15min) → Variáveis de Ambiente → Buscar Hábitos Pendentes (RPC) → Separar em Itens → Gerar Lembrete (IA) → Extrair Mensagem → [Tem WhatsApp? → Enviar → Log → Marcar snooze] + [Tem Push Token? → Enviar Push → Log → Marcar snooze]

**Variáveis de ambiente n8n necessárias:**
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
EVOLUTION_URL
EVOLUTION_INSTANCE
EVOLUTION_API_KEY
```

---

## Funcionalidades Implementadas

### Bug Fixes
- **Streak calculation** — `startOfDay()` em vez de `new Date(todayStr + 'T12:00:00')`; loop usa array completo de logs
- **Silent mode race condition** — `setSilentMode()` só após `await updateProfile()` (removido optimistic update)
- **Service Worker timezone** — `Intl.DateTimeFormat('en-CA', { timeZone })` com timezone salvo em idb-keyval
- **Dashboard N-cards explosion** — `getTodayHabits()` agrupa por `habit_id` via Map
- **HabitHeatmap re-renders** — `HeatmapCell` como `React.memo()`
- **HabitCard fallback legado** — `(schedule.horarios?.[0] || schedule.horario)?.slice(0,5)`
- **HabitsPage filtros** — filtro dinâmico apenas com categorias que o usuário tem (antes mostrava todas as 12)
- **Edge Function 401** — `getAuthUser()` chama `client.auth.getUser(jwt)` com JWT direto; deploy com `--no-verify-jwt`

### Performance
- `DashboardPage` — `todayHabits`, `{ matrix, dates }`, `stats` em `useMemo([logs, schedules])`
- `ProgressPage` — `getHeatmapData`, `getStats`, `getWeeklyStats` em `useMemo([logs, schedules, period])`
- `BottomNav` — `getTodayHabits()` em `useMemo([logs, schedules])`
- `HabitsPage` — `groupedHabits` em `useMemo([schedules, categoryFilter])`
- `HabitHeatmap` — `HeatmapCell` como `React.memo`, callbacks como `useCallback`

### Acessibilidade Mobile (aplicado em `src/index.css` + `BottomNav.css`)
- `font-size: 16px !important` em todos inputs/textarea/select (evita zoom iOS)
- `min-height: 44px` em `.bottom-nav-item` e `.btn-icon` (touch targets WCAG)
- `safe-area-inset-bottom` no BottomNav, `.page` e `.modal-content` (suporte a notch/home bar)
- Badge: 11px / 18px altura (era 9px/16px — ilegível)
- `:active` com `scale + opacity` em `.btn`, `.chip`, `.bottom-nav-item`
- `.modal-content` com `-webkit-overflow-scrolling: touch`

### Features
- **Agendamento avançado** — modo Intervalo: `generateIntervalTimes()`, `detectExistingMode()`, preview ao vivo, pills de intervalo
- **HabitCard** — mini-modal de valor/quantidade ao marcar feito, spinner no botão
- **Chat IA** — `ChatPage.jsx` com Realtime (postgres_changes), onboarding via IA, aplicação automática de blocos SETUP/ACTION
- **OnboardingPage** — agora é `<ChatPage onboardingMode />` (fluxo guiado pela IA)
- **ProgressPage** — filtro por categoria, detalhe por hábito (modal), gráfico semanal SVG, compartilhar
- **HabitsPage** — filtro dinâmico por categorias reais, agrupamento por `habit_id`
- **SettingsPage** — silentSaving state, `.settings-row-disabled`, `aria-busy`
- **BottomNav** — Chat nav item, badge de pendentes, `useMemo`
- **PWA** — manifest com `lang: 'pt-BR'`, `categories`, `start_url: '/?source=pwa'`
- **vercel.json** — SPA rewrite para React Router funcionar em produção

### Atomicidade do `updateHabit` (soft-delete pattern)
1. `UPDATE habit_schedules SET ativo=false WHERE habit_id=X`
2. `INSERT` novos rows
3. Se INSERT falha → `UPDATE SET ativo=true` (rollback manual)
4. `fetchSchedules()` ao final corrige inconsistências

---

## Decisões Arquiteturais Importantes

### Por que 1 log por dia (não por schedule)?
Usuário que bebe água 46x por dia não precisa logar 46 vezes. O objetivo é rastrear o hábito, não cada ocorrência. `UNIQUE(habit_id, user_id, data)` garante isso.

### Por que Edge Functions em vez de servidor dedicado?
Web Push precisaria de servidor Node.js (para usar `web-push`). Edge Function elimina infra extra. Chamada diretamente pelo n8n.

### Por que `--no-verify-jwt` na `agent-chat`?
O SDK do Supabase injeta `apikey` + `Authorization` automaticamente. Passar o header manualmente sobrescrevia o `apikey` e o gateway bloqueava com 401. Com `--no-verify-jwt`, a função valida o JWT internamente via `getAuthUser()`.

### Por que OnboardingPage virou ChatPage?
Onboarding por steps fixos era rígido. A IA conduz o onboarding naturalmente, uma pergunta por vez, e emite `<!--SETUP:...-->` quando tem dados suficientes. Mais flexível e melhor UX.

---

## Estado Atual

- Build limpo: `✓ built in ~3.4s`
- Warning: bundle ~500 kB (pode resolver com `manualChunks`)
- Edge Functions deployadas: `agent-chat`, `generate-reminder`, `send-push`, `send-whatsapp`, `whatsapp-inbound`
- Migrations aplicadas: 9 migrations no remoto
- Bug em investigação: `agent-chat` retorna 401 quando chamada do app em produção (causa: `getAuthUser` com JWT de sessão ainda em debug)
