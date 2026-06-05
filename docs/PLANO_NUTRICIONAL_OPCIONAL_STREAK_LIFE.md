# Plano Completo de Implementacao — Plano Nutricional Opcional no Streak Life

## 1. Objetivo

Evoluir o Streak Life de um app de habitos saudaveis com IA para um app de rotina saudavel com plano alimentar opcional, personalizado e executavel no dia a dia.

O plano alimentar nao deve substituir nutricionista, medico ou outro profissional de saude. A ideia e criar uma camada pratica de organizacao alimentar para o usuario entender o que fazer em cada refeicao, com horarios, sugestoes, quantidades aproximadas, substituicoes e acoes rapidas.

A experiencia deve continuar simples. O usuario nao deve ganhar uma tela complexa. O plano alimentar deve aparecer dentro do proprio fluxo do dia, principalmente na tela Inicio, conectado aos habitos de alimentacao.

Frase central da feature:

> O usuario nao entra no app para estudar nutricao. Ele entra para saber exatamente o que fazer hoje.

---

## 2. Visao geral da experiencia

O app ja coleta dados importantes no onboarding:

- Nome
- Idade
- Sexo
- Altura
- Peso atual
- Peso meta
- Objetivo
- Nivel de atividade
- Treino
- Tipo de treino
- Dias de treino
- Horario do treino
- Horario de acordar
- Horario de dormir
- Horarios das refeicoes
- Preferencias alimentares
- Restricoes alimentares
- Condicoes de saude ou medicamentos
- Nivel de estresse
- Tom preferido
- Timezone

A melhoria proposta aproveita esses dados para permitir que o usuario escolha se deseja ou nao receber um plano nutricional.

Fluxo ideal:

1. Usuario faz onboarding.
2. Usuario informa dados basicos, rotina, objetivo, treino e saude.
3. App pergunta se ele quer plano alimentar.
4. Se disser nao, o app cria apenas habitos e lembretes.
5. Se disser sim, o app pergunta o nivel de detalhe desejado.
6. IA gera plano alimentar estruturado.
7. Usuario revisa antes de ativar.
8. App salva habitos, refeicoes e plano nutricional.
9. Tela Inicio mostra os habitos do dia.
10. Cards de alimentacao podem ser expandidos para mostrar o plano da refeicao.
11. Chat permite trocar, adaptar, simplificar ou registrar refeicoes.

---

## 3. Principios obrigatorios

### 3.1 Plano nutricional opcional

Nem todo usuario quer um plano alimentar detalhado. Alguns querem apenas lembrar de beber agua, treinar, dormir melhor e manter horarios.

No onboarding, incluir a pergunta:

**Voce quer que a IA monte tambem um plano alimentar para sua rotina?**

Opcoes:

- Sim, quero plano alimentar.
- Nao, quero apenas habitos e lembretes.

Se o usuario escolher nao, o sistema segue com o fluxo atual de habitos.

Se escolher sim, o sistema ativa a camada nutricional.

### 3.2 Nao criar aba obrigatoria chamada Plano

A navegacao principal deve continuar simples:

- Inicio
- Habitos
- Chat
- Progresso
- Configuracoes

O plano alimentar deve aparecer dentro do Inicio, conectado aos cards de alimentacao.

Exemplo de card fechado:

    Jantar
    20:00
    Pendente
    Ver plano do jantar

Exemplo de card aberto:

    Jantar — 20:00

    Sugestao:
    - Frango grelhado: 130g a 160g
    - Arroz cozido: 100g a 140g
    - Feijao: 70g a 100g
    - Salada/legumes: 1 a 2 porcoes
    - Azeite: pequena quantidade

    Substituicoes:
    Frango -> ovos, peixe ou carne magra
    Arroz -> batata, macaxeira ou cuscuz

    Acoes:
    - Marcar como feito
    - Trocar refeicao
    - Gerar opcao mais simples

### 3.3 Leigo e profissional

O plano deve ter niveis de leitura.

Modo simples:

    Almoco
    Monte seu prato assim:
    - Uma fonte de proteina
    - Uma fonte de carboidrato
    - Feijao ou equivalente
    - Salada ou legumes

Modo detalhado:

    Almoco
    - Frango grelhado: 130g a 160g
    - Arroz cozido: 100g a 140g
    - Feijao: 70g a 100g
    - Salada: 1 a 2 porcoes

