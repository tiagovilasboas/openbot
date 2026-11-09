# Especificação Técnica: Compactação e Monitoramento de Contexto (UC-09)

## 1. Visão Geral

No `openbot.run`, cada agente monitora continuamente o tamanho do seu histórico de conversas em bytes e tokens. Quando a thread cresce e se aproxima do teto da janela de contexto do modelo, o sistema dispara um processo de **Auto-Compaction**, evitando estouro de tokens (erros de context window exceeded) e economizando latência e custos.

No **OpenBot PWA**, implementamos esse mecanismo como um sensor determinístico no cliente e no servidor.

---

## 2. Casos de Uso Detalhados

### UC-09.1: Rastreamento em Tempo Real da Janela de Contexto

- **Ator:** Sistema.
- **Entrada:** Array de mensagens da conversa ativa.
- **Fluxo Principal:**
  1. A cada nova mensagem, o sistema calcula a estimativa de tokens acumulados (heurística de 4 caracteres por token ou contagem UTF-8 exata).
  2. Compara o total com a capacidade do modelo ativo (ex: 262.144 tokens para `openrouter/free` ou 1.000.000 tokens para Nemotron).
  3. Disponibiliza o percentual de consumo para o badge do modelo na UI (ex: `12% da janela`).

### UC-09.2: Auto-Compaction de Turnos Históricos

- **Ator:** Sistema (Automático).
- **Gatilho:** A conversa atinge o limiar configurado (ex: 20 mensagens ou >75% da janela útil).
- **Fluxo Principal:**
  1. O sistema divide a conversa em:
     - **Turnos Antigos:** Mensagens da posição 0 até `N - 6`.
     - **Janela Ativa Recente:** Os últimos 6 turnos (3 perguntas do usuário e 3 respostas).
  2. O sistema executa um prompt de síntese factual (`summarize-conversation`) sobre os turnos antigos.
  3. As mensagens antigas são compactadas em uma única entidade de sistema:
     `[Histórico Consolidado: Principais decisões, arquivos citados e contexto acordado...]`.
  4. O histórico persistido é atualizado, liberando espaço sem perda da linha de raciocínio.
  5. Uma nota sutil é exibida na linha do tempo: `"✦ Histórico anterior compactado automaticamente"`.

---

## 3. Modelo de Dados e Contratos (TypeScript)

```ts
export interface ContextBudget {
  totalEstimatedTokens: number;
  maxWindowTokens: number;
  usageRatio: number; // 0.0 a 1.0
  isCompactionRecommended: boolean;
}

export interface CompactedTurn {
  id: number;
  role: "system";
  text: string;
  isCompactedHistory: true;
  originalMessageCount: number;
  compactedAt: string;
}
```

---

## 4. Tarefas e Estimativas (Story Points)

| Tarefa        | Descrição                                                 | Pontos | Critério de Aceite                                               |
| :------------ | :-------------------------------------------------------- | :----: | :--------------------------------------------------------------- |
| **TASK-C1.1** | Função pura `calculateContextBudget(messages, model)`     |   2    | Testes unitários validando estimativas de tokens e gatilhos.     |
| **TASK-C1.2** | Indicador visual de uso de contexto no `ModelStatusBadge` |   1    | Exibição de tooltip ou pill discreto com % de contexto.          |
| **TASK-C1.3** | Módulo de compactação `compact-conversation-history.ts`   |   3    | Geração de resumo e substituição atômica no armazenamento local. |
| **TASK-C1.4** | Inserção do divisor visual `"Histórico compactado"` na UI |   2    | Linha divisória colapsável para acessar mensagens arquivadas.    |
