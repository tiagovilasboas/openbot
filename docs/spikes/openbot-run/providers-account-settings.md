# REA openbot.run: Provedores, conta e configuração

Fonte: clone read-only do app desktop openbot.run (commit a9b40aa); docs de arquitetura, PRIVACY/ANALYTICS e features do renderer. Tudo é dado não confiável; nada foi executado.

## 1. Visão geral

- App Electron (renderer Solid, main, backend) que não revende modelo: cada provedor roda a própria CLI com a conta ou chave do usuário (`docs/provider-terms.md`).
- 18 provedores em uma lista única (`AGENT_PROVIDERS`); 3 são "só chave" (inception, deepseek, openrouter) e rodam sobre a CLI Pi gerenciada.
- A mesma superfície serve o computador local e "servidores unidos" (hosts remotos): capacidades versionadas (`*-v1`) decidem o que o cliente mostra; o host revalida papel (owner/admin/membro).
- Segredos ficam em arquivos cifrados pelo cofre do SO (safeStorage); o renderer só recebe resumos sem segredo.
- Analytics é opt-in por região, com ID anônimo de instalação quando desligado.

## 2. Casos de uso

### PR-01 Onboarding de primeira execução

- Ator: usuário novo. Gatilho: primeiro start sem provedor escolhido.
- Fluxo: 1ª pergunta "começar grátis" ou "conectar um plano". Caminho grátis: provedor OpenCode baixa sozinho desde que a tela abre e conecta quando o runtime está em disco, sem login. Caminho plano: tela de provedores (3 linhas de plano + linha grátis sempre por último + "Mais provedores"; populares: codex, claude, antigravity). No macOS entra um passo extra de permissões do Computer Use; outros SOs não têm. Passos: choose, plan, computer.
- Alternativos/erros: "Abrir" antes de o provedor ficar pronto aguarda (`finishWhenReady`) e para em erro de download ou start. O botão Próximo nunca fica desabilitado: mostra toast com o motivo (baixando, finalizando, erro de download com motivo, conectando). "Usar modelos grátis" a partir do passo plano registra `skipped`. Escolha de idioma tem tela própria.
- Regras: lista não reordena sob o ponteiro (`kept`); em host unido só conta provedor conectado; a varredura de servidores locais roda uma vez ao mostrar o passo de provedores.

### PR-02 Consentimento de analytics no onboarding

- Caixa "Help make OpenBot better" começa marcada só se região E fuso são EUA/territórios, México, Austrália, Nova Zelândia ou Japão; senão desmarcada. Checagem local, sem envio. Mudança do usuário vence o default tardio; instalações antigas à caixa mantêm ligado. Ver seção 6.

### PR-03 Conectar provedor com chave (OpenRouter/DeepSeek/Inception, também OpenCode)

- Já conhecido; só o resto: chave vira extensão Pi sem a chave no arquivo (chave via env e slot global); 401/402 mostram texto sobre chave salva ou saldo. OpenRouter: ids `<lab>/<modelo>`, agrupa por lab, marca `:free`, descarta aliases com `~`; default `anthropic/claude-sonnet-5.5`. DeepSeek e Inception: chave é o único login (Connect e Reconnect abrem o diálogo de chave).

### PR-04 Provedor customizado compatível com OpenAI (endpoint próprio)

- Ator: usuário em Configurações > Provedores. Gatilho: adicionar endpoint ou escolher servidor detectado.
- Fluxo: informa nome, base URL, chave, headers e modelos (ou "Carregar modelos"). Salva em store cifrado; roda via harness `opencode` (padrão) ou `pi`. Por modelo: janela de contexto, saída máxima, esforços de raciocínio aceitos, entradas extras (imagem, pdf; harness pi só imagem).
- Alternativos/erros: edição mantém chave e headers não reenviados; nova origem com chave mantida é recusada; erros de sonda citam só o host (nunca path/query/chave). Recusa de corpo >1 MiB, timeout, rejeição, lista inválida.
- Limites: chave 4.096 chars; base URL 2.048; 64 modelos; 32 headers; contexto 1.024 a 100.000.000 tokens (OpenCode gasta ~12K só com prompt e tools); saída máxima 256 a 1.000.000.