Modo profissional:

    Macros aproximados:
    - Proteina: 35g
    - Carboidratos: 60g
    - Gorduras: 15g
    - Calorias estimadas: 540 kcal

### 3.4 Quantidades aproximadas

Usar faixas e linguagem de estimativa.

Usar:

    Quantidade sugerida: 120g a 150g

Evitar:

    Coma exatamente 137g

Texto de seguranca:

> Este plano e uma sugestao estimada para organizacao da rotina. Nao substitui nutricionista, medico ou outro profissional de saude.

### 3.5 Casos sensiveis

Nao gerar plano alimentar detalhado com gramas para:

- Menores de 18 anos
- Gestantes
- Lactantes
- Pessoas com doenca diagnosticada relevante sem acompanhamento
- Pessoas em uso de medicacao continua sem acompanhamento
- Pessoas com historico ou sinais de transtorno alimentar
- Pessoas que relatam compulsao, purga, uso de laxantes, diureticos, jejum extremo, restricao severa ou culpa intensa
- Pessoas com baixo peso ou perda rapida de peso

Nesses casos, o app deve:

1. Acolher.
2. Nao gerar plano com gramas.
3. Orientar acompanhamento profissional.
4. Permitir apenas habitos gerais, como agua, sono, rotina e horarios de refeicoes.

Mensagem sugerida:

    Obrigado por compartilhar essas informacoes.

    Pelo que voce informou, esse caso pede acompanhamento individualizado com um nutricionista e/ou medico. Para sua seguranca, eu nao vou montar um plano alimentar com quantidades ou metas especificas.

    Ainda posso te ajudar com habitos gerais de rotina, como sono, hidratacao, organizacao das refeicoes e lembretes saudaveis.

---

## 4. Fluxos de uso

### 4.1 Sem plano nutricional

1. Usuario cria conta.
2. Faz onboarding.
3. Escolhe nao quero plano alimentar.
4. IA cria habitos e lembretes basicos.
5. Usuario acessa Inicio.
6. Marca habitos como feitos.
7. Acompanha progresso.

### 4.2 Com plano nutricional

1. Usuario cria conta.
2. Faz onboarding.
3. Escolhe quero plano alimentar.
4. Escolhe nivel do plano: simples, detalhado ou profissional.
5. IA gera plano alimentar estruturado.
6. Usuario revisa o plano antes de ativar.
7. Usuario aprova.
8. App salva plano nutricional, refeicoes, habitos e horarios.
9. Inicio mostra os habitos do dia.
10. Cards de refeicao podem ser expandidos.
11. Usuario marca refeicao como feita.
12. Usuario pode adaptar ou trocar pelo chat.
13. Progresso acompanha adesao geral e adesao alimentar.

### 4.3 Troca de refeicao

1. Usuario abre o card do almoco.
2. Clica em Trocar refeicao.
3. App pergunta o motivo:
   - Nao tenho esse alimento.
   - Quero algo mais rapido.
   - Quero algo mais barato.
   - Quero algo mais leve.
   - Outro motivo.
4. Usuario informa o que tem disponivel, se quiser.
5. IA gera alternativa.
6. Usuario escolhe:
   - Usar so hoje.
   - Salvar como padrao.
   - Cancelar.

### 4.4 Chat

Exemplos de comandos:

    Nao tenho frango hoje.
    Quero um jantar mais simples.
    Fiz o almoco, mas troquei arroz por batata.
    Hoje pulei o lanche.
    Salva essa opcao como padrao.

Exemplo de resposta:

    Sem problema. Para manter parecido com o plano, voce pode trocar por:

    - Peixe: 130g a 160g
    - Patinho moido: 120g a 150g
    - Ovos: 2 a 3 unidades

    Quer que eu salve essa troca so para hoje ou como padrao?

---

## 5. Alteracoes no onboarding

### 5.1 Novos campos

Adicionar ao estado do formulario:

    nutrition_enabled: false
    nutrition_mode: simples
    nutrition_safety_confirmed: false

### 5.2 Nova etapa: escolha do plano alimentar

Titulo:

    Voce quer um plano alimentar?

Subtitulo:

    A IA pode montar uma sugestao de refeicoes para sua rotina, com horarios, porcoes e substituicoes.

Opcoes:

    Nao, quero apenas habitos.
    Sim, quero plano alimentar.

### 5.3 Nova etapa: nivel de detalhe

