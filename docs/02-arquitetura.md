# Arquitetura

## Frontend

O frontend usa React + Vite e organiza a aplicacao em paginas, componentes,
contexts e utilitarios.

```txt
src/
  components/
  contexts/
  lib/
  pages/
  sw.js
```

## Backend

O backend usa Supabase:

- Auth para sessao de usuario.
- Postgres para dados.
- RLS para isolamento por usuario.
- Edge Functions para IA, aplicacao de plano, push, WhatsApp e acoes sensiveis.

```txt
supabase/
  functions/
    _shared/
    agent-chat/
    agent-apply/
    generate-reminder/
    habit-mark-done/
    send-push/
    send-whatsapp/
    whatsapp-inbound/
  migrations/
```

## Decisoes Atuais

- A configuracao global de canais fica em `profiles.canais_preferidos`.
- O envio real de lembretes deve ler canais do perfil, nao de cada schedule.
- A aderencia deve ser calculada por habitos esperados, nao por logs existentes.
- O Service Worker nao deve escrever diretamente em tabelas via REST quando uma
  Edge Function especifica existir.
