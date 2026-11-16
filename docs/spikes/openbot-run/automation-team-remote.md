# REA openbot.run: Automação, equipes e acesso remoto

Fonte: clone do app open-source openbot.run (commit a9b40aa), lido em modo somente leitura (docs de arquitetura e de usuário, contratos, `src/main`, renderer e `apps/*`). Itens marcados "(inferido)" não estão escritos nos docs.

## 1. Visão geral

- O app é um desktop (Electron) que hospeda agentes; cada "servidor" é um host com seu próprio banco SQLite, agentes, canais e rotinas. Clientes (desktop, web em `/app`, app de celular) entram como membros via Team API sobre WebRTC.
- Automação tem quatro portas de entrada: rotinas agendadas, webhooks assinados (relay "Signal" na nuvem), API local em loopback (`openbot-cli`) e apps de mensagens (Slack, Discord, Telegram, WhatsApp).
- Colaboração entre agentes acontece em canais (lead + membros, tarefas, atribuições automáticas com teto) e em rotinas encadeadas (flows) e workflows (grafo de passos).
- Acesso remoto: servidor hospedado (sandbox ou VPS pago), auto-hospedado (Linux/Docker/Umbrel/ECS), servidores extras no mesmo computador, cliente web, app de celular e desktop remoto (Sunshine/Moonlight).
- Equipe: papéis owner/admin/member, papéis customizados por agente (none/view/chat/manage), convites, log de auditoria, login corporativo OIDC e SCIM. Nuvem (account service + Signal) só roteia e assina; conteúdo fica no host.

## 2. Casos de uso

### AU-01 Canais compartilhados

- Ator: membro humano, agentes membros, agente líder.
- Gatilho: mensagem humana no canal, `send_to_channel` de outro agente, nota de workflow.
- Fluxo principal: criar canal (nome, título, instruções, membros, líder, memória isolada, política de browser, ícone/imagem) → mensagem entra com sequência estável → seleção do dono sem modelo quando possível (destinatário explícito, @menção, tarefa ligada a resposta, único membro) → senão o líder roteia numa sessão sem ferramentas → cada dono recebe tarefa raiz, responde e a UI mostra quem foi escolhido.
- Alternativos/erros: canal sem líder e pedido sem destinatário falha com `channelLeadRequired`; "continue"/"retome" retoma tarefa parada ou falha; routing que devolve "ocioso" mas há @menção entrega aos mencionados; resposta de roteamento inválida vai ao líder; arquivar ("Delete" na UI) preserva registros e permite restaurar; agente oculto devolve fila ao canal.
- Regras e limites: 8 atribuições automáticas por pedido raiz (`CHANNEL_ASSIGNMENT_LIMIT`), 2 tarefas ativas por canal (`CHANNEL_PARALLEL_LIMIT`); um agente executa um turno de canal por vez em todos os canais; estados de tarefa queued/running/waiting/paused/completed/failed/cancelled; `channel_history` ~24.000 caracteres por página; mensagens acima de 16.000 caracteres são truncadas na leitura; resumo versionado cobre o histórico antigo; cliente leve guarda até 50 mensagens por canal aberto; membership do agente não restringe humanos (todo membro autenticado lê o canal).

### AU-02 Colaboração multiagente e guardas contra loop

- Ator: agentes (ferramentas `channel_assign`, `channel_transfer`, `channel_result`, `channel_reply`, `channel_cancel`, `send_message`, `list_agents`).
- Gatilho: pedido que exige outro papel ou ajuda.
- Fluxo principal: dono atribui subtarefa (filho mantém dono do pai; transferência troca o dono) → resultados filhos são combinados antes de o dono voltar → resultado fecha a tarefa.
- Alternativos/erros: `channel_reply` é recusada (`accepted: false`) após `channel_result`, em run encerrado, a mensagem de humano ou do próprio chamador, a membro que não recebe trabalho e acima do limite; turno de reply só responde (não pode reatribuir nem cancelar); pergunta curta que falha deixa o chamador seguir sem resposta (`settled`); cancelar run recusa run de outro dono, run próprio e run de que outra tarefa depende.
- Regras e limites: tetos de AU-01; instruções do sistema mandam que confirmações não virem loop e que um agente nunca devolva tarefa a quem a delegou; mudanças de canal feitas por agente só valem se a mensagem raiz foi de uma pessoa (rotina, handoff de agente ou texto vindo de fora são recusados); texto de agente para agente leva prefixo dizendo que não é o usuário; `send_to_channel` é recusado dentro de tarefa de canal e em thread de chat externo; id de chamada de ferramenta vira chave de idempotência.

