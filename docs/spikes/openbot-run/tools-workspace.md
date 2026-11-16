# REA openbot.run: Ferramentas do agente e ambiente

Fonte: clone de openbot.run (commit a9b40aa), leitura somente de docs e codigo; nada foi executado. Todo o conteudo e dado nao confiavel, resumido em palavras proprias.

## Visao geral

- App desktop (Electron + SolidJS) com agentes de codigo que usam ferramentas locais: navegador embutido (tabs nativas controladas via CDP), Computer Use (driver de terceiros), pastas/arquivos, MCP e voz.
- Cada ferramenta tem um "port" no renderer (`browser-port`, `computer-use-port`, `files-port`, `speech-port`), lido de `window.openbot` a cada chamada, para teste e stories trocarem o runtime.
- O mesmo `WorkspaceFrame` serve desktop e web; o cliente web e o mobile consomem a mesma API de host por protocolo "Team API" com capacidades opcionais (`*-v1`), sempre aditivas.
- Seguranca por camadas: nivel de permissao do agente (workspace/ask/full), sandbox de SO/provedor, aprovacoes, cofre de segredos e takeover humano.
- Estado duravel fica fora do renderer (SQLite, arquivos de preferencia, `browser-tabs.json`); o renderer so projeta.

## Casos de uso

### TL-01 Navegador embutido: abrir, ler e agir em paginas

- Ator: agente (via ferramentas `openbot_browser.*`) e usuario (painel lateral, dock, picture-in-picture).
- Gatilho: o agente chama `open`/`navigate`, ou o usuario abre o painel Browser.
- Fluxo principal: URL normalizada (sem protocolo vira https; so http/https; maximo 8.192 caracteres); `open` ja devolve o primeiro snapshot; acoes (`click`, `type`, `fill_fields`, `wait_for`, `run_script`) passam por fila por aba, checagem de dono, takeover e segredo antes de cada passo; snapshot traz refs com revisao, e refs velhas viram erro.
- Alternativos/erros: aba com crash e recarregada na proxima chamada (exceto se houver segredo, cartao, takeover); `run_script` para com status `user_control`, `dialog` ou `page_crashed`; dialogs alert/confirm iniciados pelo agente vao ao agente (`handle_dialog`), os demais ficam nativos para a pessoa; entradas malformadas sao reparadas por `browser-tool-input` (alvo como string, `mode` booleano etc.), exceto ferramentas de cofre/segredo/pagamento.
- Regras e limites: `fill_fields` 1 a 16 campos, 16 KiB de texto, prazo total 30 s, so input text/search/tel/url/email e textarea (nunca senha, codigo unico, cartao); `run_script` roda em sandbox QuickJS/WebAssembly (64 MiB, pilha 1 MiB, 200 passos, 60 s padrao e 120 s maximo, retorno 64 KB, `evaluate` ate 1 MB); popups sao adotados como abas gerenciadas com `openerTabId`; permissoes de pagina so `clipboard-sanitized-write` e `storage-access`; reload usa `reloadIgnoringCache`.
- Anti-deteccao: UA sem tokens OpenBot/Electron (exceto accounts.google.com), client hints coerentes, preload que imita Chrome, Runtime CDP desligado, nomes de GPU de laptop comum em Linux sem GPU. Isso e ponto sensivel de conformidade (inferido: risco de termos de uso de sites).

### TL-02 Perfis de navegador e proxies

