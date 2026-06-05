# Evolui — Streak-Life: Estado Completo do Projeto

**Repo:** `c:\Users\Samsung\Streak-life` | GitHub: `WorkiDigital/streak-life`
**Dev:** `npm run dev` → http://localhost:5173
**Deploy:** Vercel (auto-deploy via push para `main`)
**Supabase projeto:** `rldqzqyhqsftwaiyfbwx`

---

## Atualização 2026-06-05

### Resumo do dia
- Projeto publicado em `main` e Vercel com deploy automático ativo.
- URL pública estável confirmada: `https://streak-life.vercel.app`.
- Supabase Auth ajustado com `site_url=https://streak-life.vercel.app`.
- Redirect URLs liberadas no Supabase Auth:
  - `https://streak-life.vercel.app/**`
  - `https://*-worki-digitals-projects-68c080e1.vercel.app/**`
  - `http://localhost:5173/**`
  - `http://localhost:4173/**`
  - `http://localhost:3000/**`
- Arquivo local `test-push.js` segue fora do Git por conter dados sensíveis de teste.

### Commits principais de hoje
- `2244d17` - estabiliza conversa do chat/agente.
- `5434ed7` - organiza perfil completo do usuário no app e no agente.
- `b4e9b2c` - corrige ícones PWA, `mobile-web-app-capable` e VAPID key.
- `a5e5af8` - registra service worker imediatamente para evitar travamento no carregamento.
- `fba0e80` - reforços de segurança: RPC restrita, JWT no `send-push`, limite em query do chat.
- `c4a6ae7`, `53401d6`, `8f3db7a` - correções de exclusão/soft-delete de hábitos e schedules.
- `44ec332` - melhorias mobile de acessibilidade e touch targets.
- `ac6c290`, `3b0c00c` - ajustes visuais dos blocos de rotina em Configurações.
- `a7f8b11` - IA passa a gerar prescrição personalizada com base no perfil.
- `c6027ec`, `6bbdf5f`, `a47605b`, `7ff7cdb` - onboarding mais rigoroso: exige dados obrigatórios, pergunta refeições completas e aumenta tokens para não cortar resposta.
- `436967d` - canais de notificação movidos para Configurações.
- `e67b3c0` - cria template HTML de confirmação de email e melhora fluxo de verificação.
- `cf4385d` - divide bundles do app e remove warning de chunk acima de 500 kB.

### Auth e email
- Criados:
  - `supabase/templates/auth-confirmation.html`
  - `supabase/templates/auth-confirmation-subject.txt`
- `AuthContext.signUp()` agora envia `emailRedirectTo` para `${window.location.origin}/login?verified=1`.
- `LoginPage` mostra aviso quando a pessoa volta com `?verified=1`.
- Supabase recusou ativar template customizado porque o projeto está no plano free usando o provedor de email padrão.
- Para ativar o template bonito no Supabase, precisa configurar SMTP próprio ou mudar para plano que permita templates customizados.

### IA e onboarding
- Agente agora exige dados obrigatórios antes de emitir `SETUP`.
- Checklist obrigatório inclui:
  - idade, sexo, altura, peso atual, peso meta
  - horário de acordar e dormir
  - nível de atividade
  - treino, dias, tipo e horário preferido
  - café da manhã, almoço, lanche da tarde e jantar
  - nível de estresse
  - preferências e restrições alimentares
  - observações de saúde
  - tom preferido
  - triagem de segurança alimentar
- `maxOutputTokens` foi aumentado para reduzir respostas cortadas no onboarding.
- Prescrição personalizada considera perfil, rotina e objetivo do usuário.

### Perfil e configurações
- Perfil completo passou a organizar dados como peso, altura, objetivo, rotina, treino, refeições, restrições e preferências.
- Blocos de rotina em Configurações foram compactados e alinhados.
- Campo de horário preferido ficou alinhado ao tamanho do campo de dias/semana.
- Canais de notificação foram movidos para Configurações.