Titulo:

    Qual nivel de detalhe voce prefere?

Opcoes:

    Simples
    Sugestoes por refeicao, sem gramas.

    Detalhado
    Sugestoes por refeicao com quantidades aproximadas.

    Profissional
    Macros, gramas, substituicoes e observacoes tecnicas.

Valores aceitos:

    simples
    detalhado
    profissional

### 5.4 Validacao de seguranca

Antes de chamar a IA para gerar plano, validar:

- Idade maior ou igual a 18.
- Peso e altura plausiveis.
- Objetivo nao agressivo.
- Observacoes de saude sem sinais criticos.
- Restricoes alimentares consideradas.
- Ausencia de sinais de transtorno alimentar.
- Ausencia de uso perigoso de laxantes, diureticos, jejum extremo ou restricao severa.

---

## 6. Como o plano aparece no Inicio

Estrutura recomendada:

    Inicio

    Ola, Herickson
    Hoje o foco e consistencia.

    Agua: 1.2L / 3L
    Habitos: 3/8 concluidos
    Plano alimentar: ativo

    Prioridades de hoje
    1. Agua
    2. Almoco
    3. Treino

    Hoje
    Cards de habitos

### 6.1 Card fechado

    Almoco
    12:00
    Proteina + carboidrato + legumes
    Feito | Ver refeicao

### 6.2 Card aberto

    Almoco — 12:00

    Objetivo da refeicao:
    Manter energia e bater proteina do dia.

    Sugestao:
    - Frango grelhado: 130g a 160g
    - Arroz cozido: 100g a 140g
    - Feijao: 70g a 100g
    - Salada/legumes: 1 a 2 porcoes
    - Azeite: pequena quantidade

    Substituicoes:
    Frango -> peixe, patinho moido ou ovos
    Arroz -> batata, macaxeira ou cuscuz
    Feijao -> lentilha ou grao-de-bico

    Macros aproximados:
    Proteina: 35g
    Carboidrato: 60g
    Gordura: 15g

    Acoes:
    - Marcar como feito
    - Trocar refeicao
    - Opcao mais simples

### 6.3 Regras visuais

- Cards recolhidos por padrao.
- Detalhe apenas ao tocar na seta.
- No modo simples, ocultar macros.
- No modo detalhado, mostrar quantidades.
- No modo profissional, mostrar macros e observacoes tecnicas.
- Layout precisa ser mobile first.
- Texto curto, claro e sem poluir a tela.

---

## 7. Estrutura de dados no Supabase

### 7.1 Tabelas novas

Criar:

- nutrition_plans
- nutrition_targets
- nutrition_meals
- nutrition_meal_items
- nutrition_substitutions
- nutrition_meal_logs

### 7.2 SQL — nutrition_plans

```sql
create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  mode text not null default 'simples',
  objetivo text,
  objetivo_descricao text,
  observacoes_gerais text,
  safety_status text default 'ok',
  safety_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.3 SQL — nutrition_targets

```sql
create table if not exists public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  calorias_estimadas int,
  proteina_g int,
  carboidrato_g int,
  gordura_g int,
  agua_litros numeric,
  observacao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.4 SQL — nutrition_meals

```sql
create table if not exists public.nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  categoria text default 'alimentacao',
  horario time,
  ordem int default 0,
  descricao_simples text,
  objetivo_refeicao text,
  proteina_g int,
  carboidrato_g int,
  gordura_g int,
  calorias_estimadas int,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.5 SQL — nutrition_meal_items

```sql
create table if not exists public.nutrition_meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.nutrition_meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alimento text not null,
  quantidade_min numeric,
  quantidade_max numeric,
  unidade text default 'g',
  grupo text,
  observacao text,
  ordem int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.6 SQL — nutrition_substitutions

```sql
create table if not exists public.nutrition_substitutions (
  id uuid primary key default gen_random_uuid(),
  meal_item_id uuid references public.nutrition_meal_items(id) on delete cascade,
  meal_id uuid references public.nutrition_meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alimento_original text,
  substituto text not null,
  quantidade_min numeric,
  quantidade_max numeric,
  unidade text default 'g',
  observacao text,
  created_at timestamptz default now()
);
```

### 7.7 SQL — nutrition_meal_logs

```sql
create table if not exists public.nutrition_meal_logs (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.nutrition_meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  status text not null default 'feito',
  observacao text,
  adaptacao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(meal_id, user_id, data)
);
```