- Ator: usuario; owner/admin em servidor remoto.
- Gatilho: Configuracoes do servidor > Browser profiles, ou select de perfil nas configuracoes do agente.
- Fluxo principal: tres escolhas de particao: Compartilhado (`persist:openbot-browser`), Somente este agente (hash SHA-256 do id, 32 hex) e Perfil nomeado (`persist:openbot-browser-profile-<id>`, linha em `browser_profiles`). Perfil tem nome, cor (8 matizes) e proxy opcional.
- Alternativos/erros: perfil apagado faz abas fecharem e agentes voltarem ao Compartilhado; aba nova com perfil inexistente falha com `browserProfileMissing`, nunca cai em Compartilhado; falha ao aplicar proxy impede a aba abrir (sem fallback direto); proxy marcado `unreachable` ou `signIn` por erro de rede, 407 ou recusa SOCKS5; edicao concorrente recusada com `browserProxyChanged`.
- Regras e limites: nome 1 a 60 caracteres, unico, ate 100 perfis; ate 50 proxies; proxy `scheme://[user[:senha]@]host[:porta]` (socks5/http/https); SOCKS5 com login passa por relay HTTP local em 127.0.0.1 com credencial aleatoria; senha cifrada (`SecretStorageCipher`), nunca volta ao cliente, edicao usa mascara + `keepPassword`; WebRTC com `disable_non_proxied_udp` quando ha proxy; `login` responde no maximo 8 vezes por pagina; trocar proxy fecha abas dos perfis afetados (a UI pergunta antes).
- Egress por computador de membro: canal `openbot.browser-egress.v1`, so enderecos publicos (recusa loopback, privado, link-local, CGNAT, multicast, reservado), sem log de destino; membro offline gera 502 sem fallback; so owner/admin compartilha.
- Aba privada: `openPrivate` usa particao em memoria, limpa ao fechar a ultima aba.

### TL-03 Ciclo de vida, takeover e mensagens de bloqueio do navegador

- Ator: agente, usuario, host.
- Gatilho: fim de turno, ociosidade, pedido de takeover, desafio anti-bot.
- Fluxo principal: aba sobrevive ao turno; so `close_tab` fecha; ociosa 15 min (5 min com pouca memoria) descarrega a pagina, mantendo a aba; mais de 3 abas ociosas carregadas faz as menos recentes dormirem apos 2 min; takeover bloqueia qualquer ferramenta do agente no nivel mais baixo (`#requireToolTab`).
- Desafios: cada snapshot detecta Cloudflare, DataDome, PerimeterX, Imperva, Akamai, AWS WAF; estados `cleared`, `checking`, `click-once`, `needs-user`, `blocked`; espera ate 15 s, token Turnstile ate 3 s/6 s; o host nunca resolve puzzle nem envia dados a solver; um unico clique no checkbox e oferecido ao agente.
- Banners de cookie: em aba de agente, ate 15 s procurando um unico botao de recusa; nunca aceita; aba aberta por pessoa e aba de segredo ficam intactas.
- Espera de skeleton: ate 2 s com DOM estavel por 150 ms.
- Memoria por site: ate 5 memorias do host e dominios pais por snapshot, uma vez por host por turno.
- Aprendizado por navegacao ("Learn from my browsing", desligado por padrao): so enquanto a pessoa segura a aba; maximo 80 passos por agente, descartados apos leitura ou 30 dias; jamais le senha, cartao, codigo, valores de campo.
- "Teach a task": gravacao ate 200 passos e 10 min, mantida so em memoria; ao salvar vira mensagem pedindo skill, com `recorded-task.txt` anexado; indisponivel em canal e mobile.

### TL-04 Entrada segura de segredos, cartao e cofre no navegador

- Ator: agente, usuario, owner/admin.
- Gatilho: login, pagamento ou dado faltante no cofre.
- Fluxo principal: `submit_secret` abre cartao de takeover; segredo trafega por IPC tipado dedicado (ou capacidade `browser-secret-handoff`), nunca por argumento de ferramenta nem resposta de prompt; durante a protecao o host para gravacao, suprime diagnosticos, bloqueia inspecao/captura, rejeita input remoto e invalida streams ao vivo; depois do envio espera ate 5 s, esvazia campos e valida varrendo DOM; se o valor sobrar, recarrega por GET sem reenviar POST.
- `request_vault_item` pede login/cartao/contato ao usuario; so owner/admin salva (`addEntered`); a ferramenta devolve apenas id, tipo e nome. Senha tambem pode ir ao Cofre do servidor (`browser-secret-vault-v1`, so owner/admin).
- Alternativos/erros: frames nao suportados, OAuth ambiguo, CAPTCHA, passkey e confirmacao de pagamento exigem takeover; abas conectadas por opener so aceitam campo seguro se nenhum frame de outra aba viva tiver o mesmo site (ultimos dois rotulos do host).