### Hábitos e logs
- Exclusão de hábitos foi corrigida:
  - desativa `habit_schedules`
  - faz update otimista na UI
  - reverte se falhar no banco
  - trata erros silenciosos
- Mantido modelo 1 log por hábito por dia, mesmo com múltiplos schedules.

### Segurança
- RPCs e funções receberam ajustes de acesso.
- `send-push` valida JWT.
- Query de chat foi limitada para evitar leituras desnecessárias.
- Service role e tokens sensíveis não devem ir para frontend nem Git.

### PWA e mobile
- Ícones PWA regenerados/corrigidos.
- `mobile-web-app-capable` ajustado.
- Service worker registra imediatamente.
- Inputs mantêm 16px para evitar zoom no iOS.
- Touch targets e bottom nav ajustados para mobile.

### Performance
- `src/App.jsx` usa `lazy()` e `Suspense` nas páginas.
- `vite.config.js` separa chunks manuais:
  - `react`
  - `supabase`
  - `icons`
  - `dates`
- Bundle principal caiu de aproximadamente `516 kB` para aproximadamente `21 kB`.
- Warning de chunk acima de 500 kB foi removido sem aumentar limite artificialmente.
- Build validado com `npm run build`.

### Deploys/verificações
- Push para GitHub feito em `main`.
- Vercel gerou deploys `READY`.
- Alias `streak-life.vercel.app` confirmado apontando para o deploy mais recente.
- Build atual gera chunks menores e sem warning de 500 kB.

### Pendências conhecidas
- Template HTML de email está pronto no repo, mas não ativo no Supabase enquanto não houver SMTP próprio ou plano compatível.
- `test-push.js` é arquivo local de teste e deve continuar fora do Git.

---

## Atualização 2026-06-05 (sessão 2)

### Commits
- `3498eb8` - chip de intervalo corrigido + sync assíncrono ao editar hábito
- `1ed14bc` - contador de progresso para hábitos com múltiplos horários (+1 por clique)
- `ef5d6f3` - horário `08:00:00` → `08:00` e contador inválido ignorado
- `0f7f95d` - heatmap usa `created_at` correto (dias antes do cadastro ficam cinza)
- `e2350ff` - ícone PWA substituído (raio roxo → muda verde Streak Life)
- `af03473` - melhorias onboarding, HabitsContext refatorado
- `32c55d7` - botões canal mobile: `touch-action: manipulation` + sem `disabled`
- `28ed1dc` - fix definitivo canais: `parseCanais()` converte string PostgreSQL `{push,whatsapp}` para array JS; CSS `.channel-toggle.active` movido para `SettingsPage.css`

### Funcionalidades novas
- **Hábitos com múltiplos horários (ex: Água 7×):** botão `+1 (3/7)` incrementa contador, vira `✓ Feito` no último clique. Progresso exibido abaixo do nome. Hábito de 1 horário mantém comportamento original.
- **Canais globais (Push/WhatsApp):** seleção movida para Configurações como preferência global. HabitForm e HabitsContext usam `profile.canais_preferidos` como default.
- **Heatmap:** dias anteriores à criação do hábito sempre cinza (não vermelho).
- **HabitForm:** chip de intervalo sempre tem uma opção selecionada; sync com schedules assíncrono via `useEffect`; `inicio`/`fim` usam `horario_acordar`/`horario_dormir` do perfil.
- **Ícone PWA:** muda verde com fundo escuro em todos os tamanhos (72–512px).

### Bugs corrigidos
- String PostgreSQL `{push,whatsapp}` não convertida para array JS → botões de canal nunca ficavam verdes.
- CSS `.channel-toggle.active` estava em `HabitForm.css` que não era importado em `SettingsPage`.
- Horário exibido como `08:00:00` em vez de `08:00` no card.
- `schedules` carregava após montagem do HabitForm, inicializando com valores errados na edição.
- Heatmap mostrava vermelho para dias antes do cadastro do hábito.

