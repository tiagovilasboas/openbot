# Especificação Técnica: Laço de Ferramentas com Aprovação

Entregue em #130 a #135. Código: `src/features/tools/` (laço, ferramentas, rota, cliente) e `src/features/model/tool-wire.ts` (formato neutro de ferramentas e chamadas entre o laço e os adaptadores de modelo). Complementa a regra do roadmap: uma skill é instrução, não permissão; o executor valida cada chamada.

Estado: **desligado por padrão** e **não exercitado com modelo real** (ver o roadmap).

## 1. Quando um turno usa ferramentas

Todas as condições valem ao mesmo tempo (`tool-turn-handler.ts`, `tool-route.ts`, `execute-chat-message.ts`):

- A variável de ambiente do servidor `OPENBOT_TOOLS` está ligada (vazia, ausente, `0`, `false`, `off` ou `no` mantêm desligada).
- O bot tem `toolsEnabled` (opção por bot, no editor).
- O turno é de um bot único: **não** é o Chief nem um turno de equipe (`crew`).
- O pedido traz um `botId` válido.
- O modelo aceita chamadas de ferramenta nativas: hoje, só modelos do roteador cujo catálogo marca `supportsTools`, configurados pelo cliente ou pelo ambiente do servidor (`ROUTER_URL`/`ROUTER_MODEL`, desde #138; um endpoint local no ambiente tem prioridade). Anthropic e modelo local não usam ferramentas na v1. Quando o modelo não aceita, o turno corre como chat comum e a rota envia o evento `tools_unavailable`.

Sem essas condições, `POST /api/chat/tools` responde um turno novo exatamente como `/api/chat/stream`, porque o cliente não enxerga a variável do servidor. Um pedido de retomada com a porta desligada recebe 404 `tools_disabled`.

## 2. Rota `POST /api/chat/tools`

O corpo é o do chat comum mais os campos abaixo. A resposta é um fluxo NDJSON com os eventos do chat (`start`, `delta`, `done`, `error`), mais `tool_call`, `tool_result`, `memory_changed` e `tools_unavailable`. Origem, token, taxa e tamanho passam pelo `proxy.ts`, como nas outras rotas.

| Campo          | Tipo    | Descrição                                                   |
| -------------- | ------- | ----------------------------------------------------------- |
| `botId`        | string  | Bot que fala; obrigatório para usar ferramentas             |
| `toolsEnabled` | boolean | Opt-in do bot, enviado a cada pedido                        |
| `crew`         | boolean | `true` em turnos de equipe: nunca usam ferramentas          |
| `resume`       | objeto  | `{ turnId, decisions: [{ callId, decision, argsDigest }] }` |

`decision` é `once`, `always` ou `deny`. Cada pedido de retomada traz de 1 a 3 decisões, sem `callId` repetido.

## 3. Pausa e retomada

1. Uma ferramenta com política `ask` pausa o turno. O servidor grava o turno pendente (transcrição, chamadas e contadores) e envia `approval_required` com `turnId`, as chamadas (`callId`, nome, `preview`, `argsDigest`, `allowAlways`) e `expiresAt`. Há no máximo um turno pendente por bot; uma mensagem nova ao bot descarta o que esperava aprovação.
2. O usuário decide no cartão de aprovação. O cliente reenvia o mesmo pedido de chat com `resume`.
3. O servidor lê o turno **do próprio registro**, nunca da cópia do cliente. Cada decisão está ligada ao `callId` e ao `argsDigest` (sha256 dos argumentos guardados); uma decisão que não confere com a chamada guardada não aprova nada. O pedido de retomada precisa ser o mesmo que pausou (resumo sha256 de bot, idioma e mensagens).
4. Dois pedidos de retomada simultâneos: só um fecha o turno; o outro recebe 409. Se nenhuma chamada foi aprovada, o turno fecha como negado.

### Respostas de erro da retomada

| Status | `error`            | Significado                                                                  |
| ------ | ------------------ | ---------------------------------------------------------------------------- |
| 409    | `digest_mismatch`  | O pedido não é o que pausou (mensagens, idioma ou bot diferentes)            |
| 409    | `turn_not_pending` | Outra retomada já fechou o turno                                             |
| 410    | `turn_expired`     | Não há turno pendente com esse `turnId` (inexistente, vencido ou descartado) |
| 410    | `turn_damaged`     | O registro do turno estava ilegível; é fechado como vencido                  |

Outros códigos da rota: 400 `invalid_request`, 413 `payload_too_large`, 429 `too_many_streams`, 503 `no_provider_configured`.

### Modelos de reserva

O pedido pode trazer `backupModelIds` (até 3), validado por `parseChatRequest` e filtrado pela lista `OPENBOT_ALLOWED_MODELS` como na rota de stream; o modelo principal fora da lista continua sendo recusado com 400. Cada passo do laço usa a mesma política de `streamWithFailover` (sem duplicá-la): a troca só acontece **antes de o passo produzir qualquer saída**, isto é, antes do primeiro texto ou da primeira chamada de ferramenta. Como as chamadas só rodam depois que o passo termina, uma troca nunca repete uma chamada aprovada ou já executada: a transcrição (resultados já embrulhados como dado externo) segue para o modelo de reserva como dado. Depois de um passo ter começado a emitir, uma falha vira evento `error` e não há nova tentativa. Quando um passo migra para um modelo de reserva, os passos seguintes do turno ficam nele, em vez de consultar de novo o modelo que falhou, e o primeiro aviso `failover` vai no `done` final (o servidor registra `model.failover` a cada troca). Uma retomada por `turnId` começa de novo pelo modelo principal do pedido; o resumo (`argsDigest`, bot, idioma, mensagens) não inclui modelos, então a retomada pode usar outro modelo de reserva sem afetar as aprovações.

## 4. Limites

Valores de `tool-budget.ts`, `pending-turns-repository.ts` e das definições das ferramentas. Passos e chamadas contam também entre retomadas.

| Limite                       | Valor             |
| ---------------------------- | ----------------- |
| Passos do modelo por turno   | 4                 |
| Chamadas por turno           | 6                 |
| Chamadas por passo           | 3                 |
| Texto de resultado por turno | 24.000 caracteres |
| Tempo por ferramenta         | 10 s              |
| Validade de um turno pausado | 15 min            |

Ao estourar um limite, a chamada é recusada com um código fixo (por exemplo `call_budget_exceeded`) e o turno segue sem ela. Resultados de ferramenta voltam ao modelo delimitados como dado externo, nunca como instrução.

## 5. Ferramentas da v1

| Ferramenta               | Política | Sempre permitir | O que faz                                                                                   |
| ------------------------ | -------- | --------------- | ------------------------------------------------------------------------------------------- |
| `github_list_open_items` | `auto`   | Não             | Lista issues e PRs abertos de um repositório (até 30, mais novos primeiro). Somente leitura |
| `memory_add_note`        | `ask`    | Sim             | Grava uma nota na memória do bot; pede aprovação a cada vez, a menos que haja concessão     |

`github_list_open_items` recebe `owner`, `repo` e `kind` opcional; o repositório passa pelo mesmo validador do painel do GitHub. `memory_add_note` recebe `text`, até o limite de uma nota da memória.

**Sempre permitir** só existe para ferramentas que o permitem (`allowAlways`) e só nasce de uma decisão `always` ligada a uma chamada guardada. Nada vindo do modelo, de skills ou de importações cria uma concessão. A concessão vale por bot e ferramenta.

## 6. Auditoria e dados

- Cada chamada gera uma linha em `tool_audit`: bot, turno, chamada, ferramenta, política, decisão, resultado, duração e o **sha256 dos argumentos**. Os argumentos em si não são gravados na auditoria.
- Apagar um bot apaga as concessões dele e expira o turno pendente (`forgetBotTools`, chamado quando `/api/bots` remove um bot). A auditoria é mantida de propósito.
- As tabelas (`tool_pending_turns`, `tool_grants`, `tool_audit`) ficam no banco local descrito em [spec-mvp-features-bff-front.md](spec-mvp-features-bff-front.md).

## 7. Interface

- O editor do bot tem o interruptor de ferramentas (`BotToolsToggle`).
- O cartão de aprovação (`ApprovalCard`) mostra a pré-visualização da chamada e as opções permitir uma vez, sempre permitir (quando oferecido) e negar.
- Os passos aparecem como chips na mensagem (`ToolStepChips`) e a linha de atividade mostra a fase "ferramenta" enquanto uma chamada roda.

## 8. Não verificado

- Nenhuma rodada com modelo real chamou uma ferramenta; os testes usam modelos e respostas simulados.
- Quais modelos gratuitos do catálogo realmente entregam chamadas bem formadas não foi medido.