### AU-03 Rotinas e agenda (incluindo execuções silenciosas)

- Ator: dono/admin (ou membro com `manage` no agente), cron do host.
- Gatilho: horário, execução manual (Test run), script local ou webhook.
- Fluxo principal: criar rotina por agente ou canal com instrução, fuso e agenda → o agendador relê a rotina antes de cada ocorrência → execução vira entrega na fila do agente → histórico de runs com origem (`test`, `script`, `webhook`).
- Alternativos/erros: rotina pausada/removida/trigger trocado não dispara a lista antiga; limite de uso do provedor enfileira o run, ou descarta se a rotina é "pular no limite"; `routine_report_failure` marca falha com motivo (500 caracteres); rotina "once" só em host local ou com `routines-once-v1`.
- Regras e limites: tipos de agenda `hourly`, `daily`, `weekdays`, `weekly`, `monthly`, `interval`, `advanced`, `custom` (cron até 255 caracteres), `once`; 64 rotinas por agente; instrução até 100.000 caracteres; calendário consulta até 44 dias; `runIn` chat ou thread própria (thread só se o agente tem menos de 50 threads de tarefa abertas); handoff de rotina de 8.000 caracteres, digest de 1.500 por run e 6.000 no total.
- Execução silenciosa: run agendado/script/webhook que termina com `routine_no_update` (ou marcador `[[no-update]]`/`[SILENT]`) não notifica, não conta como não lido e não toca som; o marcador dentro de relatório maior é mostrado; Test run nunca é silencioso.
- Feed iCalendar local (`/routines/<token>.ics`, loopback) lista os runs dos próximos 30 dias.

### AU-04 Rotinas encadeadas (routine flows) e workflows

- Ator: membro que vê os agentes envolvidos; dono/admin para webhook e saídas de mensageria.
- Gatilho: fim de run de rotina (flow); trigger do workflow (manual, schedule, webhook, message, github, discord, telegram, slack).
- Fluxo principal (flow): canvas por agente liga a resposta de uma rotina a outros agentes; agente com várias entradas espera todas e recebe tudo numa mensagem. Fluxo (workflow): grafo de nós (trigger, agent, llm, condition, approval, output, image, asset, prompt, text, note, shape); cada passada inicia nós cujas entradas chegaram; saídas: notify, channel, file, github, discord, telegram, slack, chat-channel (nota de coordenador no canal).
- Alternativos/erros: agente inicial falho pula quem vem depois; agente apagado falha com `agentMissing`; reinício falha modelo em execução e preserva aprovações/agent steps; saída que "estava a caminho" falha como incerta e o usuário refaz; nós de imagem/asset/file/message-trigger ainda sem execução em parte (doc os cita como não rodando).
- Regras e limites: workflow até 200 nós, 400 arestas, 1 MiB de grafo; 50 versões guardadas (nova a cada 5 minutos ou ao restaurar/rodar); salvar com debounce de 400 ms; loops permitidos sem limite de passadas, terminam por condição, falha, rejeição ou Stop; schedule/webhook mantêm um run aberto por workflow (ocorrência perdida vira um run); GitHub bloqueia só o item; passo/saída até 32.000 caracteres e 2.000 passos por run; flow até 50 links e 4.000 caracteres por texto de passo; modelo/condição rodam sem ferramentas e passos não compartilham texto; agentes editam via seis ferramentas (`list/read/edit/delete/run_workflow`, `read_workflow_runs`).

### AU-05 Webhooks (relay) e servidor de automação em loopback

