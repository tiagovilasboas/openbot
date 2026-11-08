# REA: Engenharia Reversa do openbot.run e Portabilidade para OpenBot PWA

## 1. Visão Geral e Contexto

O produto `openbot.run` (desenvolvido pela Synthetify Labs, sob o repositório `nightly-labs/openbot`) é um workspace desktop voltado para a criação e execução de equipes de agentes de IA persistentes.

Este documento realiza uma Análise de Engenharia Reversa (REA) minuciosa da sua arquitetura, modelos de execução, resiliência e experiência de usuário, mapeando as principais capacidades para serem portadas e adaptadas com excelência para a nossa arquitetura **OpenBot PWA** (`tiagovilasboas/openbot`).

---

## 2. Engenharia Reversa da Arquitetura do openbot.run

A análise do código-fonte e documentação técnica do `nightly-labs/openbot` revela os seguintes componentes centrais:

### 2.1. Runtime e Modelo de Execução

- **Stack Base:** Workspace Bun com aplicação desktop empacotada em Electron, clientes móveis e Cloudflare Workers para account relay opcional.
- **Loopback Automation Server:** Servidor HTTP local vinculado em `127.0.0.1` (`automation-server.ts`) para despachar tarefas, rotinas agendadas e controle de agentes via CLI ou scripts.
- **Bridges de Provedores:** Suporte a múltiplos provedores via ACP (Agent Client Protocol) e CLIs locais (Codex, Claude Code, Grok CLI, OpenCode, Gemini ACP, Cursor Agent, Cline).
- **Execução Autônoma:** Agentes rodam com políticas de permissão local para manipulação de arquivos e comandos.

### 2.2. Provider Failover Engine (Resiliência de Modelos)

- **Comportamento Observado:** Quando um provedor atinge limite de taxa (HTTP 429), sofre timeout ou fica indisponível (HTTP 5xx), o agente não interrompe a sessão nem perde o contexto.
- **Mecanismo:** O motor de despacho comuta automaticamente para um provedor/modelo secundário na cadeia de fallback, preservando o histórico e o workspace, e injeta uma nota informativa no chat sobre a troca de provedor realizada.

### 2.3. FIFO Message Queue (Fila Assíncrona de Mensagens)

- **Comportamento Observado:** Ao enviar mensagens enquanto um agente está ocupado (turn em execução), o sistema não descarta nem rejeita a mensagem.
- **Mecanismo:** Mensagens são enfileiradas em fila FIFO com persistência local e processadas em sequência assim que o agente fica livre.

### 2.4. Teammates e Workspaces Persistentes

- **Comportamento Observado:** Cada agente possui seu próprio workspace, diretório de trabalho, avatar customizado, instruções permanentes e contexto isolado.
- **Templates de Agentes:** Arquétipos pré-definidos (Reviewer, Architect, Writer, etc.) que podem ser clonados e adaptados com 1 clique.

---

## 3. Comparativo de Arquitetura: openbot.run vs OpenBot PWA

| Dimensão              | openbot.run (Synthetify Labs)           | OpenBot PWA (Nosso Contexto)                                                                      |
| :-------------------- | :-------------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Plataforma**        | Desktop Electron (~300MB)               | Web PWA ultra-leve, offline-first, mobile & desktop                                               |
| **Segurança & Auth**  | Credenciais em keychain desktop         | Autenticação local offline com PBKDF2 (SHA-256, 100k iterações, salt aleatório)                   |
| **Modelos Gratuitos** | Modelos locais (Ollama) ou contas pagas | Auto-roteador dinâmico gratuito (`openrouter/free`) + catálogo em tempo real de modelos sem custo |
| **Orquestração**      | Multi-agente via desktop channels       | Chief of Staff nativo com delegação `@bot` em thread única ou chats dedicados                     |
| **Failover**          | Fallback chain desktop                  | Motor de failover dinâmico client-server com aviso visual em tempo real                           |
| **Fila de Mensagens** | Fila desktop SQLite                     | Fila FIFO reativa e não-bloqueante no frontend                                                    |

---

## 4. Plano de Portabilidade para o OpenBot PWA

Para portar os pontos mais fortes do `openbot.run` para a nossa arquitetura PWA, implementamos as seguintes frentes:

1. **Provider Failover Engine (`src/features/model/`):**
   - Resiliência automática no `/api/chat`: se o modelo primário rejeitar a requisição por limite (429) ou indisponibilidade (5xx), o motor aciona o modelo secundário de contingência.
   - Retorno do metadado `failover` contendo modelo de origem, modelo de destino e motivo.
   - Renderização de aviso elegante no chat: `"⚠️ Failover: mudou de [Modelo A] para [Modelo B] por indisponibilidade"`.

2. **Fila FIFO de Mensagens (`src/features/chat/`):**
   - Hook `useMessageQueue` integrado ao `ChatExperience`.
   - Se o usuário submeter mensagens enquanto o bot estiver ocupado (`busy`), a mensagem é colocada na fila e um indicador visual `"1 na fila..."` é exibido.
   - Assim que o bot terminar a resposta corrente, a próxima mensagem da fila é consumida automaticamente.

3. **Catálogo de Arquétipos / Templates de Bots (`src/features/bots/`):**
   - Criação de templates de alta especialização (Arquiteto, Revisor de Código, Especialista AppSec, Engenheiro de Plataforma, Redator Técnico).
   - Inclusão de seletor rápido no modal de criação de bot.

4. **Sincronização Completa de Modelos Gratuitos da Evidência:**
   - Atualização da rota `/api/model/free` e fallbacks para cobrir integralmente os modelos observados no OpenRouter:
     - NVIDIA Nemotron 3.5 Super VL (`nvidia/nemotron-3.5-super-vl:free`)
     - NVIDIA Nemotron 3 Ultra (`nvidia/nemotron-3-ultra:free`)
     - NVIDIA Nemotron 3.5 Lightning (`nvidia/nemotron-3.5-lightning:free`)
     - Google Gemma 4 31B (`google/gemma-4-31b-it:free`)
     - Cohere North Mini Code (`cohere/north-mini-code:free`)
     - LiquidAI LFM3-1.7B (`liquid/lfm-3-1.7b:free`)
     - Parallel Decisions Fast (`parallel/decisions-fast:free`)
     - HeyGen Voice Turbo (`heygen/voice-turbo:free`)