### Canais de notificação — modelo atual
- `profiles.canais_preferidos TEXT[]` com default `{push,whatsapp}`
- Migration: `20260605_add_canais_preferidos.sql`
- `parseCanais()` em `SettingsPage.jsx` normaliza string PostgreSQL para array JS
- Toggle em Configurações salva via `updateProfile({ canais_preferidos: next })`
- Hábitos novos herdam o canal do perfil; hábitos existentes mantêm o canal salvo no schedule

---

## Atualização recente - push, n8n, heatmap e onboarding

### Commits recentes adicionados
- `74eee59` - move checklist do onboarding para `systemInstruction`, evitando repetição de perguntas.
- `8e6478e` - adiciona formulário visual de onboarding em 6 etapas com revisão do plano.
- `d825489` - dias anteriores à criação do hábito aparecem cinza no heatmap, não vermelho.
- `3498eb8` - corrige chip de intervalo não selecionado e sincronização assíncrona ao editar hábito.
- `1ed14bc` - adiciona contador de progresso para hábitos com múltiplos horários.
- `ef5d6f3` - corrige horário `08:00:00` para `08:00` e ignora contador inválido como `501`.
- `0f7f95d` - heatmap usa `created_at` correto para pintar dias anteriores ao cadastro.
- `1f54c3a` - `send-push` aceita service key do n8n e workflow gera JSON válido.

### Correção do send-push para n8n
- Causa diagnosticada: a Edge Function `send-push` retornava `401 {"error":"Nao autenticado"}` quando a chave enviada pelo n8n não batia exatamente com a validação interna.
- A função agora aceita duas origens de service key:
  - `N8N_SERVICE_ROLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- A validação remove `Bearer`/`bearer` de forma case-insensitive e aplica `.trim()` no token recebido.
- Foi configurado o secret `N8N_SERVICE_ROLE_KEY` no Supabase remoto.
- `send-push` foi redeployada no projeto `rldqzqyhqsftwaiyfbwx` com `--no-verify-jwt`.
- Validação feita: chamada com `bearer` minúsculo e espaços extras deixou de retornar `401` e passou para `400 subscription.endpoint e body sao obrigatorios`, que é o comportamento esperado quando o payload está vazio.

### Correção do node Enviar Web Push no n8n
- O erro `JSON parameter needs to be valid JSON` vinha do `jsonBody` do node `Enviar Web Push`.
- O workflow agora usa uma expressão única com `JSON.stringify(...)`, evitando JSON misturado com fragmentos `{{ ... }}`.
- `push_token` é convertido com `JSON.parse(...)` quando vier como string.
- O corpo enviado para a Edge Function segue o formato:
  - `subscription`
  - `payload.title`
  - `payload.body`
  - `payload.data.url`
  - `payload.data.habitId`
  - `payload.data.userId`
  - `payload.data.date`
- Depois dessa alteração, é necessário atualizar/importar o `n8n-workflow.json` no n8n self-hosted para o node usar o corpo novo.

### Teste de hábitos pendentes
- Foi criado um hábito de teste para validar a RPC `get_pending_schedules`.
- Usuário usado: `herickmaia`.
- Hábito criado: `Teste pendente n8n 20260605-140003`.
- `habit_id`: `494c08f8-9c07-4ebd-844a-e3cf19652bc1`.
- `schedule_id`: `af254009-2775-4be7-b817-05045b98e733`.
- A RPC retornou o item como pendente com `source=schedule`.
- Observação: esse usuário não tinha `push_token` nem WhatsApp no momento do teste, então a busca funciona, mas o envio real depende de canal/token válido.

### Estado atual dessa parte
- Função `send-push` corrigida e deployada na nuvem.
- Workflow local `n8n-workflow.json` corrigido e enviado ao GitHub.
- Repositório remoto contém a correção em `main`.
- Arquivos locais de teste continuam fora do Git:
  - `test-push.js`
  - `test_whatsapp.js`
- Outras alterações locais não relacionadas devem continuar sem commit até revisão específica.

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