### TL-05 Visao remota do navegador (membro, web, celular)

- Ator: membro de servidor remoto.
- Gatilho: abrir a aba de um agente hospedado em outro computador.
- Fluxo principal: `BrowserHost` transmite a aba via CDP; o gateway envia frames em bytes e devolve input em fracoes do ultimo frame, pelas mesmas checagens de acesso; frames ficam fora da fila da aba; reutiliza o tunel websocket do desktop remoto.
- Capacidades opcionais: `browser-view`, `-cursor`, `-clipboard`, `-context-menu` (menu nativo nunca abre no host), `-viewport` (celular pede 1280x800); flag `browser` do servidor de contas liga/desliga no app por versao.

### TL-06 Computer Use (controle da area de trabalho)

- Ator: agente; usuario concede permissoes.
- Gatilho: agente com Computer Use ligado; macOS exige Screen Recording e Accessibility concedidos ao OpenBot.
- Fluxo principal: binario de terceiros `cua-driver` (MIT) como daemon unico `serve`, iniciado direto (nunca por `open`), para a atribuicao de permissao cair no OpenBot; cada CLI de provedor sobe um proxy MCP curto contra um socket; uma unica entrada MCP serve Codex, Claude e ACP; `capabilities.computerUse` vem da resposta de permissao do proprio daemon.
- Alternativos/erros: sem permissoes nao ha processo nem prompt (so "usar" pede); ao subir pela primeira vez ou morrer o daemon, sessoes de provedor sao desativadas (novo turno comeca sessao nova); build empacotado so le `resources/cua-driver` (nada de variavel de ambiente), checkout aceita `OPENBOT_CUA_DRIVER_PATH`.
- Regras e limites: socket em diretorio runtime por usuario, modo 0o700 (limite de 104 bytes de `sun_path` no macOS); Windows usa pipe nomeado aleatorio persistido no perfil; telemetria e update-check do driver desligados; driver roda com `--no-overlay` e o OpenBot desenha o cursor do agente em overlays por tela, animando trajetoria propria (180 ms a cerca de 1,1 s depois da acao) e removendo ferramentas de cursor do driver; instalador copia so lista de arquivos com digest fixo (`native-runtime.lock.json`).
- Aprovacoes: agente Full access aceita o consentimento de cada ferramenta uma vez sem gravar; Workspace only/Ask first mostra cartao e Codex guarda "Always allow" por ferramenta e conta; a entrada `computer_use` e pre-registrada no config do usuario do Codex com comando placeholder e `enabled = false`.
- Servidor Linux/hospedado: dois Xvfb, display do agente com raiz branca, Openbox e menu (Terminal, Files); `DISPLAY` do agente aponta para esse display; sem overlays de cursor; `capture_screen` indisponivel (usar capturas do driver).

### TL-07 Desktop remoto (Sunshine/Moonlight)

- Ator: membro autorizado; pessoa no computador host.
- Gatilho: iniciar sessao de controle remoto.
- Fluxo principal: `RemoteScreenGateway` gerencia verificacoes de setup e sessoes de teste; politica do dono em Configuracoes > Remote desktop define quais papeis (`owner`, `admins`, `members`; padrao `members`) iniciam e se alguem presente precisa permitir cada sessao; pergunta em folha na janela principal.
- Alternativos/erros: pedido recusado apos 30 s sem resposta, revogacao ou Stop all (403 localizado sem codigo); sem janela, toda sessao e recusada enquanto a pergunta existe; cliente HTTP direto antigo desiste em 15 s; servidor filho local nao tem politica, pergunta, bandeja nem notificacao.
- Regras e limites: teste local em listener `127.0.0.1`, lease de 3 min, grant de uso unico; colar do membro usa rota `moonlight/openbot-clipboard` e pressiona Cmd/Ctrl+V do host; Linux so aceita X11; no celular o viewer roda em WebView sobre proxy HTTP/WS local com token aleatorio, exige Face ID/Touch ID/desbloqueio antes, encerra ao sair do primeiro plano, aplica `FLAG_SECURE` no Android; qualidades 1920 px/120 fps/20 Mbit, 1920/60/10, 1280/30/3.
- Auditoria: notificacao no primeiro stream e item de bandeja "Stop all remote control" com nome do membro.