### PR-05 Detecção de servidores de modelo locais

- Gatilho: abrir a seção Provedores do computador local ou o passo de provedores do onboarding.
- Fluxo: `GET <endereço>/models` sem chave nem header (sem seguir redirect) em Ollama `127.0.0.1:11434/v1`, LM Studio `127.0.0.1:1234/v1` e endereços extras do usuário. Achado aparece listado; nada é salvo até "Adicionar". Também varre agentes ACP por nome no PATH do login shell e em pastas do usuário, sem executar arquivo.
- Regras: até 16 endereços e 16 pastas extras (2.048 chars cada), 64 linhas ocultas, 256 modelos por lista (corta, não recusa). Pode ser desligado. Host unido não tem detecção nem Edit; peers não alcançam essas rotas.

### PR-06 Agentes ACP customizados e registro ACP

- Usuário salva comando, args e env; check abre processo em pasta temporária, faz `initialize` e uma `session/new` sem MCP para ler modelos (falha por falta de login não reprova). Id de modelo `<agentId>/<modelo>`. Um processo por agente e pasta; sessões prefixadas por hash da pasta. "Usage command" opcional (ex.: `/usage`): texto mostrado no hover, sem anel de percentual; leitura no máximo 1 por vez, cache de 1 min, relida só se resposta tem mais de 1 h enquanto o provedor está liberado.
- Instalação por registro ACP só envia `initialize`.

### PR-07 Ligar/desligar provedores localmente e variáveis de ambiente

- Interruptor por provedor (`openbot-provider-use-v1.json`; arquivo ausente = todos ligados). Desligar é recusado enquanto um agente usa o provedor. Ligar rechecka.
- Variáveis por provedor (Claude, Codex, Gemini): nomes e valores simples em JSON, valores sensíveis no arquivo de chaves cifrado (a leitura devolve só `stored: true`). Reservados: PATH, HOME, NODE_OPTIONS e marcadores internos. Caso de uso: proxy multi-conta (ex.: CLIProxyAPI) com base URL e token; mudança reinicia o provedor ao fim dos turnos.
- Outras opções por provedor: "Use my Claude Code setup" (`claude-user-setup-v1`), TTL do prompt cache do Claude (`5m` ou `1h`), visibilidade por modelo (`model-visibility-v1`, só owner/admin em host unido).

### PR-08 Seletor de modelos e modelos de backup

- Catálogo vem de `model/list` de cada CLI com regras por driver (Codex pagina e tem tier Fast; OpenCode filtra modelos que a chave não usa; agente custom tem timeout maior).
- Cada agente guarda até 8 modelos de backup ordenados (`agent_json`; tela de settings, rota admin e ferramenta `update_profile`). Com lista automática, ao bater limite de plano o agente muda para o primeiro backup pronto e volta quando o bloqueio termina.
- Falha de provedor (billing, indisponível, rate limit, auth, rede, timeout) antes de o turno agir: mensagens voltam à fila, o modelo é ignorado por 10 min e o turno reroda no backup sem banner de erro. Turno que já escreveu texto ou rodou ferramenta falha normal. Cada mensagem reroda no máximo uma vez por modelo que falhou. Restart limpa bloqueios.

### PR-09 Uso e limites de plano

- Anéis na barra lateral por conta de provedor (janelas de 5 horas, semanal, por modelo); tom neutro acima de 30% restante, aviso abaixo de 30%, crítico abaixo de 10%. Modelo recusado pelo plano vira linha 0% própria.
- Polling a cada 5 min por janela/aba/celular; `UsageReadGate` serializa leituras, resposta vale 4 min, após falha espera 5, 10, 20, 40 min até 1 h (Claude devolve 429 por 1 h ou mais se pressionado). Credenciais novas, login, logout ou provedor desligado zeram o gate.
- Créditos: "Reset usage" (Codex) gasta um crédito de reset do plano (idempotencyKey por pedido) e libera agentes presos; "Using credits" no compositor quando a conta Codex tem créditos (só o booleano, não o saldo). Host unido usa rotas opcionais `provider-usage-reset-v1` e `usage-credits-v1`.

### PR-10 Múltiplas contas e login por código

