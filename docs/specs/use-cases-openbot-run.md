# Especificações de Casos de Uso (REA: openbot.run)

Este documento detalha todos os casos de uso identificados na Engenharia Reversa (REA) do `openbot.run` (`nightly-labs/openbot`) e especifica sua adaptação arquitetural para o **OpenBot PWA**.

---

### UC-01: Criação e Customização de Agentes Persistentes

- **Ator:** Desenvolvedor / Usuário.
- **Fluxo Principal:**
  1. O usuário aciona criação de agente via prompt ou seleção de arquétipo pré-definido.
  2. Define nome, especialidade, avatar geométrico (forma e cor) e prompt de sistema.
  3. Associa um workspace com contexto persistente (regras de projeto, repositório).
  4. Salva o agente, que passa a ter histórico de mensagens isolado.
- **Adaptação PWA:** Implementado via `BotProfile`, `BotTemplatePicker` e armazenamento local em `bot-storage.ts` com isolamento de conversa por ID de bot.

---

### UC-02: Conexão e Auto-Roteamento de Modelos (Free & Paid)

- **Ator:** Usuário / Sistema.
- **Fluxo Principal:**
  1. O usuário escolhe entre modelo gratuito na nuvem, endpoint local (Ollama) ou API proprietária (Anthropic/OpenAI).
  2. No modo gratuito, o sistema detecta os modelos disponíveis e balanceia as requisições.
  3. Testa a conectividade antes de persistir as credenciais.
- **Adaptação PWA:** Implementado via `openrouter/free` dinâmico (`/api/model/free`), adaptadores modulares (`router-adapter`, `local-adapter`, `anthropic-adapter`) e credenciais salvas apenas no cliente.

---

### UC-03: Provider Failover sob Saturação ou Indisponibilidade

- **Ator:** Sistema (Automático).
- **Pré-condições:** Modelo primário falha com HTTP 429 (quota/rate-limit), 5xx (indisponível) ou timeout.
- **Fluxo Principal:**
  1. O interceptor de rede captura o erro do provedor primário.
  2. Aciona imediatamente o provedor/modelo secundário na cadeia de contingência.
  3. Conclui a resposta preservando o histórico e o workspace.
  4. Exibe badge informativo na mensagem: `"⚠️ Failover automático: [De] → [Para]"`.
- **Adaptação PWA:** Implementado no `failover-runner.ts` e renderizado no `ChatMessageItem.tsx`.

---

### UC-04: Fila FIFO Não-Bloqueante de Tarefas

- **Ator:** Usuário.
- **Fluxo Principal:**
  1. O usuário envia mensagens enquanto o agente está processando (`busy`).
  2. O sistema registra a mensagem na interface imediatamente e a enfileira em memória/storage.
  3. Exibe indicador visual `"X na fila"` no composer.
  4. Concluído o turno anterior, o próximo comando da fila é despachado automaticamente com o histórico atualizado.
- **Adaptação PWA:** Implementado com `message-queue.ts` e `use-message-queue.ts` no `ChatExperience.tsx`.

---

### UC-05: Delegação Multi-Agente e Canais Compartilhados

- **Ator:** Usuário / Chief of Staff.
- **Fluxo Principal:**
  1. Em uma conversa, o usuário invoca `@NomeDoBot` para transferir ou consultar um especialista.
  2. O Chief of Staff ou o sistema transfere o contexto da tarefa para o bot especialista.
  3. O especialista responde com seu avatar e identidade, exibindo o badge `via @Bot`.
  4. Prevenção de loop de agradecimento/confirmação mútua entre agentes.
- **Adaptação PWA:** Implementado via `BotMentionPalette.tsx` e `findMentionedBot` no pipeline de despacho `execute-chat-message.ts`.

---

### UC-06: Execução de Rotinas Silenciosas em Segundo Plano

- **Ator:** Sistema (Agendador / Cron / Script).
- **Fluxo Principal:**
  1. Uma rotina periódica ou webhook executa uma verificação (ex: monitorar issues ou status de CI).
  2. Se não houver novidades, o agente aciona `routine_no_update` e a execução encerra sem notificação intrusiva.
  3. Se houver anomalia ou falha, o agente aciona `routine_report_failure`, registrando alerta no chat.
- **Adaptação PWA:** Especificado para a Wave 4 via Web Workers e notificações locais discretas.

---

### UC-07: Automação via Loopback API Local

- **Ator:** Scripts locais / CLI do desenvolvedor.
- **Fluxo Principal:**
  1. Servidor local disponibiliza listener HTTP em `127.0.0.1` protegido por token bearer volátil.
  2. Scripts locais (ex: bash, python) disparam comandos diretamente para agentes habilitados (`allowAutomation`).
  3. Limite de requisições por hora para evitar loops infinitos de custos.
- **Adaptação PWA:** Implementado via rotas de API `/api/chat` locais com validação de payload estrito.

---

### UC-08: Ferramenta de Inspeção de Navegador (Browser Use)

- **Ator:** Agente especialista.
- **Fluxo Principal:**
  1. O agente recebe uma tarefa que exige inspecionar uma URL ou renderizar uma página.
  2. Executa comandos estruturados de navegação e extração de texto sem abrir abas soltas descontroladas.
  3. Devolve os dados relevantes para o contexto do chat.
- **Adaptação PWA:** Alinhado com o guardrail de instância única do Session Agent e integração controlada via CDP/Playwright local.

---

### UC-09: Monitoramento de Contexto e Compactação Automática

- **Ator:** Sistema.
- **Fluxo Principal:**
  1. O sistema rastreia o volume de tokens e bytes acumulados no histórico de mensagens do bot.
  2. Ao atingir ~80% da janela do modelo, aciona um processo de síntese/resumo do histórico pregresso.
  3. Mantém memórias essenciais e instruções sem estourar o limite de contexto da LLM.
- **Adaptação PWA:** Especificado para a Wave 2 através do módulo de resumo contextual `src/features/summary/`.

---

### UC-10: Gestão de Arquivos e Contexto de Repositório

- **Ator:** Usuário.
- **Fluxo Principal:**
  1. O usuário vincula um repositório Git ou anexa arquivos de especificação ao bot.
  2. As instruções e diretrizes são injetadas de forma concisa no prompt de sistema.
  3. O agente utiliza esse escopo para responder dúvidas pontuais sobre o código ou documentação.
- **Adaptação PWA:** Implementado inicialmente via `workspaceContext` por bot e integração somente leitura com repositórios GitHub.

---

### UC-11: Catálogo de Skills e Extensões Desacopladas

- **Ator:** Usuário.
- **Fluxo Principal:**
  1. O usuário cadastra ou importa instruções procedurais (skills) com comandos rápidos (`/comando`).
  2. Habilita seletivamente quais bots têm acesso a quais skills.
  3. O acionamento pode ser via autocomplete na caixa de texto.
- **Adaptação PWA:** Implementado em `src/features/skills/`, com paleta de comandos `/` no `ChatComposer.tsx` e gestão em `SettingsSkillsSection.tsx`.

---

### UC-12: Soberania de Dados e Bloqueio Criptográfico Offline

- **Ator:** Usuário.
- **Fluxo Principal:**
  1. Todas as conversas, bots, credenciais e configurações permanecem armazenados estritamente na máquina local.
  2. O usuário pode definir uma senha/PIN mestre criptografada via PBKDF2 (SHA-256).
  3. O app bloqueia a tela quando inativo ou por solicitação do usuário, impedindo leitura não autorizada de dados locais.
- **Adaptação PWA:** Implementado com `local-auth.ts`, `LockScreen.tsx` e `auth-storage.ts`.