Status possiveis:

- feito
- adaptado
- pulou
- pendente

---

## 8. Alteracoes em tabelas existentes

### 8.1 profiles

```sql
alter table public.profiles
add column if not exists nutrition_enabled boolean default false,
add column if not exists nutrition_mode text default 'simples',
add column if not exists nutrition_safety_status text default 'ok';
```

### 8.2 habits

```sql
alter table public.habits
add column if not exists nutrition_meal_id uuid references public.nutrition_meals(id) on delete set null;
```

### 8.3 habit_logs

```sql
alter table public.habit_logs
add column if not exists nutrition_meal_log_id uuid references public.nutrition_meal_logs(id) on delete set null;
```

---

## 9. RLS das novas tabelas

### 9.1 Ativar RLS

```sql
alter table public.nutrition_plans enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.nutrition_meals enable row level security;
alter table public.nutrition_meal_items enable row level security;
alter table public.nutrition_substitutions enable row level security;
alter table public.nutrition_meal_logs enable row level security;
```

### 9.2 Policies padrao

Aplicar o mesmo principio para todas as tabelas nutricionais:

```sql
create policy "Users can read own rows"
on public.nutrition_plans
for select
using (user_id = auth.uid());

create policy "Users can insert own rows"
on public.nutrition_plans
for insert
with check (user_id = auth.uid());

create policy "Users can update own rows"
on public.nutrition_plans
for update
using (user_id = auth.uid());

create policy "Users can delete own rows"
on public.nutrition_plans
for delete
using (user_id = auth.uid());
```

Repetir para:

- nutrition_targets
- nutrition_meals
- nutrition_meal_items
- nutrition_substitutions
- nutrition_meal_logs

---

## 10. Indices recomendados

```sql
create index if not exists idx_nutrition_plans_user_status
on public.nutrition_plans(user_id, status);

create index if not exists idx_nutrition_targets_plan
on public.nutrition_targets(plan_id);

create index if not exists idx_nutrition_meals_plan_user
on public.nutrition_meals(plan_id, user_id);

create index if not exists idx_nutrition_meals_user_active
on public.nutrition_meals(user_id, ativo);

create index if not exists idx_nutrition_meal_items_meal
on public.nutrition_meal_items(meal_id);

create index if not exists idx_nutrition_substitutions_meal_item
on public.nutrition_substitutions(meal_item_id);

create index if not exists idx_nutrition_meal_logs_user_date
on public.nutrition_meal_logs(user_id, data);
```

---

## 11. Edge Functions novas

Criar:

- nutrition-generate-plan
- nutrition-apply-plan
- nutrition-get-today
- nutrition-log-meal
- nutrition-swap-meal
- nutrition-update-meal

### 11.1 nutrition-generate-plan

Responsabilidade:

Gerar plano nutricional estruturado com IA, sem salvar no banco.

Entrada esperada:

- perfil completo do onboarding
- modo do plano: simples, detalhado ou profissional

Saida esperada:

- plano_nutricional
- metas
- refeicoes
- itens por refeicao
- substituicoes
- avisos de seguranca

Regras:

- Validar usuario autenticado.
- Validar seguranca antes de chamar IA.
- Nao salvar no banco.
- Retornar risk: true em caso sensivel.
- Usar faixas de quantidade.
- Nao gerar prescricao agressiva.

### 11.2 nutrition-apply-plan

Responsabilidade:

Salvar plano aprovado pelo usuario.

Fluxo interno:

1. Validar usuario.
2. Validar plano.
3. Arquivar plano ativo anterior, se existir.
4. Criar nutrition_plans.
5. Criar nutrition_targets.
6. Criar nutrition_meals.
7. Criar nutrition_meal_items.
8. Criar nutrition_substitutions.
9. Criar habits de alimentacao conectados as refeicoes.
10. Criar habit_schedules nos horarios das refeicoes.
11. Atualizar profile.nutrition_enabled = true.
12. Atualizar profile.nutrition_mode.

### 11.3 nutrition-get-today

Responsabilidade:

Buscar plano alimentar do dia.

Entrada:

- date

Saida:

- plan
- targets
- meals
- items
- substitutions
- log de cada refeicao

### 11.4 nutrition-log-meal

Responsabilidade:

Marcar refeicao como feita, adaptada, pulada ou pendente.