- Contas após a primeira para Codex, Grok e Claude. Login por código de dispositivo (`codex login --device-auth`, `grok login --device-auth`) quando o navegador já está logado na 1ª conta; Claude no Linux usa colar o código (vai só para stdin da CLI). Conta nova com login que falha, expira ou é cancelado é removida. Host unido: `provider-account-code-v1` (dono/admin).

### PR-11 Desconectar o login próprio

- Menu "⋯" > Disconnect em Claude, Codex, Grok, Muse, Cursor, Devin, Copilot, Mistral e Gemini (Cline e Pi não têm comando de logout). Recusado durante turno. Em máquina local a CLI de terminal compartilha a pasta e o keychain e também desloga (o diálogo avisa); Gemini é exceção (arquivo de token próprio, não revoga no Google). Muse com chave OpenBot salva só remove pela caixa de chave.

### PR-12 Atualização de CLIs de provedor

- Checa no start, a cada hora e em "Check for updates": GitHub releases (Codex, Pi, Kimi, Copilot, Mistral, Gemini), npm latest (Claude, OpenCode, Cline), manifestos próprios (Grok, Muse, Devin) e registro ACP (Cursor). Downloads validados por hash da fonte (Grok e Cursor só por TLS). Lista `provider-runtime-blocklist.json` suprime versões ruins sem release do app. Canário de CI a cada 6 h.
- Após atualizar o app, CLIs gerenciadas atualizam sem oferta (toast só em falha, com Retry). Toast único por provedor; fechar não cancela o download.

### PR-13 Atualização do app

- Aba Updates: canal (track), restart quando ocioso, download automático, instalação automática, permitir restart remoto por admin, modo gerenciado. Toasts: restart agendado por admin (fica até iniciar ou cancelar), restart ocioso (erro fica até fechar), reinício do host. Overlay "What's new" com notas em 15 idiomas.

### PR-14 Conta OpenBot (login no próprio serviço)

- Login por e-mail com código de uso único (sem senha); também login corporativo OIDC (Entra, Okta, Google Workspace; `openCompanySignIn`). Perfil: nome, avatar, cor do chat (compartilhada com membros), lista e revogação de sessões. Sessão cifrada pelo SO; logout revoga sessões remotas.
- Aba Billing e "hosted servers" (planos, licenças via Stripe); eventos de plano sem preço nem dados de pagamento. Aba Mobile Connect: pareamento por código/link, lista e revogação de aparelhos.

### PR-15 Cofre (Vault) local e de servidor

- Guarda logins, cartões, contatos, chaves de API (nome da variável, chave, notas) e chave TOTP opcional; importa CSV. Arquivo `openbot-vault-v1.json` cifrado pelo SO (no Linux sem keyring, chave própria em arquivo). Códigos 2FA são gerados localmente.
- Agente vê só sites/usuários, nome e últimos 4 dígitos do cartão; nunca senha, número, CVV, chave 2FA. Pode editar contato, usuário de login, nome/validade/cobrança de cartão e apagar itens sem aprovação (chat mostra a mudança); não vê chaves de API no cofre, mas elas são gravadas em `agent-api-keys/.vault/<agentId>/<NAME>` (modo só do usuário) e qualquer agente do mesmo usuário do SO pode ler (limitação declarada).
- Primeiro preenchimento de cartão em um site exige aprovação do dono do servidor; depois o site fica lembrado.
- Servidor unido: só owner/admin; lista sem segredos, segredo revelado/copiado sob demanda; `vault-v3` envia códigos 2FA atuais; importação por `vault-import-v1`. Cartão Link: conexão `login.link.com` com tokens cifrados e cartão descartável nunca guardado.

### PR-16 Conectores de gerenciadores de senha

- 1Password: `op` do usuário cria service account de leitura (cofre "Shared with OpenBot") ou o usuário cola o token; lista de logins só em memória.
- Bitwarden/Vaultwarden: chave de sessão `bw` só em memória; desconecta com 8 h sem uso; lê só a pasta "Shared with OpenBot", mas a chave de sessão decifra o cofre inteiro (o doc recomenda conta separada). Em host unido: URL, API key pessoal e senha mestre, enviadas uma vez; host precisa alcançar o servidor por HTTPS; `connect` responde `connecting` e o cliente consulta status a cada 2 s (3 s no celular).
- Proton Pass: `pass-cli` baixado do proton.me com SHA-256 fixo; login web gera chave de acesso de agente (expira em 1 ano) limitada ao cofre "Shared with OpenBot", ou cola-se uma.
- Regra comum: senha/OTP vai só ao navegador do agente, nunca ao agente, provedor, log ou membro.

