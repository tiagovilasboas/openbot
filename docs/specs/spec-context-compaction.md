# Especificação Técnica: Compactação e Monitoramento de Contexto (UC-09)

## 1. Visão Geral

No `openbot.run`, cada agente monitora continuamente o tamanho do seu histórico de conversas em bytes e tokens. Quando a thread cresce e se aproxima do teto da janela de contexto do modelo, o sistema dispara um processo de **Auto-Compaction**, evitando estouro de tokens (erros de context window exceeded) e economizando latência e custos.

No **OpenBot PWA**, o mecanismo roda no cliente: a estimativa e a decisão de compactar são determinísticas, e só a síntese chama o modelo, pela rota de chat comum.

---

## 2. Casos de Uso Detalhados

### UC-09.1: Rastreamento em Tempo Real da Janela de Contexto

- **Ator:** Sistema.
- **Entrada:** Array de mensagens da conversa ativa.
- **Fluxo Principal:**
  1. Calcula a estimativa de tokens do que seria enviado (heurística de 4 caracteres por token).
  2. Compara o total com a janela do modelo ativo.
  3. Mostra o percentual no selo do modelo na UI.

### UC-09.2: Auto-Compaction de Turnos Históricos

- **Ator:** Sistema (Automático).
- **Gatilho:** antes de enviar um turno, a estimativa do que seria enviado (as últimas mensagens mais o prompt de sistema) chega a **75%** da janela do modelo (`COMPACTION_THRESHOLD` em `calculate-context-budget.ts`).
- **Fluxo Principal** (`src/features/compaction`, chamado por `use-chat-turns.ts` antes de cada turno):
  1. `planCompaction` separa a conversa em turnos antigos e os **6 últimos** (`RECENT_MESSAGES`). O corte sempre cai no início de uma troca (a parte recente abre numa mensagem do usuário), e uma resposta interrompida fica junto da pergunta que respondeu.
  2. O modelo recebe um pedido de síntese factual com os turnos antigos como dado delimitado (`untrusted-text`), em até 3000 caracteres (`SUMMARY_MAX_CHARS`), nos blocos "Decisões", "Fatos" e "Pendências" (ou equivalentes em en e es).
  3. As mensagens antigas viram **uma mensagem-marcador** (`compacted`) com o resumo. As originais ficam arquivadas dentro do marcador, só para leitura, e nunca vão ao modelo. O marcador guarda no máximo **400** originais (`ARCHIVED_MAX`; as mais novas ficam e a contagem total continua correta). Uma nova compactação dobra o marcador anterior no novo.
  4. Na conversa aparece um divisor ("Histórico anterior compactado (N mensagens)") que mostra ou oculta as mensagens arquivadas.
  5. Ao montar o histórico enviado, o marcador vira uma entrada de usuário com o resumo, prefixado e delimitado como dado, porque foi escrito por um modelo.
- **Limite do servidor:** o servidor corta cada mensagem em **4000 caracteres** e aceita 50 por pedido. Por isso o pedido de síntese vai em **blocos** de até 3400 caracteres (cada turno entra com até 1500), no máximo 46 blocos; passando disso, ficam os blocos mais novos.
- **Casos em que não compacta:**
  - O orçamento está abaixo de 75%, ou há 6 mensagens ou menos fora do marcador.
  - A parte antiga contém passos de equipe (`crewStep`): conversas de sala de equipe são puladas, porque os passos alimentam a visão da sala.
- **Falha silenciosa:** sem resposta do modelo, resposta vazia, cancelamento ou conversa alterada durante a síntese, nada muda e o turno segue sem compactar. Nenhum erro é mostrado. O uso de tokens da síntese é registrado no bot.

### UC-09.1 na prática

O percentual aparece no selo do modelo (`useContextUsage`, #128). A janela vem de `model-context-window.ts` (catálogo de modelos gratuitos, prefixos `claude-`, `gpt-4o`, `gpt-4.1`; modelo desconhecido assume 32.768 tokens, de propósito pequeno). A estimativa é de 4 caracteres por token; o uso real de tokens é guardado por bot e dia, não por conversa, e não entra na conta.

---

## 3. Modelo de Dados e Contratos (TypeScript)

`ContextBudget` está em `src/features/context-window/calculate-context-budget.ts`. O marcador usa os tipos de `src/features/compaction/compaction-types.ts`.

```ts
export interface ContextBudget {
  totalEstimatedTokens: number;
  maxWindowTokens: number;
  usageRatio: number; // 0.0 a 1.0
  isCompactionRecommended: boolean; // usageRatio >= 0.75
}

// Campo `compacted` de uma MessageData (role "assistant"; o texto é o resumo).
export interface CompactedMeta {
  originalCount: number; // mensagens que o resumo representa, em todas as compactações
  compactedAt: string; // ISO da última compactação
  archived: MessageData[]; // até 400, somente leitura, nunca enviadas ao modelo
}
```

---

## 4. Tarefas e Estimativas (Story Points)

| Tarefa        | Descrição                                                | Pontos | Estado                                                                                        |
| :------------ | :------------------------------------------------------- | :----: | :-------------------------------------------------------------------------------------------- |
| **TASK-C1.1** | Função pura `calculateContextBudget(messages, model)`    |   2    | **Feito** (#128)                                                                              |
| **TASK-C1.2** | Indicador visual de uso de contexto no selo do modelo    |   1    | **Feito** (#128)                                                                              |
| **TASK-C1.3** | Compactação antes do turno e substituição pelo marcador  |   3    | **Feito** (#129), em `src/features/compaction` (não existe `compact-conversation-history.ts`) |
| **TASK-C1.4** | Divisor visual "Histórico compactado" com arquivo aberto |   2    | **Feito** (#129), `CompactedDivider.tsx`                                                      |

Não verificado: a compactação com um modelo real e a qualidade do resumo. Não há registro de rodada real; os testes injetam o pedido ao modelo.
