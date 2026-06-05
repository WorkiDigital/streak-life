# Edge Functions

## Funcoes Existentes

### `agent-chat`

Conversa com o usuario, interpreta blocos invisiveis e ainda concentra parte da
geracao de plano. Deve ser reduzida gradualmente.

### `agent-apply`

Aplica plano gerado pela IA no banco.

### `generate-reminder`

Gera texto curto de lembrete personalizado.

### `habit-mark-done`

Marca um habito como feito para o usuario autenticado. Deve ser usada por
clientes e pelo Service Worker no lugar de escrita REST direta.

### `send-push`

Envia push usando Web Push.

### `send-whatsapp`

Envia mensagem pela Evolution API.

### `whatsapp-inbound`

Recebe mensagens do WhatsApp e encaminha para o fluxo de IA.

## Padroes

- Validar usuario via JWT quando a acao for do usuario.
- Usar `service_role` apenas dentro de Edge Functions ou automacoes confiaveis.
- Nao aceitar `user_id` vindo do frontend como fonte de verdade.
- Retornar JSON padronizado.
- Logar erro no console com prefixo da funcao.