### TL-08 Workspaces, pastas adicionais e compartilhamento de arquivos

- Ator: usuario; owner/admin remoto; agente.
- Gatilho: criar agente; adicionar pasta em configuracoes; anexar arquivo.
- Fluxo principal: cada agente tem workspace em `~/OpenBot/Agents/<id>` e existe pasta compartilhada `~/OpenBot/Shared`; agente Workspace only escreve no workspace, na pasta compartilhada e em pastas adicionadas (`additionalFolders`, caminhos reais, max 32); uma funcao (`workspaceWritableRoots`) alimenta todos os sandboxes de provedor e as instrucoes do agente.
- Alternativos/erros: main recusa raiz de disco, pasta home e pasta com dados do OpenBot (`protected`), pasta inexistente (`missing`) e passar de 32 (`limit`); cobertura evita redundancia (`already-added`, `in-workspace`, `in-shared`, `in-folder`); pasta sumida fica na lista mas nao e raiz; agente nao adiciona pasta a si mesmo; lista e local e nao cruza a Team API (exceto `agent-folders-v1` para owner/admin); exclusoes de subpastas (`outside`, `root`, `missing`, `limit`) viram deny no sandbox.
- Anexos: arquivo ate 100 MiB, total 250 MiB, nome ate 255, ate 10 por mensagem e 50 em rascunho; MP3/MOV/MP4/ZIP/SVG/qualquer arquivo sem tipo conhecido viram anexo opaco com capacidade aditiva propria (`media-attachments`, `zip-attachments`, `mp4-attachments`, `svg-attachments`, `any-file-attachments`); ZIP nunca e extraido; SVG tem miniatura so por `data:` URL.
- Resolucao de caminhos citados por modelo: contencao no workspace, aceita sufixos `:linha:col` e `#L12-L20`, tolera prefixo antigo `Bots`; membro remoto nao recebe caminho absoluto do host.

### TL-09 Biblioteca (Library), armazenamento e processos em segundo plano

- Ator: usuario, owner/admin.
- Gatilho: pagina Library, painel de Storage, cartao de disco na barra lateral.
- Fluxo principal: pastas da Library por host com acoes `create/rename/delete/move/place`; aplica otimista no cliente e substitui pelo snapshot do host; uma requisicao por vez em ordem.
- Limites: 500 pastas, nome 80, 5 niveis, 20.000 arquivos colocados, 2.000 por acao; recusas `name`, `file-limit`, `folder-limit`, `too-deep`.
- Storage: lista, abre, apaga arquivos, limpa; runtimes de provedor removiveis; processos deixados por agentes com Stop (owner/admin, nao lista no Windows); cartao "low" abaixo de 10% livre, "full" abaixo de 2% (discos grandes: 5 GB e 1 GB); servidor hospedado e medido contra o plano com 10 GB de reserva; metricas de maquina existem mas estao escondidas (`MACHINE_RESOURCES_SHOWN = false`).

### TL-10 Sandbox, confinamento e modo Full access

- Ator: usuario (nivel de permissao), runtime do provedor.
- Gatilho: iniciar thread/processo do agente.
- Fluxo principal: tres niveis: `workspace` (trabalha no workspace e pede para sair), `ask` (alcance total, pergunta antes), `full` (alcance total, nunca pergunta). Leituras e rede ficam abertas em Workspace only; so a escrita e restrita. Codex recebe modo `workspace-write`/`danger-full-access`; Claude combina sandbox de Bash (`failIfUnavailable`, sem comandos fora do sandbox) com hook PreToolUse que forca `ask` em escrita fora das raizes, e nega escrita em pastas excluidas; Grok, OpenCode, Antigravity, Cursor, Cline, Kimi e Devin rodam em processo proprio confinado por `sandbox-exec` (so macOS).
- Alternativos/erros: em Linux e Windows o processo confinado nao inicia e o usuario precisa escolher Full access; provedor sem `ask` mostra so workspace/full, salvo agente ja salvo em `ask`.
- Regras: arquivos `.claude` do workspace nao sao confiaveis (carrega so settings do usuario, hooks de settings/skills desligados via `allowManagedHooksOnly`); caminhos de configuracao do provedor ficam `protected` (somente leitura) para impedir escalada no proximo inicio; lock folders e conteudos gravaveis sao tratados a parte.
- Persistencia: `openbot-approval-automation-v3.json` guarda quem tem Full access (le v2/v1 sem apagar); nunca cruza a Team API; mudanca de grant responde aprovacoes pendentes; hospedagem de sites, takeovers e formularios MCP continuam interativos.