Regras:

- Validar se meal_id pertence ao usuario.
- Criar ou atualizar nutrition_meal_logs.
- Se status for feito ou adaptado, tambem marcar o habito correspondente como feito.
- Se status for pulou, registrar no log nutricional, mas nao marcar habito como feito.

### 11.5 nutrition-swap-meal

Responsabilidade:

Gerar alternativa para uma refeicao.

Entrada:

- meal_id
- reason
- preferencia

Saida:

- refeicao alternativa
- mensagem para o usuario
- opcoes de acao: usar hoje, salvar como padrao ou cancelar

### 11.6 nutrition-update-meal

Responsabilidade:

Atualizar uma refeicao do plano como padrao.

Uso:

- Quando o usuario escolhe salvar uma troca como padrao.
- Quando a IA ajusta o plano.
- Quando o usuario edita manualmente uma refeicao.

---

## 12. Alteracoes no prompt da IA

### 12.1 Novo formato do resultado

Formato desejado:

```txt
perfil
lembretes
plano_nutricional
```

O plano_nutricional deve conter:

- ativo
- modo
- objetivo
- metas
- refeicoes
- itens
- substituicoes
- observacoes de seguranca

### 12.2 Prompt base

```txt
Voce e uma IA de organizacao de rotina saudavel e nutricao comportamental.

Sua funcao e montar um plano alimentar pratico, seguro e aplicavel com base nos dados fornecidos.

Regras obrigatorias:
- Nao substitua nutricionista, medico ou psicologo.
- Nao gere plano com gramas para menores de 18 anos.
- Nao gere plano com gramas para gestantes, lactantes, pessoas com doenca relevante, uso de medicacao continua ou sinais de transtorno alimentar.
- Nao recomende dietas extremas, jejum extremo, detox, laxantes, diureticos ou punicao alimentar.
- Use quantidades aproximadas em faixas.
- Priorize alimentos simples e comuns no Brasil.
- Explique de forma pratica.
- Gere refeicoes conectadas aos horarios informados.
- Use substituicoes simples.
- Nao crie metas agressivas.

Formato obrigatorio:
Retorne apenas JSON valido dentro do bloco PLANO_NUTRICIONAL.
```

---

## 13. Frontend — novos componentes

Criar pasta:

```txt
src/components/nutrition/
```

Componentes:

- NutritionPlanPreview.jsx
- NutritionTargetsCard.jsx
- NutritionMealCard.jsx
- NutritionMealDetails.jsx
- NutritionMealItems.jsx
- NutritionSubstitutions.jsx
- NutritionModeSelector.jsx
- MealSwapDrawer.jsx

### 13.1 NutritionPlanPreview

Responsavel por mostrar o plano na etapa de revisao do onboarding.

Deve exibir:

- Resumo do plano.
- Metas, se disponiveis.
- Refeicoes.
- Quantidades, se modo detalhado ou profissional.
- Substituicoes.
- Aviso de seguranca.

### 13.2 NutritionTargetsCard

Modo simples:

    Foco do plano:
    - proteina em todas as refeicoes
    - agua ao longo do dia
    - refeicoes simples e consistentes

Modo detalhado/profissional:

    Meta do dia
    Agua: 3L
    Proteina: 160g
    Carboidratos: 230g
    Gorduras: 65g
    Calorias estimadas: 2200 kcal

### 13.3 NutritionMealCard

Card fechado:

    Almoco
    12:00
    Proteina + carboidrato + legumes
    Ver refeicao

Card aberto:

    Almoco
    Sugestao:
    - Frango grelhado: 130g a 160g
    - Arroz cozido: 100g a 140g
    - Feijao: 70g a 100g
    - Salada/legumes: 1 a 2 porcoes

    Substituicoes:
    Frango -> peixe, ovos ou carne magra
    Arroz -> batata, macaxeira ou cuscuz

### 13.4 MealSwapDrawer

Conteudo:

    Trocar almoco

    Por que deseja trocar?
    - Nao tenho esse alimento
    - Quero algo mais rapido
    - Quero algo mais barato
    - Quero algo mais leve
    - Outro motivo

    Campo opcional:
    Explique o que voce tem disponivel.

    Gerar alternativa

---

## 14. Alteracoes nas paginas

### 14.1 OnboardingPage.jsx

Alteracoes:

- Adicionar nutrition_enabled no estado.
- Adicionar nutrition_mode no estado.
- Criar etapa de escolha do plano alimentar.
- Criar etapa de nivel de detalhe.
- Chamar nutrition-generate-plan quando necessario.
- Mostrar NutritionPlanPreview.
- Ao confirmar, chamar nutrition-apply-plan.

### 14.2 DashboardPage.jsx

Alteracoes:

- Buscar plano nutricional do dia.
- Conectar refeicoes aos habitos.
- Mostrar dados nutricionais nos cards de alimentacao.
- Exibir resumo do plano no topo, se ativo.

### 14.3 HabitCard.jsx

Alteracoes:

- Adicionar suporte a card expansivel.
- Se habit.nutrition_meal_id existir, mostrar Ver refeicao.
- Renderizar NutritionMealDetails dentro do card.
- Permitir marcar refeicao como feita.
- Permitir abrir MealSwapDrawer.

### 14.4 SettingsPage.jsx

Adicionar secao:

    Plano alimentar
    Status: Ativo/Inativo
    Modo: Simples/Detalhado/Profissional
    Alterar modo
    Regenerar plano
    Pausar plano alimentar

### 14.5 ChatPage.jsx

Permitir comandos:

- troca meu almoco
- nao tenho frango hoje
- quero jantar mais simples
- salva essa opcao como padrao
- hoje pulei o lanche
- fiz o almoco adaptado

A IA deve gerar acoes internas:

- NUTRITION_SWAP
- NUTRITION_UPDATE
- NUTRITION_LOG

---

## 15. Services no frontend

Criar arquivo:

```txt
src/services/nutritionService.js
```

Funcoes:

```js
import { supabase } from '../lib/supabase'

export async function generateNutritionPlan(perfil, mode) {
  const { data, error } = await supabase.functions.invoke('nutrition-generate-plan', {
    body: { perfil, mode },
  })
  if (error) throw error
  return data
}

export async function applyNutritionPlan(planoNutricional) {
  const { data, error } = await supabase.functions.invoke('nutrition-apply-plan', {
    body: { plano_nutricional: planoNutricional },
  })
  if (error) throw error
  return data
}

export async function getTodayNutrition(date) {
  const { data, error } = await supabase.functions.invoke('nutrition-get-today', {
    body: { date },
  })
  if (error) throw error
  return data
}

export async function logMeal(payload) {
  const { data, error } = await supabase.functions.invoke('nutrition-log-meal', {
    body: payload,
  })
  if (error) throw error
  return data
}

export async function swapMeal(payload) {
  const { data, error } = await supabase.functions.invoke('nutrition-swap-meal', {
    body: payload,
  })
  if (error) throw error
  return data
}
```

---

## 16. Hook useTodayNutrition

Criar arquivo:

```txt
src/hooks/useTodayNutrition.js
```

Responsabilidade:

- Buscar plano do dia.
- Controlar loading.
- Controlar erro.
- Expor meals.
- Expor targets.
- Expor refresh.

Codigo sugerido:

```js
import { useEffect, useState } from 'react'
import { getTodayNutrition } from '../services/nutritionService'

export function useTodayNutrition(date) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await getTodayNutrition(date)
      setData(result)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [date])

  return { data, loading, error, refresh: load }
}
```

---

## 17. Relacao entre habitos e plano nutricional

Quando o plano for aplicado:

1. Criar nutrition_plan.
2. Criar nutrition_targets.
3. Para cada refeicao, criar nutrition_meal.
4. Para cada alimento, criar nutrition_meal_item.
5. Para cada substituicao, criar nutrition_substitution.
6. Para cada refeicao, criar um habit de categoria alimentacao.
7. Definir habit.nutrition_meal_id = nutrition_meal.id.
8. Criar habit_schedule com o horario da refeicao.

Exemplo:

    nutrition_meal: Almoco — 12:00
    habit: Almoco — categoria alimentacao
    habit_schedule: 12:00, todos os dias ou dias definidos

Quando marcar refeicao como feita:

1. Criar ou atualizar nutrition_meal_logs.
2. Criar ou atualizar habit_logs.
3. Atualizar dashboard.
4. Atualizar progresso.

---

## 18. Regras de seguranca nutricional

### 18.1 Bloqueios obrigatorios

Nao gerar plano nutricional detalhado se:

- idade menor que 18;
- gestante;
- lactante;
- doenca diagnosticada sem acompanhamento;
- uso de medicacao continua sem acompanhamento;
- sinais de transtorno alimentar;
- historico de transtorno alimentar;
- baixo peso;
- meta agressiva;
- perda rapida de peso.

### 18.2 Plano permitido nesses casos

Apenas habitos gerais:

- beber agua;
- organizar horarios;
- sono;
- atividade leve, se apropriado;
- lembrete de consulta;
- refeicoes regulares sem quantidades.

### 18.3 Frases proibidas

Evitar:

- Voce precisa comer exatamente isso.
- Voce deve perder X kg em Y dias.
- Se falhar, compense amanha.
- Corte tudo.
- Faca jejum extremo.
- Use laxantes, diureticos ou detox.

### 18.4 Frases recomendadas

Usar:

- Sugestao inicial.
- Quantidade aproximada.
- Faixa sugerida.
- Ajuste conforme sua rotina.
- Consistencia antes de perfeicao.
- Este plano nao substitui acompanhamento profissional.

---

## 19. UX mobile

### 19.1 Tela inicial limpa

A tela inicial deve mostrar resumo, nao todos os detalhes.

Estrutura:

    Inicio

    Ola, Herickson
    Hoje o foco e consistencia.

    Agua: 1.2L / 3L
    Habitos: 3/8
    Plano alimentar: ativo

    Prioridades de hoje
    1. Agua
    2. Almoco
    3. Treino

    Hoje
    Cards

### 19.2 Cards recolhidos por padrao

Todos os cards devem vir fechados. O detalhe aparece somente quando o usuario tocar na seta.

### 19.3 Modo compacto

Mostrar apenas:

- nome da refeicao;
- horario;
- botao feito;
- seta para detalhe.

### 19.4 Modo detalhado

Mostrar:

- macros;
- gramas;
- substituicoes;
- observacoes.

---

## 20. Metricas da feature

Registrar eventos:

- nutrition_plan_enabled
- nutrition_plan_skipped
- nutrition_plan_generated
- nutrition_plan_generation_failed
- nutrition_plan_applied
- nutrition_meal_viewed
- nutrition_meal_expanded
- nutrition_meal_logged_done
- nutrition_meal_logged_adapted
- nutrition_meal_logged_skipped
- nutrition_meal_swapped
- nutrition_swap_saved_today
- nutrition_swap_saved_default
- nutrition_plan_paused
- nutrition_plan_regenerated

---

## 21. Criterios de sucesso

A feature sera considerada bem implementada se:

- Usuario entende o que comer sem precisar perguntar.
- Usuario consegue ver o plano dentro do Inicio.
- Usuario consegue marcar refeicao como feita.
- Usuario consegue trocar uma refeicao facilmente.
- Plano nao deixa o app visualmente pesado.
- Plano respeita seguranca e casos sensiveis.
- Plano ajuda leigos e usuarios avancados.
- Chat consegue adaptar refeicoes.
- Progresso consegue refletir adesao alimentar.

---

## 22. Checklist tecnico

Backend:

- Criar migrations das tabelas nutricionais.
- Criar RLS das tabelas nutricionais.
- Criar indices.
- Criar validators nutricionais.
- Criar nutrition-generate-plan.
- Criar nutrition-apply-plan.
- Criar nutrition-get-today.
- Criar nutrition-log-meal.
- Criar nutrition-swap-meal.
- Criar nutrition-update-meal.
- Atualizar agent-chat para interpretar comandos nutricionais.
- Atualizar parsing de blocos para PLANO_NUTRICIONAL.

Frontend:

- Adicionar nutrition_enabled no onboarding.
- Adicionar nutrition_mode no onboarding.
- Criar etapa de plano alimentar opcional.
- Criar preview do plano nutricional.
- Criar nutritionService.js.
- Criar useTodayNutrition.
- Criar NutritionTargetsCard.
- Criar NutritionMealCard.
- Criar NutritionMealDetails.
- Criar NutritionSubstitutions.
- Criar MealSwapDrawer.
- Alterar DashboardPage.
- Alterar HabitCard.
- Alterar SettingsPage.
- Alterar ChatPage para acoes nutricionais.

IA:

