# Features, Roadmap e Tasks do OpenBot PWA

Este documento rastreia as features arquiteturais portadas do `openbot.run` e os marcos do OpenBot PWA, estruturados em tarefas com estimativa em Story Points (Fibonacci: 1, 2, 3, 5 — com teto de 5 pontos por tarefa).

---

## 1. Features Concluídas no Marco Atual (Portabilidade openbot.run)

| ID          | Feature                            | Pontos |    Status     | Entregáveis                                                                                                             |
| :---------- | :--------------------------------- | :----: | :-----------: | :---------------------------------------------------------------------------------------------------------------------- |
| **FEAT-01** | **Autenticação Local Offline**     |   3    | **Concluído** | `local-auth.ts`, `LockScreen.tsx`, criptografia PBKDF2 (SHA-256, 100k iterações, salt aleatório) e bloqueio de tela.    |
| **FEAT-02** | **Roteamento Dinâmico Free**       |   3    | **Concluído** | `/api/model/free`, suporte live ao OpenRouter Free e catálogo dos modelos da evidência (Nemotron, Gemma, Cohere, etc.). |
| **FEAT-03** | **Provider Failover Engine**       |   5    | **Concluído** | `failover-runner.ts`, comutação sob HTTP 429/5xx/timeout e badge de failover inline nas mensagens.                      |
| **FEAT-04** | **Fila FIFO de Mensagens**         |   3    | **Concluído** | `message-queue.ts`, `use-message-queue.ts`, envio não-bloqueante e indicador `X na fila` no composer.                   |
| **FEAT-05** | **Arquétipos e Templates de Bots** |   3    | **Concluído** | `bot-templates.ts`, `BotTemplatePicker.tsx` com 6 templates de engenharia aplicáveis em 1 clique.                       |
| **FEAT-06** | **Workspace Context por Bot**      |   2    | **Concluído** | Campo `workspaceContext` persistido em cada bot e injetado no prompt de sistema.                                        |
| **FEAT-07** | **Zero Mocks & Purificação**       |   2    | **Concluído** | Remoção de sandbox/simuladores, botões e SVGs limpos, delegação direta para LLMs.                                       |

---

## 2. Detalhamento das Tarefas Executadas

### FEAT-01: Autenticação Local Offline (3 pts)

- [x] **TASK-01.1**: Algoritmo PBKDF2 com Web Crypto API nativo (`crypto.subtle`).
- [x] **TASK-01.2**: Gerenciamento de credenciais com `useSyncExternalStore` para sincronia entre abas.
- [x] **TASK-01.3**: UI de tela de bloqueio com suporte a PIN/senha e reset com dica.
- [x] **TASK-01.4**: Testes unitários para round-trip de bytes, comparação em tempo constante e validação de salt.

### FEAT-02: Roteamento de Modelos Gratuitos (3 pts)

- [x] **TASK-02.1**: Implementação de cache de 5 minutos na rota `/api/model/free`.
- [x] **TASK-02.2**: Coleta dinâmica dos modelos `:free` direto da API do OpenRouter.
- [x] **TASK-02.3**: Sincronização da lista de fallback com os modelos observados (NVIDIA Nemotron 3.5, Gemma 4, Cohere, LiquidAI, Parallel, HeyGen).
- [x] **TASK-02.4**: Seletor e status dinâmico na aba de modelos das configurações.

### FEAT-03: Provider Failover Engine (5 pts)

- [x] **TASK-03.1**: Criação do `failover-runner.ts` isolado para orquestração da cadeia de fallback.
- [x] **TASK-03.2**: Detecção de falhas de limite (429), instabilidade (5xx) e unreachable.
- [x] **TASK-03.3**: Roteamento automático para modelo secundário livre quando no provedor router.
- [x] **TASK-03.4**: Retorno de metadados `failover` na resposta da API e renderização de badge visual no chat.
- [x] **TASK-03.5**: Testes automatizados cobrindo sucesso primário, failover bem-sucedido e falha dupla.

### FEAT-04: Fila FIFO de Mensagens Não-Bloqueante (3 pts)

- [x] **TASK-04.1**: Criação de `message-queue.ts` com funções puras e testes de fila.
- [x] **TASK-04.2**: Integração do hook `use-message-queue.ts` no `ChatExperience.tsx`.
- [x] **TASK-04.3**: Liberação do composer durante `busy` para envio contínuo.
- [x] **TASK-04.4**: Despacho automático encadeado do próximo item da fila após o término do turno anterior.

### FEAT-05 & FEAT-06: Templates e Contexto de Workspace (5 pts)

- [x] **TASK-05.1**: Definição dos 6 arquétipos canônicos de engenharia (`bot-templates.ts`).
- [x] **TASK-05.2**: Criação do seletor `BotTemplatePicker.tsx` no modal de criação.
- [x] **TASK-05.3**: Persistência do campo `workspaceContext` no armazenamento de bots.
- [x] **TASK-05.4**: Injeção automática do contexto do workspace no prompt do sistema durante a execução.

---

## 3. Próximos Marcos (Backlog Priorizado)

| Marco           | Tarefa                             | Pontos | Dependência | Descrição                                                                     |
| :-------------- | :--------------------------------- | :----: | :---------: | :---------------------------------------------------------------------------- |
| **M1: Mobile**  | Validação PWA em dispositivo real  |   3    |      —      | Testar instalação real no iOS/Android via HTTPS local (Tailscale ou mkcert).  |
| **M2: Context** | Anexos de Arquivos / Repositório   |   5    |   FEAT-06   | Permitir upload de arquivo de contexto ou apontar repositório Git local.      |
| **M3: MCP**     | Cliente MCP Local para Ferramentas |   5    |      —      | Integração com MCP servers locais para ferramentas sob demanda.               |
| **M4: Rotinas** | Agendador de Rotinas Silenciosas   |   5    |   FEAT-04   | Execução de tarefas em segundo plano inspiradas nas rotinas do `openbot.run`. |