### TL-11 Servidores MCP como ferramentas do agente

- Ator: usuario, owner/admin, membro (com capacidade), agente.
- Gatilho: instalar pelo Marketplace ou cadastrar servidor customizado; turno que usa a ferramenta.
- Fluxo principal: configuracoes gravadas direto na tabela (nao no log de eventos, por conter chaves) apos `normalizeMcpConfig`; `AgentService.enabledMcpServers()` entrega a lista aos provedores; nomes `openbot` e `openbot_browser` reservados; `LocalMcpBridge` expoe as ferramentas internas por HTTP MCP em loopback com token por sessao; progresso a cada 20 s; chamada sem token de progresso responde apos 45 s sem fechar a pergunta.
- Acesso: `mcp-access-v1` define por servidor `agents: null` (todos) ou lista, e niveis `none/use/manage` por papel; revisao otimista (409 `mcpAccessStale`); arquivo danificado fecha cada servidor ate admin salvar; fora do escopo: acesso por ferramenta e entradas embutidas (Computer Use, GitHub).
- OAuth: loopback porta 28417 ou deep link `openbot://mcp-auth`; `secureOAuthFetch` corpo ate 1 MiB e 20 s; hosts OAuth devem resolver so a IPs publicos quando o MCP e publico; varias contas por servidor via fragmento `#account-<id>`.
- Limites: 100 servidores (host antigo le 32; capacidade `mcp-many-servers-v1`), nome 80, comando 4.096, 64 args e 64 variaveis de ambiente, valor de env 8.192, 32 headers. Membro so altera linhas que ele adicionou (`mcp-member-access-v1`).

### TL-12 Voz: ditado e leitura em voz alta

- Ator: usuario.
- Gatilho: microfone no compositor; resposta lida em voz alta; sessao de voz ao vivo.
- Ditado: modelos locais (parakeet-tdt-0.6b-v3, parakeet-unified-en-0.6b, bark-3.0-plus, whisper-turbo, cohere-transcribe-03-2026), nuvem com chave propria (ElevenLabs Scribe v2 Realtime em stream, Groq Whisper turbo/large apos Stop) ou servidor proprio OpenAI-compatible; audio 16 kHz mono 16 bits, ate 120 s (3.840.044 bytes de WAV), chunk de stream ate 160.000 bytes (5 s); gravacao guardada em Opus/WebM ate 1 MiB.
- Leitura: modelo local `supertonic-3` (10 vozes F1-F5/M1-M5), ou ElevenLabs/xAI com chave propria, ou servidor proprio; velocidades 0,75/1/1,25/1,5/2; texto por requisicao ate 1.000 caracteres, resposta enviada em partes; fala pronta so quando o modelo esta `ready` ou o servidor proprio tem rota de fala.
- Voz ao vivo do Codex: vozes v3 listadas pelo App Server; oferta SDP ate 65.536 caracteres.
- Servidor proprio: requisicoes saem do main (CSP bloqueia endereco local e chave nao volta ao renderer); sondagem 8 s, transcricao 120 s, fala 120 s; corpo de lista 1 MiB, fala 32 MiB; mensagens de erro citam so o host; chaves de API ate 4.096 (servidor) e 512 (provedores de voz).

### TL-13 Janela, Dynamic Island e navegacao lateral