- Ator: serviço externo (webhook); script local do mesmo usuário do SO (API local); admin do host.
- Gatilho: POST assinado em `/v1/webhooks/<routeId>`; chamada com bearer token em 127.0.0.1.
- Fluxo principal (webhook): admin escolhe "Webhook", host gera rota UUID e segredo `whsec_...` (mostrado uma vez, cifrado com secret storage do SO) → conta registra rota → Signal repassa bytes exatos ao host por socket (espera 2,5 s) → host verifica HMAC antes de decodificar → recibo + run na mesma transação → 202.
- Fluxo principal (local): agente com "Local scripts" ligado; host abre porta livre em 127.0.0.1 e grava `url`, `token`, `headers` em `<userData>/automation/` (pasta 0700, arquivos 0600); `openbot-cli` ou curl chamam: listar agentes, rodar rotina, enviar mensagem, ler entrega, mudar modelo/conta, limpar contexto, ler pendências, responder pergunta, aprovar/negar.
- Alternativos/erros (webhook): 400 corpo inválido, 401 assinatura/timestamp, 404 rota desconhecida, 413 corpo grande, 415 tipo, 429 limite, 503 host offline/ocupado (reenviar); duplicata com mesmo delivery id devolve 200; evento que não casa tipo/filtro devolve 202 e é ignorado com motivo no histórico. Local: 400/401/403 (Origin ou Host estranho)/404/409/413/415/429; códigos de saída do CLI 0 a 5 (3 = aguardando pessoa, 4 = timeout, 5 = OpenBot fora).
- Regras e limites: corpo até 64 KiB; `type` 1 a 256 caracteres; até 128 filtros (JSON Pointer, igualdade tipada); 64 rotas de webhook por host; timestamp dentro de 5 minutos; recibos por 7 dias sem corpo; receptor aceita também Standard Webhooks (`webhook-*`/`svix-*`); evento chega ao agente como dado externo entre marcadores, sem dar ferramentas nem pular aprovações. Local: corpo até 32 KiB, payload até 4.000 caracteres, 30 mensagens+runs por agente por hora (opções 30/60/120/300/1.000), até 20 esperas abertas por agente, token novo a cada início, sem aceitar segredo ou resposta a perguntas secretas/takeover de navegador.
- Status webhooks (`docs/status-webhooks.md`) são só da página de status do próprio projeto (formatos json/slack/discord); fora do escopo do produto (inferido: irrelevante para o Open Bot).

### AU-06 Membros, papéis e permissões

- Ator: owner, admin, member.
- Gatilho: convite aceito, mudança de papel, salvar papéis.
- Fluxo principal: owner/admin cria convite (link `openbot://join` / `/join`, com servidor, impressão digital da chave e token) → pessoa entra, recebe sessão → admin define papel de servidor (Member/Admin) e papéis customizados.
- Níveis por agente: `none` (agente invisível, 404), `view` (só ler, 403 em escrita), `chat` (enviar, responder aprovações, tarefas), `manage` (configurar, rotinas, memórias, skills); "Everyone" tem `manage` por padrão para agentes não listados; owner/admin sempre `manage`; maior nível entre papéis vence; excluir agente é só admin.
- Alternativos/erros: salvar papéis com revisão antiga devolve 409; arquivo de papéis ilegível fecha todos os agentes a membros; ao sair, membro é removido dos papéis; limites conhecidos: composer não mostra agente `view`, `GET /v1/attachments/:id` não checa agente, canal não checa nível dos agentes ao enviar.
- Regras e limites: convite de 24 h, sessão de membro de 30 dias; convites permanentes até 5 (aceitam entradas ilimitadas até revogar); até 100 convites ativos e 100 membros armazenados, 10 sessões por membro; assentos: Starter 1, Standard 5, Pro 10; sem plano/licença 3 (`DEFAULT_TEAM_MEMBER_LIMIT`); servidores antigos mantêm 3/10/25; limite excedido dá `member_limit_reached` (409); log de auditoria guarda 500 entradas por servidor, leitura só owner/admin; login corporativo OIDC (Entra, Okta, Google) com teste obrigatório, domínio público recusado e TXT `_openbot.<domínio>` em produção; SCIM 2.0 com token `obscim_` (hash guardado); SAML não suportado.

### AU-07 Servidores hospedados e auto-hospedados

- Ator: owner (compra/cria), operador, cliente que acorda o servidor.
- Gatilho: "Adicionar servidor", falha de conexão em servidor parado, cron de rotina.
- Fluxo hospedado: plano → Stripe Checkout (35 min) → webhook de assinatura → claim (1 h, só hash guardado) → sandbox boat ou VPS de pool → primeiro boot resgata o claim, publica o host → ciclo `awaiting_payment, creating, starting, running, stopping, stopped, waking, error, deleted`.
- Fluxo auto-hospedado: `install-server.sh` + `openbot login` (código por e-mail) ou comando com claim de 15 minutos passado por stdin; também Docker, Umbrel, AWS ECS (sem Fargate); servidores extras no mesmo computador (processo filho headless em loopback, reinício até 3 vezes em 10 minutos, apagar manda à lixeira).
- Alternativos/erros: linha em `creating` sem sandbox por 10 minutos vira `error` e retenta; linha não paga apagada após 24 h; stack self-host exige conta/Signal/TURN próprios e desliga hosted, Slack, Telegram bot e Live Activity.
- Regras e limites: dorme após 15 minutos sem uso (uso = ação do usuário nos últimos 5 minutos ou foco, no máximo 30 minutos, ping a cada 4 minutos); 50 servidores por conta; claims de servidor 20 por 15 minutos; guarda de memória `MemoryMax=90%`, OOM prefere matar CLIs de provedor antes do main; multi-tenant em um Mac com usuário padrão por inquilino sem isolamento de recursos e Host Manager root só atualiza o app.