- Criar prompt especifico para plano nutricional.
- Criar prompt de substituicao de refeicao.
- Criar prompt de simplificacao de refeicao.
- Criar validacao pos-IA.
- Impedir plano com gramas em casos sensiveis.
- Usar faixas de quantidades, nao numeros rigidos.
- Usar alimentos comuns e acessiveis.

---

## 23. Ordem recomendada de implementacao

### Etapa 1 — Banco

1. Criar tabelas nutricionais.
2. Criar RLS.
3. Criar indices.
4. Alterar profiles.
5. Alterar habits.
6. Alterar habit_logs.

### Etapa 2 — Backend basico

1. Criar validators nutricionais.
2. Criar nutrition-generate-plan.
3. Criar nutrition-apply-plan.
4. Criar nutrition-get-today.

### Etapa 3 — Onboarding

1. Adicionar pergunta quer plano alimentar.
2. Adicionar escolha de modo.
3. Enviar dados para nutrition-generate-plan.
4. Mostrar preview.
5. Aplicar plano aprovado.

### Etapa 4 — Dashboard/Inicio

1. Criar hook useTodayNutrition.
2. Buscar plano do dia.
3. Conectar refeicoes aos habitos.
4. Criar cards expansivos.
5. Mostrar detalhes da refeicao dentro do habito.

### Etapa 5 — Acoes

1. Marcar refeicao como feita.
2. Registrar refeicao adaptada.
3. Trocar refeicao.
4. Simplificar refeicao.
5. Salvar troca como padrao.

### Etapa 6 — Chat

1. Interpretar comandos nutricionais.
2. Gerar substituicoes.
3. Atualizar refeicao.
4. Registrar logs pelo chat.

### Etapa 7 — Polimento

1. Melhorar UX mobile.
2. Criar modo compacto.
3. Criar modo detalhado.
4. Adicionar mensagens de seguranca.
5. Testar com usuarios reais.

---

## 24. MVP recomendado

Primeira versao deve conter:

- Plano nutricional opcional.
- Modo simples e detalhado.
- Metas gerais.
- Refeicoes com quantidades aproximadas.
- Substituicoes simples.
- Cards expansivos no Inicio.
- Marcar refeicao como feita.
- Trocar refeicao pelo chat.
- Pausar ou regenerar plano em Configuracoes.

Nao implementar na primeira versao:

- Contador de calorias consumidas.
- Banco gigante de alimentos.
- Escaneamento de codigo de barras.
- Integracao com balanca.
- Ranking.
- Plano familiar.
- Exportacao em PDF.

---

## 25. Versoes da feature

### Versao 1.0

Inclui:

- Onboarding pergunta se deseja plano alimentar.
- Usuario escolhe modo simples, detalhado ou profissional.
- IA gera plano alimentar estruturado.
- Usuario revisa antes de ativar.
- Plano e salvo no Supabase.
- Habitos de alimentacao se conectam as refeicoes.
- Inicio mostra cards expansivos.
- Usuario marca refeicao como feita.
- Usuario troca refeicao pelo chat.
- Configuracoes permitem pausar plano.

### Versao 1.1

Inclui:

- Opcao usar so hoje.
- Opcao salvar como padrao.
- Log de refeicao adaptada.
- Melhorar relatorio de progresso nutricional.
- Mostrar aderencia alimentar.
- Mostrar refeicao mais seguida.
- Mostrar refeicao mais dificil.

### Versao 1.2

Inclui:

- Relatorio semanal com IA.
- Sugestoes de ajuste semanal.
- Lista de compras simples.
- Exportacao do plano.
- Modo profissional para personal/nutricionista.

---

## 26. Resultado esperado

Depois dessa implementacao, o Streak Life deixara de ser apenas:

    App de habitos com lembretes de alimentacao.

E passara a ser:

    App de rotina saudavel com IA, habitos, plano alimentar opcional e acompanhamento diario.

Diferencial:

    A pessoa nao entra no app para estudar nutricao.
    Ela entra para saber exatamente o que fazer hoje.

---

## 27. Resumo executivo

A feature deve ser construida em cima de quatro decisoes centrais:

1. Plano nutricional e opcional.
2. Plano aparece dentro do Inicio, sem criar uma aba obrigatoria nova.
3. Cada refeicao vira um card expansivo conectado ao habito.
4. Quantidades sao aproximadas, seguras e ajustaveis.

Essa abordagem mantem o app simples, profissional, mobile first e aplicavel tanto para usuarios leigos quanto para usuarios mais tecnicos.