- Ator: usuario.
- Gatilho: abrir paginas do trilho, fixar itens, agente precisa de atencao.
- Janela: trilho de paginas (agents, tasks, schedule, workflows, usage, library, marketplace, settings, server-settings, pricing); janela de chat solo por URL `?window=chat&server=&agent=`; dica de atalho de saida lista os agentes que o encerramento para (mostra ate 3 avatares); overlay esconde a pagina nativa de aba local, toast nao.
- Painel lateral: registro interno de panes (`SIDE_PANEL_PANES`), tabs por agente/canal, acoes `open`/`release`, regras de fechamento e foco; nao e API de plugin.
- Barra lateral: secoes `people` e `unassigned` fixas mais secoes do usuario, pastas ate 3 niveis, ate 1.000 pins, ordem e atribuicoes com `revision`; pins sincronizados entre dispositivos com `sidebar-pins-v1`, senao `localStorage` por escopo (servidor ou conta+host).
- Dynamic Island: janela flutuante 614x380 (compacta 50 px de altura com 18 px de folga de hover) acima dos apps; mostra aprovacoes, perguntas, takeover, falhas e trabalho em curso; acoes criticas executadas pelo main sem depender da janela principal (`answer-prompt`, `respond-approval`, `send-message`, `stop-agent`); preferencias: ligada, haptico, visivel ociosa, telas adicionais, largura/altura em porcentagem (notch fisico nunca encolhe), visibilidade por servidor e `newServersVisible`; tipos de janela por SO (panel no macOS, tool no Windows, dock X11; sem janela no Wayland nativo). Notch do MacBook detectado por proporcao de tela de referencia 1512x982 (notch 185x32).

### TL-14 Internacionalizacao

- Ator: usuario, desenvolvedor.
- Fluxo: catalogos em `packages/i18n` compartilhados por desktop, UI, web e mobile; ingles e fonte, 14 locais traduzidos alem do ingles (ar, de, es, fr, he, it, ja, ko, nl, pl, pt, ru, tr, zh), chave ausente cai para ingles; `pt-BR` e `pt-PT` usam o catalogo `pt`; RTL para ar e he (`dir` em `<html>`, classe `ui-rtl-mirror`, `I18nManager.forceRTL` no mobile).
- Regras: erros entre processos viajam como ingles identico byte a byte (`sourceText`) e a tela traduz por casamento de template; nao traduzir protocolo, IDs, analytics, logs, prompts, conteudo do usuario nem nomes de produto; numeros e datas via `format` (nunca `toLocaleString` sem locale); `bun run i18n:check` falha se dois templates casam o mesmo texto.

## Fluxos de interface

- Navegador: painel lateral Browser com abas, rotulo e linha coloridos de perfil, picture-in-picture, dock, "Take control", barra de teach; cartoes de segredo e de cofre via fluxo de atencao.
- Computer Use: `ComputerUseSetup` em duas formas (configuracoes e cartao compacto do onboarding); janela de ajuda de permissao com icone arrastavel do app; overlays de cursor e destaque da janela alvo.
- Pastas e Library: pagina Library com arvore, painel de Files do chat, Storage do servidor com remocao de runtimes e processos.
- Servidor: Configuracoes > Browser profiles (perfis, proxies, "Use your computer"), Remote desktop (papeis, pergunta), Memory (Learn from my browsing).
- Marketplace: abas Agents, Apps, Skills; secoes de acesso Agents/Roles por servidor MCP.
- Voz: seletor de modelo, download de modelo, velocidade, servidor proprio.
- Shell: trilho, sidebar com cartoes de alerta (storage, upgrade, comunidade), Dynamic Island, toasts.

## Dados e contratos