### AU-08 Cliente web

- Ator: membro com conta em navegador.
- Gatilho: abrir `openbot.run/app`, link `?agent=`, `/join`, `?plugin=`.
- Fluxo principal: login por código de e-mail (cookie, ticket curto para Signal) → conecta ao primeiro host → chat, arquivos, aprovações, canais, workflows, routine flows, marketplace, billing, visão remota do navegador do agente.
- Alternativos/erros: segunda aba recebe mensagem em vez de roubar o peer (lock por conta/host); celular mostra tela para baixar o app; reconexão nunca reenvia mensagem (Retry só com `message-client-id-v1`); sem desktop remoto completo, push ou offline.
- Regras e limites: upload/download 10 MB; imagens inline até 2 MB, mp3/mov até 10 MB, cache de 64 MB e 2 downloads simultâneos; HTML de resposta visual até 8 MB em iframe sandbox sem `allow-same-origin` (últimas 8 páginas); `/api/browser/*` exige mesma origem e `X-OpenBot-Browser: 1`; configurações do app, publicação de sites, PiP e memórias de agente ficam só no desktop.

### AU-09 App de celular

- Ator: membro com iPhone/Android.
- Gatilho: QR/link Mobile Connect, código por e-mail, push, Live Activity.
- Fluxo principal: conecta a todos os servidores da conta (o selecionado primeiro, os demais após 3 s); chat com fila (editar/reordenar/cancelar com `queue-edit-v1`), canais, workflows em modo lista, auditoria, desktop remoto em webview, notificações.
- Alternativos/erros: segundo plano pausa recuperação; após 30 s fora renova Signal e reinicia ICE; troca de rede abre nova conexão na mesma sessão; push só enquanto o celular está ausente ou a conexão fechou; host mantém evento 5 minutos antes de enviar.
- Regras e limites: tolerância de reconexão do Signal 10 minutos (host multiplexado) ou 30 s (antigo); janela de recuperação ICE de 15 s e máximo de 10 reinícios; Live Activity: prioridade 10 só para alerta/pedido/falha/resposta/fim de trabalho, estado inalterado reenviado a cada 10 minutos, atividade válida por 8 horas; push sela o conteúdo (o Worker só vê "OpenBot"); bloqueio do app e atalhos existem como pastas de feature (inferido pelos nomes).

### AU-10 Apps de mensagens (Slack, Discord, Telegram, WhatsApp)

- Ator: pessoa no chat externo; admin que conecta no Marketplace.
- Gatilho: menção, resposta numa conversa ligada, DM (Slack/WhatsApp).
- Fluxo principal: conectar → escolher modelo do Orchestrator (agente criado na seção Integrations) → nova conversa vai ao Orchestrator, que responde curto ou delega ao melhor agente → cada conversa externa é thread própria do agente → 👀 chegou, "Working on it…" vira resposta, ✅/❌/⏹ final; aprovação com botões Approve/Deny (só quem pediu responde); `stop`/`cancel` interrompe.
- Slack/Discord/Telegram: eventos entram por Signal (valida assinatura, repassa bytes ao host por socket) com ticket de rota ES256 de 5 minutos; Telegram usa um bot único cujo token só Signal tem; WhatsApp liga o número como dispositivo (QR ou código), direto entre PC e WhatsApp, sem conta OpenBot.
- Alternativos/erros: workspace/chat só responde a um servidor OpenBot (`*_taken`, `not_linked`); sem Orchestrator, Slack avisa que nenhum agente responde; desconectar o último apaga o Orchestrator e conversas; WhatsApp: 401/403/411 pedem religar, 440 outra sessão, 515 reinicia, backoff de 2 a 30 s, watchdog de 90 s.
- Regras e limites: Discord 2.000 caracteres por post, arquivo até 10 MB, contexto de 10 mensagens dos 15 minutos anteriores, papéis autorizados por servidor; Telegram arquivos 20 MB, link de uso único válido 15 minutos; WhatsApp resposta editável por 15 minutos, no máximo 3 pedidos de pareamento por 1 hora, histórico salvo 90 dias, cópias de arquivo até 2 GB, mínimo de 1 s entre posts ao mesmo chat; posts nunca marcam canal/@everyone; memórias por conexão (32).