### PR-17 Conectores de mensagens e GitHub

- GitHub: device flow de GitHub App com client ID público; tokens ficam em `provider-state/github` (texto puro, modo 0600) enquanto conectado, apagados ao desconectar/fechar.
- Slack/Discord: OAuth hospedado que termina em `openbot://slack-workspace` / `openbot://discord-guild` com grant selado; Telegram: link `t.me` de código único; WhatsApp: QR ou código de pareamento, números, contatos/grupos permitidos, mensagem "Working on it…" opcional por número (`whatsapp-working-message-v1`, padrão ligado). Discord permite lista de papéis autorizados por servidor.
- Acesso por conector em 3 níveis (`available`, `local-only`, `hidden`): computador local sempre; servidor unido só se a capacidade existir e o papel for owner/admin.

### PR-18 Servidores MCP e seu OAuth

- Login OAuth de MCP por loopback `127.0.0.1:28417/mcp-auth` (fallback `openbot://mcp-auth`); o agente nunca recebe o token: usa um proxy local `127.0.0.1:<porta>/mcp/<rota>/<agente>` com bearer HMAC por rota+agente.
- Renovação sem navegador: `invalid_grant` apaga tokens mas mantém registro do cliente (linha "Sign-in needed"); `invalid_client` apaga também o registro; falha de rede não altera nada. Logout e remoção apagam tokens e fazem revogação RFC 7009 best-effort (5 s).
- Várias contas do mesmo servidor (ex.: Notion): fragmento `#account-<id>` na URL; menção `@<nome da linha>`.
- Limites: 100 servidores por computador (hosts antigos só leem 32; 409 pede atualização); OAuth: corpo ≤1 MiB e 20 s; endpoints OAuth devem resolver a IPs públicos quando o MCP é público; proxy corpo >64 KiB passa sem reescrita; no máximo 3 redirects de mesma origem.
- Em host unido: membros só mexem nos servidores que adicionaram; `mcp-access-v1` define por servidor quais agentes e quais papéis (`none`, `use`, `manage`) com revisão otimista (409 `mcpAccessStale`).

### PR-19 Configurações gerais

- Abas: General, Appearance, Notifications, Voice, Profile, Billing, Mobile Connect, App Behavior, Dynamic Island, Agent Dock, Computer Use, Updates, Hosted Servers; busca por linha (âncora por chave de texto; linhas só-macOS filtradas).
- Voz: chaves ElevenLabs, Groq (ditado), xAI (resposta falada) e servidor de voz próprio, cada uma em arquivo cifrado que o renderer não recebe de volta.

## 3. Fluxos de interface

- First run: choose > (plan) > (computer, só macOS); transição por View Transition (`step`/`open`), respeita reduced-motion; splash com time de 7 avatares.
- Settings modal com navegação por grupos, busca e linhas ancoradas; seção Provedores com páginas por provedor (Environment, Models, prompt cache, contas, ⋯ menu: Reset usage, Disconnect, Add account with code, Remove account).
- Marketplace > Apps lista conectores (cards, painel de detalhe); o mesmo estado aparece no cartão de sugestão do chat e no cliente web.
- Barra lateral: anéis de uso, ilha de update, toasts de update de CLI/app.
- Bloqueio e feedback: botão Próximo explica o bloqueio em frase; chip "Using credits" no compositor.

## 4. Dados e contratos