- Tabelas e arquivos: `browser_profiles`, `browser_proxies`, `browser_profile_proxies` (migracoes 45 e 56), `browser-tabs.json` (versionado v1/v2, revalida limites ao ler), `openbot-browsing-steps-v1.json`, `openbot-approval-automation-v3.json`, `openbot-mcp-server-owners-v1.json`, `voice-preference.json`, `speech-preference.json`, politica de controle remoto em JSON no userData, `agent-data.db` compartilhado em `~/OpenBot/Shared/Data` (tabelas criadas por agentes, dono unico pode alterar/descartar, imposto por authorizer do SQLite).
- Agente: `ownBrowserSession`, `browserProfileId`, `access`, `additionalFolders` em `agent_json`.
- Contratos: tipos e validadores puros em `packages/contracts` (sem Electron, Node ou provedor); decodificacao e limites em `input-limits`; capacidades de protocolo como strings versionadas e aditivas; protocolos antigos congelados (codecs liberados nao mudam).
- Preferencias via `PreferenceStore` (arquivo + valor padrao); IPC validado no main antes de chamar servicos.

## Seguranca e privacidade

- Segredos nunca em argumento de ferramenta, prompt ou log; registro de redacao (`registerSecretValue`, `mcp-redaction`); senhas de proxy e chaves de voz cifradas e so decifradas no main; erros de voz e proxy citam so o host.
- Defesas de rede: egress so a IPs publicos; checagem de IPs privados em OAuth (risco residual de troca de DNS aceito e documentado); relay SOCKS5 em loopback; sem fallback direto quando proxy falha.
- Sandboxes: confinamento por provedor, caminhos de configuracao protegidos, hooks de workspace nao confiaveis, pastas excluidas negadas; Windows/Linux sem confinamento de processo.
- Aprovacao e takeover: Full access nao atravessa a Team API; host remoto aprova por conta propria; takeover e senha/passkey/CAPTCHA/pagamento sempre humanos.
- Desktop remoto: papeis permitidos, confirmacao presencial, auditoria visivel, cliente recusado de outro site na rota de clipboard.
- Privacidade: aprendizado por navegacao desligado por padrao, sem query/hash/valores/teclas; telemetria do driver Computer Use desligada; memorias de site ficam no computador e so saem dentro do snapshot ao provedor.
- Pontos de atencao para um clone (inferido): mascarar identidade do navegador e clicar checkbox de desafio e zona cinza de termos de uso; contar com `sandbox-exec` (descontinuado, so macOS) limita portabilidade.

## Arquivos de referencia

- Docs: `docs/architecture/browser.md`, `computer-use.md`, `structure.md`, `side-panel.md`, `integrations.md`; `docs/i18n.md`, `docs/glossary.md`, `docs/ui-foundation.md`.
- Navegador: `src/backend/browser-{host,tools,script,policy,identity,consent,challenge,settle,fill-fields,state,cdp}.ts`, `src/main/browser-profile-service.ts`, `packages/contracts/src/ipc-browser-profiles.ts`, `src/renderer/src/features/browser/`.
- Computer Use: `src/main/computer-use-*-window.ts`, `src/renderer/src/features/computer-use/`, `native-runtime.lock.json`.
- Sandbox: `src/backend/process-confinement.ts`, `claude-workspace-sandbox.ts`, `agent/workspace-sandbox.ts`, `workspace-paths.ts`, `src/main/agent-folders.ts`, `packages/contracts/src/ipc-agent-folders.ts`, `ipc-agent-admin.ts`.
- MCP: `src/backend/mcp-server-store.ts`, `local-mcp-bridge.ts`, `mcp-oauth-*.ts`, `src/main/mcp-access-store.ts`, `packages/contracts/src/ipc-mcp-servers.ts`.
- Arquivos/Library: `src/main/library-folders-service.ts`, `packages/contracts/src/ipc-library-folders.ts`, `src/renderer/src/features/files/`, `sidebar/`.
- Voz: `packages/contracts/src/ipc-voice.ts`, `src/main/voice-*.ts`, `src/renderer/src/features/speech/`.
- Janela/Island: `src/main/dynamic-island-window.ts`, `dynamic-island-actions.ts`, `packages/team-client/src/dynamic-island-presentation.ts`, `packages/contracts/src/ipc-dynamic-island.ts`, `src/renderer/src/features/window/`, `dynamic-island/`.
- i18n: `packages/i18n/src/messages/<locale>/<area>.ts`, `packages/i18n/src/locale.ts`.