### AU-11 Desktop remoto

- Ator: membro com papel permitido (padrão `members`), pessoa no computador host.
- Gatilho: "Conectar" ao computador no cliente.
- Fluxo principal: host sobe Sunshine, viewer Moonlight Web é servido por proxy local com sessão de uso único → vídeo por WebRTC com TURN do host → modo `private` remove candidatos fora de redes privadas.
- Alternativos/erros: pergunta no host (Allow) expira em 30 s; revogar ou "Stop all remote control" encerra; teste de permissão ocupa uma sessão e recusa outras; no Linux só X11; no navegador web não há desktop remoto (viewer exigiria origem separada, decisão de 23/09/2026 adiada).
- Regras e limites: política em arquivo local de preferências; notificação e item de bandeja avisam a sessão remota; cola do membro vai pela área do host via script injetado; celular usa proxy nativo em 127.0.0.1 com token aleatório e H.264 a 30 fps/3 Mbit/s nos presets descritos.

## 3. Fluxos de interface

- Barra lateral: Agentes, Rotinas (flows), Tarefas, Agenda, Workflows (Canvas), Marketplace, Settings; barra de servidores (`WorkspaceServerRail`) com estado real de cada host.
- Canais: diálogo de criação (busca de membros, coordenação), editor (instruções, líder, memória isolada, browser, imagem), conversa com autor/estado de tarefa, painel lateral, linha de tarefas aguardando com Stop/Continue/Reassign/Cancel, menu de contexto (arquivar/restaurar em "Deleted channels").
- Rotinas: editor do agente (When to run: Schedule/Webhook, "Filter events", "Send test event", chip "Copy run command" quando Local scripts), calendário de agenda com criação por dia e aviso de fuso, canvas de flows com Run now/Stop.
- Server settings: General, Members (convites, Company sign-in), Roles, Audit log, Agents defaults, Remote desktop policy, Timezone, Turn limits, Memory, Sites, Storage, Transfer, Update.
- Add server: planos hospedados (Starter/Standard/Pro), join por link, "New server on another computer" com comando e claim.
- Marketplace > Apps: cartões Slack/Discord/Telegram/WhatsApp com Connect, escolha de modelo do Orchestrator, Who can use, Who can write.
- Web: rail com pins locais, banner de celular, Billing em dialog que abre o portal Stripe na mesma aba.
- Celular: drawer por servidor, fila como rota, folha de estatísticas do desktop remoto, tela de auditoria, workflows em lista de passos.

## 4. Dados e contratos

- Tabelas do host (SQLite): `projection_routine_webhooks`, `projection_channel_routine_webhooks`, `workflow_trigger_webhooks`, recibos (`projection_webhook_receipts`, `workflow_webhook_receipts`), `projection_webhook_route_revocations`, `projection_messaging_connections/threads/memories/history/allowed_senders`, tabelas de workflow (migração 46), flows (migração 31), canais (migração 18), WhatsApp em SQLite próprio por número com AES-256-GCM.
- Arquivos de preferência por servidor (sem migração): `openbot-agent-access-v1.json` (papéis), `openbot-server-audit-v1.json`, `openbot-push-notifications-v1.json`, `openbot-remote-network-route-v1.json`, `openbot-local-servers-v1.json`, `openbot-routine-feed-v1.json`.
- Nuvem (D1): `webhook_routes`, `slack_workspace_routes`, `telegram_chat_routes`, `telegram_link_codes`, `server_member_limits`, `hosted_servers`, `remote_hosts`; Signal guarda rotas e revogações só em memória.
- Contratos: Team API protocolo v9 sobre três DataChannels (`rpc`, `events`, `files`); capacidades opcionais versionadas (`workflows-v1`, `routine-flows-v1`, `events-v1`, `agent-access-v1`, `server-audit-v1`, `channel-attention-v1`, `focus-use-v1`, `routines-once-v1` etc.) com codec congelado em `team-protocol/<nome>-v1.ts`; tipos de canal e comandos (`save`, `restore`, `archive`, `send`, `request`, `stop|resume|reassign|cancel`, `read`) em `ipc-chat-channels.ts`; agenda em `ipc-routines.ts`; workflows em `ipc-workflows.ts`; limites em `input-limits.ts`.
- Papéis: `TeamRole = owner | admin | member`; níveis por agente none/view/chat/manage.
- Webhook: corpo `{ type, occurredAt?, data? }`; assinatura `sha256=` + HMAC-SHA256 de `timestamp.deliveryId.corpo`; delivery id `^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$`.