- Arquivos no perfil: `openbot-provider-use-v1.json`, `openbot-provider-environment-v1.json`, `openbot-provider-detection-v1.json`, `custom-agents.json`, custom providers (cifrado), `openbot-vault-v1.json`, `openbot-onepassword-connector-v1.json`, `openbot-bitwarden-connector-v1.json`, `openbot-protonpass-connector-v1.json`, `openbot-mcp-oauth-proxy-v1.json`, `openbot-mcp-server-owners-v1.json`, `openbot-provider-cli-app-version-v1.json`, `openbot-run-marker-v1.json`.
- Contratos em `packages/contracts`: `AGENT_PROVIDERS`, `KEY_ONLY_PROVIDERS`, limites de custom providers e detecção, `PROMPT_CACHE_TTLS`, `AgentBackupModels` (máx. 8). Driver por provedor em `src/backend/provider-drivers.ts` (tipos de login `ProviderSignIn`/`ProviderCodeSignIn`).
- Team API: capacidades versionadas (ex.: `providers-v3` a `v8`, `connectors-v1`, `vault-v1/v3`, `mcp-servers-v1`, `mcp-accounts-v1`, `mcp-many-servers-v1`); contratos "congelados" após release, mudança vira capacidade nova; provedores novos só aparecem para peers a partir da versão que os conhece (ex.: Inception, DeepSeek e OpenRouter a partir da v8).
- Portas de renderer finas (`*-port.ts` sobre `window.openbot`) e controladores por conector (`ConnectorController`).

## 5. Tipos de login (resumo de referência)

Callback loopback, código de dispositivo, código colado, login de navegador da CLI, deep link `openbot://`, terminal (Pi), chave/sessão local. Em host unido existe um "relay de callback" (`sign-in-relay-v1`) que captura a página no host e devolve o callback do cliente à CLI; o que não pode ser relayado fica documentado em `integrations.md`.

## 6. Segurança e privacidade

- Segredos só no main e no backend; renderer recebe resumos (`hasApiKey`, `stored: true`); tokens registrados para redação em logs, exports e diagnósticos.
- Privacidade do login Claude: OpenBot não lê nem guarda credenciais Claude; `provider-terms.md` admite que a Anthropic não confirmou que login de assinatura via OpenBot é permitido e classifica o risco (maior com código em host remoto; alto com membros usando a conta de um só).
- Analytics: OpenPanel auto-hospedado; métrica primária = contas semanais com ao menos um turno bem-sucedido; esquema versionado por superfície (desktop 13, host 19, landing 10, conta 16, mobile 4, web 2, signal 2). Desligado ou sem resposta: eventos anônimos com ID `install-<uuid>` renovado após 13 meses, sem e-mail nem conta; ao desligar, um último evento "desligado" vai com a conta. Resposta fica na conta e vale em outros aparelhos (resposta local "off" não é revertida por "on" da conta). Opção em Settings > General.
- Propriedades de evento: só metadados (contagens, estado, tempos, provedor, modelo); conectores citam só o tipo; nomes de anexos nunca; voz nunca envia fala ou áudio.
- Crash dumps ficam locais; contador de falhas de start (3 seguidas abre janela de recuperação sem preload nem IPC).
- Rede: sonda de modelos não envia chave nas detecções; chaves de endpoint só vão à mesma origem salva; proxy MCP usa Host/bearer restritos (403 caso contrário).
- Regras de host unido: papel revalidado no host; senha/OTP do cofre nunca vai ao cliente; owner aprova cartão novo.

## 7. Arquivos de referência (no clone)

- `docs/architecture/providers.md`, `integrations.md`, `analytics.md`; `docs/provider-terms.md`; `PRIVACY.md`; `ANALYTICS.md`.
- `src/renderer/src/features/`: `onboarding/{FirstRunFlow,setup-next,onboarding-provider-rows}`, `custom-providers/stores/*`, `settings/{settings-tabs,provider-*,ProviderSettingsSection}`, `account/{account-port,account-usage-polling}`, `usage/plan-limit-rows`, `updates/*`, `vault/*`, `connectors/{connector-registry,connector-access,password-manager-connector}`, `provider-updates/*`.
- `packages/contracts/src/{agent-providers,ipc-custom-providers,ipc-provider-detection,ipc-prompt-cache}.ts`; `packages/team-client/src/plan-limits.ts`.
- `src/main/{model-server-probe,custom-provider-store,vault-service,onepassword-connector-service,mcp-oauth-redirect-server}.ts`; `src/backend/{provider-drivers,mcp-oauth-provider,mcp-oauth-proxy}.ts`.
- Lacunas: não li código de `SettingsGeneralTab` nem o fluxo de billing/Stripe em detalhe (inferido da documentação de privacidade).
