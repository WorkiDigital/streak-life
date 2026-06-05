# PWA e Push

## Fluxo Atual

1. Usuario ativa Push em Configuracoes.
2. Browser gera uma inscricao Web Push.
3. App salva essa inscricao em `profiles.push_token`.
4. Automacao ou Edge Function envia push.
5. Service Worker mostra notificacao.
6. Acao "Feito" chama `habit-mark-done`.

## Regras de Seguranca

- O Service Worker pode guardar token de sessao apenas para acao local autorizada.
- Logout deve enviar `CLEAR_SUPABASE_AUTH`.
- A acao "Feito" deve passar por Edge Function autenticada.
- Falhas na acao devem abrir ou focar o app, para o usuario resolver no fluxo normal.

## Configuracao Global

Os canais ativos ficam em `profiles.canais_preferidos`. Se o usuario escolher
apenas Push, WhatsApp nao deve ser enviado. Se escolher WhatsApp, deve haver
numero salvo.