## 5. Segurança e privacidade

- Segredos de webhook: gerados no host, mostrados uma vez, cifrados com `safeStorage`, registrados para redação em log; agente que cria webhook não recebe o segredo; ferramentas de webhook só rodam em turno iniciado por pessoa (run de rotina pode carregar corpo não confiável).
- Relay sem estado: Signal não guarda nem loga corpo, não tem segredo do webhook; limites de 16 requisições e 768 KiB pendentes por host; Slack/Telegram/Discord: tokens só no Worker/Signal (Telegram e Discord nunca chegam ao host).
- API local: só 127.0.0.1, rejeita Origin e Host estranhos (anti DNS rebinding), token por processo, arquivos 0600, nunca no prompt nem em argumentos; processo do mesmo usuário do SO pode ler o token, por isso é opt-in por agente e não muda permissões nem liga Local scripts.
- Mensageria: só quem fez o pedido aprova ou para; texto de pessoa de fora não permite que agente leia outro lugar; WhatsApp usa cliente não oficial (risco de bloqueio do número, número dedicado é mais seguro).
- Equipe: papéis aplicados no host (404 para `none`); alterações de acesso auditadas; convites e QR ligados à impressão digital da chave do host; login corporativo e SCIM tratados na conta, hosts só veem sessões OpenBot.
- Push/Live Activity: conteúdo selado com chaves derivadas do segredo do host, Worker só retransmite; prévias com segredos redigidos; sem entrega quando o membro está ativo em outro lugar (30 s).
- Multi-tenant em um Mac protege arquivos por permissão de SO, não protege contra inquilino hostil (CPU, memória, portas compartilhadas).
- Telemetria: relatório de webhook (`system_webhook_delivery`) sem id de rota, segredo, tipo ou corpo, máximo 60 por minuto.

## 6. Relevância para o Open Bot (inferido)

- Adaptável sem nuvem própria: rotinas com agendas, rotinas silenciosas, API local com token em arquivo, canais com líder e teto de atribuições, papéis none/view/chat/manage, log de auditoria, webhook HMAC com deduplicação por delivery id.
- Exigem infraestrutura que o projeto não tem: Signal/relay, WebRTC, hospedagem paga, desktop remoto.
- Guardas de loop a copiar: teto de atribuições por pedido, uma tarefa de canal por agente, proibição de devolver tarefa a quem delegou, idempotência por id de chamada.

## 7. Arquivos de referência

- Docs: `docs/architecture/{channels-and-messaging,servers,team-api,events,agents,computer-use}.md`, `docs/{automation,webhooks,status-webhooks,messaging,hosted-servers,self-hosting,self-hosted-server,docker,umbrel,aws-ecs,web-client,multi-tenant-hosting,remote-session-deployment}.md`.
- Contratos: `packages/contracts/src/{ipc-chat-channels,ipc-routines,ipc-events,ipc-workflows,input-limits,invite-links}.ts`, `packages/contracts/src/team-protocol/`.
- Main: `src/main/{automation-server,team-api-server,team-store,host-events-service,webhook-relay,webhook-security,signal-ingress,routine-feed-server,local-server-child}.ts`, `src/main/team-api/`, `src/main/local-servers/`.
- Backend: `src/backend/{channel-service,automation-command}.ts`, `src/backend/workflows/`, `src/backend/routine-flows/`, `src/backend/messaging/`.
- Renderer: `src/renderer/src/features/{channels,schedule,routine-flows,servers,server-setup,team,web-client,remote-desktop}/`, `src/renderer/src/features/workflows/`.
- Apps e pacotes: `apps/{auth-api,slack-app,discord-app,telegram-app,mobile}`, `packages/{team-client,whatsapp}`, `remote/` (Signal).
