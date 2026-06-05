# Banco de Dados

## Tabelas Principais

### `profiles`

Perfil do usuario, configuracoes e dados do onboarding.

Campos importantes:

- `id`: usuario Supabase.
- `nome`, `whatsapp`, `timezone`.
- `push_token`: inscricao Web Push atual.
- `canais_preferidos`: canais globais de lembrete.
- `silent_mode`: pausa global de lembretes.
- campos de perfil fisico, rotina, objetivo e saude.

### `habits`

Habitos do usuario e templates globais.

- `user_id = null`: template global.
- `ativo`: soft delete.
- `categoria`: agrupamento do habito.

### `habit_schedules`

Horarios e dias em que um habito e esperado.

- Um habito pode ter multiplos schedules.
- O envio usa `profiles.canais_preferidos`; `canais` fica como legado/default.

### `habit_logs`

Registro diario de status do habito.

- Chave unica: `habit_id`, `user_id`, `data`.
- `status`: `feito`, `pendente` ou `nao_feito`.
- `valor` pode guardar contagem ou observacao curta.
- `nota` guarda comentario livre quando disponivel.

### `chat_messages`

Historico de conversa com a IA.

### `reminder_snoozes`

Adiamentos de lembretes.

### `reminders_sent`

Controle de lembretes enviados, evitando duplicidade por canal.

## RLS

As tabelas de dados do usuario devem permitir acesso apenas ao proprio `auth.uid()`.
Templates globais em `habits` podem ser lidos por todos os usuarios autenticados.

## Observacao

O historico local/remoto de migrations ja apresentou divergencia. Antes de
qualquer schema change grande, listar `supabase migration list --linked` e
decidir se a correcao sera por repair, pull ou SQL direto versionado.
