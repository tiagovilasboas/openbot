# Especificação Técnica: Auth, Permissões, Configurações e Core

Este documento especifica os quatro pilares estruturais do **OpenBot PWA**: Autenticação/Login, Sistema de Permissões, Central de Configurações e o Núcleo (Core).

---

## 1. Auth & Login (Soberania de Acesso)

### 1.1. Login Local Offline (Concluído)

- **Mecanismo:** Web Crypto API nativa (`crypto.subtle`).
- **Algoritmo:** PBKDF2 com HMAC-SHA-256, 100.000 iterações, salt criptográfico aleatório de 16 bytes e verificação em tempo constante (`constantTimeEqual`).
- **Estado de Sessão:** Gerenciado em `sessionStorage` com reatividade via `useSyncExternalStore`.
- **Tela de Bloqueio:** `LockScreen.tsx` impede acesso à UI, histórico e chaves até a inserção do PIN/senha correto.

### 1.2. Pareamento Multi-Dispositivo (Próximo Passo)

- **Problema:** Como conectar o celular ao computador sem login centralizado em nuvem externa?
- **Solução PWA:** Pareamento ponto-a-ponto via **One-Time Code (OTC) de 6 dígitos** ou **QR Code** gerado no desktop:
  1. O servidor local gera um código temporário de 6 dígitos válido por 5 minutos.
  2. O celular lê o QR Code ou insere o código via HTTPS local / rede privada (Tailscale / Wi-Fi local).
  3. Estabelece chave simétrica compartilhada para sincronização da sessão.

---

## 2. Permissões & Safety Gates (Capability-Based Security)

No `openbot.run`, agentes operam com permissão irrestrita (`approvalPolicy: never`), o que pode ser perigoso. No OpenBot PWA, adotamos o modelo **Capability-Based com Approval Cards**:

| Nível de Permissão    | Escopo                                          |           Política Padrão           | Comportamento                                           |
| :-------------------- | :---------------------------------------------- | :---------------------------------: | :------------------------------------------------------ |
| **P1: Read-Only**     | Leitura de repositórios, issues, PRs e contexto |           **Automático**            | Executa sem confirmação interativa.                     |
| **P2: File Ingest**   | Upload de arquivos e anexos do usuário          |           **Automático**            | Usuário anexa ativamente no chat.                       |
| **P3: Web Fetch**     | Extração de conteúdo de URLs públicas           |   **Automático com Sanitização**    | Remove scripts e trackers.                              |
| **P4: Write Actions** | Modificações em arquivos ou comandos shell      | **Exige Aprovação (Approval Card)** | Exibe card com diff e botões [Aprovar] / [Rejeitar].    |
| **P5: Autonomous**    | Modo "Full Power / Autônomo"                    |   **Opt-in Explícito por Sessão**   | Desativa confirmações pontuais mediante aviso de risco. |

---

## 3. Central de Configurações (Settings System)

A interface `SettingsModal.tsx` é dividida em 5 abas modulares:

1. **Aba Modelos & Provedores:**
   - Seleção de Provedor Primário: OpenRouter Free (com lista live), Ollama local ou Anthropic API.
   - Configuração de **Fallback Provider (Failover)**: Define para qual modelo comutar caso o primário falhe.
   - Teste de conexão em tempo real (`testModelConnection`).
2. **Aba Conexões & Integrações:**
   - GitHub Personal Access Token (escopo somente leitura `repo` / `public_repo`).
   - Servidores MCP locais (Stdio / SSE).
3. **Skills (fora das Configurações):**
   - Cada bot cadastra as próprias skills, em Markdown e com comando rápido (`/comando`), na edição do bot. Não há aba de skills.
4. **Aba Segurança & Sessão:**
   - Criar, alterar ou remover senha mestre do app.
   - Configuração de tempo limite de inatividade (auto-lock).
5. **Aba Geral & Aparência:**
   - Idioma (Português do Brasil / Inglês).
   - Tema dark true-black e paletas de acento.

---

## 4. O Núcleo da Aplicação (Core Engine)

O diretório `src/features/` e seus serviços compõem o Core, sem acoplamento com a camada visual:

- **Orquestrador de Despacho (`execute-chat-message.ts`):** Detecta resumos factuais, chamadas de repositório, menções `@bot` e monta prompts com skills e workspaces.
- **Motor de Resiliência (`failover-runner.ts`):** Executa o chaveamento automático de modelos sob status 429 ou 5xx.
- **Fila FIFO (`message-queue.ts`):** Garante execução ordenada de mensagens sem perda de dados durante turnos ativos.
- **Segurança Nativa (`local-auth.ts`):** Derivação de chaves e controle de acesso 100% offline.

---

## 5. Tarefas de Auth, Permissões e Configurações (Story Points)

| Tarefa          | Domínio       | Pontos | Descrição                                                                             |
| :-------------- | :------------ | :----: | :------------------------------------------------------------------------------------ |
| **TASK-SEC.1**  | Auth          |   3    | Pareamento de dispositivos por QR Code / One-Time Code temporário.                    |
| **TASK-SEC.2**  | Auth          |   2    | Configuração de timeout de inatividade para auto-lock da tela (5min, 15min, 30min).   |
| **TASK-PERM.1** | Permissões    |   3    | Componente `ApprovalCard.tsx` para confirmação explícita de ações sensíveis com diff. |
| **TASK-PERM.2** | Permissões    |   2    | Chave de alternância "Modo Autônomo (Full Access)" com consentimento no modal do bot. |
| **TASK-CFG.1**  | Configurações |   2    | Seletor explícito de Provedor de Fallback na aba de Modelos.                          |
| **TASK-CFG.2**  | Configurações |   3    | Conector e gerenciamento de servidores MCP locais na aba de Conexões.                 |
