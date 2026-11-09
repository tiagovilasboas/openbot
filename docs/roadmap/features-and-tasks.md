# Features, Roadmap e Tasks do OpenBot PWA

Este documento rastreia todas as features e casos de uso (UC-01 a UC-12) derivados da Engenharia Reversa do `openbot.run` (`nightly-labs/openbot`), estruturados em ondas de entrega com estimativas em Story Points (Fibonacci: 1, 2, 3, 5 — com teto de 5 pontos por tarefa).

---

## 1. Wave 1: Core Essentials & Resiliência (Concluída)

| ID          | Caso de Uso | Feature                                                    | Pontos |    Status     |
| :---------- | :---------- | :--------------------------------------------------------- | :----: | :-----------: |
| **FEAT-01** | UC-12       | **Autenticação Local Offline** (PBKDF2 SHA-256)            |   3    | **Concluído** |
| **FEAT-02** | UC-02       | **Roteamento Dinâmico Free** (OpenRouter Live + Fallbacks) |   3    | **Concluído** |
| **FEAT-03** | UC-03       | **Provider Failover Engine** (Contingência sob 429/5xx)    |   5    | **Concluído** |
| **FEAT-04** | UC-04       | **Fila FIFO de Mensagens** (Envio contínuo não-bloqueante) |   3    | **Concluído** |
| **FEAT-05** | UC-01       | **Arquétipos e Templates de Bots** (6 arquétipos 1-click)  |   3    | **Concluído** |
| **FEAT-06** | UC-10       | **Workspace Context por Bot** (Diretrizes e escopo)        |   2    | **Concluído** |
| **FEAT-07** | UC-02       | **Purificação de Mocks** (Delegação pura para LLMs)        |   2    | **Concluído** |

### Tarefas Executadas na Wave 1:

- [x] **TASK-01.1**: Criptografia nativa com Web Crypto API (`crypto.subtle`, 100k iterações, salt 16-byte).
- [x] **TASK-01.2**: Tela de bloqueio (`LockScreen.tsx`) com desbloqueio offline e aba de segurança.
- [x] **TASK-02.1**: Rota `/api/model/free` com cache de 5min e coleta dinâmica de modelos `:free`.
- [x] **TASK-02.2**: Catálogo de fallback atualizado com a evidência de modelos gratuitos da comunidade.
- [x] **TASK-03.1**: Módulo isolado `failover-runner.ts` para chaveamento automático de provedor.
- [x] **TASK-03.2**: Renderização de badge de failover inline nas mensagens de resposta.
- [x] **TASK-04.1**: Estrutura de dados `message-queue.ts` e hook reativo `use-message-queue.ts`.
- [x] **TASK-04.2**: Suporte a digitação e submissão contínua com indicador `X na fila`.
- [x] **TASK-05.1**: Catálogo canônico `bot-templates.ts` (Architect, Reviewer, AppSec, DevOps, Writer, Bug Hunter).
- [x] **TASK-05.2**: Modal `BotTemplatePicker.tsx` com aplicação de arquétipo em um clique.
- [x] **TASK-06.1**: Campo persistente `workspaceContext` em `BotProfile` e injeção no prompt de sistema.

---

## 2. Wave 2: Contexto, Repositórios e Memória (Próxima Onda)

| ID          | Caso de Uso | Feature                                         | Pontos | Dependência |  Status   |
| :---------- | :---------- | :---------------------------------------------- | :----: | :---------: | :-------: |
| **FEAT-08** | UC-10       | **Anexos de Arquivos e Repositórios Locais**    |   5    |   FEAT-06   | Planejado |
| **FEAT-09** | UC-09       | **Monitoramento de Contexto & Auto-Compaction** |   5    |      —      | Planejado |
| **FEAT-10** | UC-02       | **Instalação PWA Real e HTTPS Local**           |   3    |      —      | Planejado |

### Tarefas da Wave 2:

- [ ] **TASK-08.1**: Suporte a upload/leitura de arquivos locais de texto/código no `ChatComposer`.
- [ ] **TASK-08.2**: Armazenamento indexado local dos arquivos atrelados ao workspace do bot.
- [ ] **TASK-08.3**: Injeção ponderada de trechos relevantes no contexto do modelo.
- [ ] **TASK-09.1**: Contador de bytes e estimativa de tokens acumulados na conversa.
- [ ] **TASK-09.2**: Gatilho de compactação/resumo quando o histórico ultrapassar 80% da janela.
- [ ] **TASK-10.1**: Validação de manifesto PWA e Service Worker em dispositivos iOS e Android reais.

---

## 3. Wave 3: Colaboração e Multi-Agente Avançado

| ID          | Caso de Uso | Feature                             | Pontos | Dependência |  Status   |
| :---------- | :---------- | :---------------------------------- | :----: | :---------: | :-------: |
| **FEAT-11** | UC-05       | **Canais de Equipe Compartilhados** |   5    |   FEAT-05   | Planejado |
| **FEAT-12** | UC-05       | **Anti-Loop entre Bots Teammates**  |   3    |   FEAT-11   | Planejado |
| **FEAT-13** | UC-01       | **Threads Paralelas de Execução**   |   3    |   FEAT-04   | Planejado |

### Tarefas da Wave 3:

- [ ] **TASK-11.1**: Interface de canal unificado onde múltiplos bots coexistem na mesma timeline.
- [ ] **TASK-11.2**: Mecanismo de reatribuição e delegação de dono da tarefa (task owner).
- [ ] **TASK-12.1**: Regra e instrução no prompt impedindo loops infinitos de confirmação entre agentes.
- [ ] **TASK-13.1**: Sub-threads para rotinas ou tarefas específicas que não poluem o chat principal.

---

## 4. Wave 4: Automação, Rotinas e Extensões

| ID          | Caso de Uso | Feature                                  | Pontos | Dependência |  Status   |
| :---------- | :---------- | :--------------------------------------- | :----: | :---------: | :-------: |
| **FEAT-14** | UC-06       | **Rotinas Silenciosas em Segundo Plano** |   5    |   FEAT-04   | Planejado |
| **FEAT-15** | UC-07       | **Loopback Automation API Local**        |   3    |   FEAT-01   | Planejado |
| **FEAT-16** | UC-11       | **Cliente MCP Dinâmico Local**           |   5    |      —      | Planejado |

### Tarefas da Wave 4:

- [ ] **TASK-14.1**: Suporte aos marcadores `routine_no_update` e `routine_report_failure`.
- [ ] **TASK-14.2**: Execução agendada via Web Workers e notificação apenas quando houver novidade.
- [ ] **TASK-15.1**: Endpoint HTTP local para disparos vindos de scripts bash/python do usuário.
- [ ] **TASK-16.1**: Descoberta e execução sob demanda de ferramentas de servidores MCP locais.

---

## 5. Wave 5: Navegação e Inspeção Web

| ID          | Caso de Uso | Feature                                 | Pontos | Dependência |  Status   |
| :---------- | :---------- | :-------------------------------------- | :----: | :---------: | :-------: |
| **FEAT-17** | UC-08       | **Ferramenta de Inspeção de Navegador** |   5    |      —      | Planejado |

### Tarefas da Wave 5:

- [ ] **TASK-17.1**: Conector headless CDP/Playwright local com respeito estrito a zero janelas paralelas.
- [ ] **TASK-17.2**: Extração de DOM e resumo de páginas web sob demanda do agente.
