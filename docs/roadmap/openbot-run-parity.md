# Roadmap: paridade com o openbot.run, por domínio

Base: [REA dos 68 casos de uso](../spikes/openbot-run/README.md). Aqui entram só
os casos **Parcial**, **Trazer**, **Adaptar** e **Depois**. Os 17 casos **Fora**
e os 9 que já temos não geram task.

Antes de cada task, confira o [mapa de módulos e reúso](../architecture/module-reuse-map.md).

Regras de corte: cada task tem no máximo 5 pontos e vira um PR; no máximo 3 PRs
abertos ao mesmo tempo; contrato externo ou comportamento visível vai em PR
próprio, por último dentro do domínio.

## Visão por ondas

| Onda | Foco                               | Domínios                    | Pontos |
| ---- | ---------------------------------- | --------------------------- | -----: |
| 1    | Conectar sem atrito                | Conexões, Provedores        |     36 |
| 2    | Conversa mais segura e controlável | Conversa, Agentes           |     36 |
| 3    | Ferramentas com permissão clara    | Ferramentas                 |     21 |
| 4    | Trabalho sem o usuário presente    | Rotinas e automação, Equipe |     37 |
| 5    | Acabamento de app                  | App e plataforma            |     14 |

As ondas são ordem de prioridade, não bloqueio: tasks sem dependência rodam em
paralelo com a onda anterior.

## 1. Conexões (`connections/`)

Detalhe e arquitetura em [openbot-run-connect-rea.md](../spikes/openbot-run-connect-rea.md).

| Task                 | Entrega                                                            | Casos        | Pts | Depende de   |
| -------------------- | ------------------------------------------------------------------ | ------------ | --: | ------------ |
| CON-1 **(entregue)** | `core/`: tipos, rota do Connect, máquina de estados, regra ESLint  | PR-03        |   3 | —            |
| CON-2 **(entregue)** | Mover chave e tela atual para `api-key/`, `credentials/`, `panel/` | PR-03        |   5 | CON-1        |
| CON-3 **(entregue)** | OAuth PKCE do OpenRouter e `server/` (início, callback, troca)     | PR-03        |   5 | CON-1        |
| CON-4 **(entregue)** | Botão Conectar, diálogo de estados e Desconectar                   | PR-03, PR-11 |   3 | CON-2, CON-3 |
| CON-5 **(entregue)** | Script de teste real lê o cofre                                    | PR-03        |   3 | CON-3        |
| CON-6 **(spike)**    | Spike `cli-login/` (Codex, OpenCode) com análise de termos         | PR-10        |   3 | CON-1        |

Paralelo: CON-2 e CON-3; CON-5 e CON-6 depois de CON-3.

## 2. Provedores e modelos (`model/`, `usage/`)

| Task                      | Entrega                                                               | Casos        | Pts | Depende de |
| ------------------------- | --------------------------------------------------------------------- | ------------ | --: | ---------- |
| PRV-1 **(entregue #186)** | Varredura local de Ollama e LM Studio, erro só com host, corpo ≤ 1 MB | PR-05        |   3 | —          |
| PRV-2                     | Endpoint OpenAI-compatível próprio com nome, guardado como conexão    | PR-04        |   3 | CON-2      |
| PRV-3 **(entregue)**      | Liga/desliga de provedor na tela, sem apagar a chave                  | PR-07        |   2 | CON-4      |
| PRV-4 **(entregue)**      | Lista de modelos de backup por bot, usada pelo failover               | PR-08, AG-24 |   3 | —          |
| PRV-5 **(entregue)**      | Espera do reset de limite com aviso, antes do backup                  | PR-09, AG-24 |   3 | PRV-4      |

Paralelo: PRV-1 e PRV-4 desde já, sem tocar em `connections/`.

## 3. Conversa (`chat/`, `conversations/`)

| Task                      | Entrega                                                          | Casos | Pts | Depende de |
| ------------------------- | ---------------------------------------------------------------- | ----- | --: | ---------- |
| CHT-1 **(entregue)**      | `clientMessageId` no envio: reenvio não duplica                  | AG-06 |   3 | —          |
| CHT-2 **(entregue)**      | Modo "corrigir o rumo": mensagem entra no próximo passo do turno | AG-07 |   5 | CHT-1      |
| CHT-3 **(entregue #187)** | Ramificar: copia até um turno concluído para conversa nova       | AG-09 |   3 | —          |
| CHT-4 **(entregue)**      | Pergunta lateral: contexto recente, nada gravado no histórico    | AG-13 |   3 | —          |
| CHT-5 **(entregue #187)** | Thread filha de uma conversa (modelo de dados e lista)           | AG-08 |   5 | —          |
| CHT-6 **(entregue #189)** | Painel de tarefas com as threads de todos os bots                | AG-10 |   3 | CHT-5      |

Paralelo: CHT-1, CHT-3, CHT-4 e CHT-5 não compartilham arquivos de domínio;
coordenar só `ChatExperience.tsx`.

## 4. Agentes (`bots/`, `bot-sharing/`)

| Task                 | Entrega                                                          | Casos        | Pts | Depende de |
| -------------------- | ---------------------------------------------------------------- | ------------ | --: | ---------- |
| BOT-1 **(entregue)** | Excluir com desfazer: some da lista, apaga depois de 8 s         | AG-04        |   2 | —          |
| BOT-2 **(entregue)** | Ocultar e restaurar, com grupo recolhido na barra lateral        | AG-05        |   2 | —          |
| BOT-3 **(entregue)** | Boas-vindas: 3 primeiras tarefas sugeridas pelo perfil           | AG-02        |   2 | —          |
| BOT-4 **(entregue)** | Card de preview do template e link de instalação com confirmação | AG-18, AG-19 |   5 | —          |
| BOT-5 **(entregue)** | Ferramentas `create_bot` e `update_bot`, sempre com aprovação    | AG-03        |   3 | TOL-1      |

## 5. Ferramentas (`tools/`, `attachments/`)

| Task                      | Entrega                                                          | Casos        | Pts | Depende de |
| ------------------------- | ---------------------------------------------------------------- | ------------ | --: | ---------- |
| TOL-1 **(entregue #176)** | Nível por ferramenta: perguntar, permitir, bloquear              | TL-10        |   3 | —          |
| TOL-2 **(entregue #186)** | Ferramenta `ask_user` com cartão de opções                       | AG-11        |   3 | —          |
| TOL-3 **(entregue #187)** | `read_page`: leitura de página pelo servidor, com `server-guard` | TL-01        |   5 | TOL-1      |
| TOL-4 **(entregue)**      | Pasta de trabalho por bot, só leitura no início                  | TL-08        |   5 | TOL-1      |
| TOL-5 **(entregue)**      | Spike de MCP como ferramenta (transporte, OAuth, permissão)      | PR-18, TL-11 |   3 | TOL-1      |
| TOL-6 **(entregue)**      | Biblioteca de arquivos gerados                                   | TL-09        |   2 | TOL-4      |

O #188 fechou a janela de DNS rebinding do `read_page`: a conexão vai só ao endereço já validado (`server-guard/pinned-fetch.ts`), sem reaproveitar sockets.

## 6. Rotinas e automação (novo domínio `routines/`)

| Task                      | Entrega                                                       | Casos        | Pts | Depende de   |
| ------------------------- | ------------------------------------------------------------- | ------------ | --: | ------------ |
| ROT-1 **(entregue #186)** | Domínio puro: agenda, próxima execução, estados, regra ESLint | AU-03        |   3 | —            |
| ROT-2 **(entregue #186)** | Agendador no servidor local, persistido no SQLite             | AU-03        |   5 | ROT-1        |
| ROT-3 **(entregue #187)** | Tela de rotinas e execução silenciosa ("sem novidade")        | AU-03, AG-15 |   5 | ROT-2        |
| ROT-4 **(entregue #188)** | Rotina com thread própria                                     | AG-16        |   2 | ROT-3, CHT-5 |
| ROT-5 **(entregue #188)** | Rota local de automação com token, só loopback                | AU-05, AG-21 |   5 | ROT-2        |
| ROT-6 **(entregue)**      | Esperas: bot pausa até rotina ou evento acordar               | AG-17        |   3 | ROT-5        |
| ROT-7 **(entregue)**      | Rotinas encadeadas                                            | AU-04        |   3 | ROT-3        |
| ROT-8 **(entregue)**      | Spike de Telegram sobre a rota de automação                   | AU-10        |   3 | ROT-5        |

## 7. Equipe (`crew/`)

| Task                           | Entrega                                                         | Casos | Pts | Depende de |
| ------------------------------ | --------------------------------------------------------------- | ----- | --: | ---------- |
| CRW-1 **(entregue #187)**      | Guarda de loop: teto de rodadas e detector de eco               | AU-02 |   3 | —          |
| CRW-2 **(parcial #188, #189)** | Sala do crew como canal com vários bots e roteamento pelo chefe | AU-01 |   5 | CRW-1      |

CRW-2 no #188 entregou a guarda de loop dentro do turno do crew, a nota de parada na sala e o roteamento por `@menção` sem chamada ao chefe. O #189 entregou o canal guardado do AU-01 (membros, líder, instruções, ordem estável e tetos), o turno do crew ao postar no canal, a tela de canais no editor do bot principal e várias `@menções` do chefe num só turno. Falta validar com modelo real.

## 8. App e plataforma (`pwa/`, `settings/`, shell)

| Task                      | Entrega                                          | Casos | Pts | Depende de |
| ------------------------- | ------------------------------------------------ | ----- | --: | ---------- |
| APP-1 **(entregue #189)** | Aviso de nova versão do service worker           | PR-13 |   2 | —          |
| APP-2 **(substituída)**   | Onboarding: provedor conectado ou começar grátis | PR-01 |   3 | CON-4      |
| APP-3 **(entregue)**      | Fixar conversas e pastas na barra lateral        | TL-13 |   3 | —          |
| APP-4 **(entregue)**      | Ditado e leitura em voz alta com Web Speech API  | TL-12 |   3 | —          |
| APP-5                     | Revisão do fluxo móvel instalado                 | AU-09 |   3 | —          |

## 9. Trilha UX: paridade de experiência com o openbot.run

Telas, fluxos e critérios de aceite estão na [especificação de paridade de UX](../specs/spec-ux-parity.md) (`AC-*`). Esta trilha cuida de tela e fluxo; a lógica continua com os domínios das seções 1 a 8. Quando uma fatia repete uma task de outra seção, ela aponta para a task original e não a replaneja.

Prioridade visível: primeiro a primeira execução terminar numa conversa funcionando, depois o modelo por agente no chat e, por último, a navegação centrada no agente.

Fatias entregues: **UX-10** (com a CHT-2), **UX-2** (#148), **UX-1** (#149), **UX-3** (#152), **UX-7** (#153), **UX-5** (#155), **UX-4** (#158, com o aviso de falha em #164), **UX-9** (#166, com o replay no servidor em #172 e #175), **UX-8** (#167, com correções em #179 e #182), **UX-12** (#168, com o provedor desligado em #174 e #177), **UX-6** (#169) e **UX-11** (#171). A TOL-1 saiu em #176. Fora da tabela, na mesma trilha: ações em erro de modelo (#154), desfazer em "Nova conversa" (#157), conexão obrigatória antes dos agentes (#159) e seletor de modelo no campo de mensagem (#160, #161). Os pontos marcados com `*` são estimativa, não medida.

| Ordem | Fatia                                 | Entrega                                                                                        | Referências            | Pts | Depende de   | Grupo |
| ----: | ------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------- | --: | ------------ | ----- |
|     1 | UX-2 **(entregue #148)**              | Botão Conectar no preset OpenRouter da aba Modelo                                              | CON-4, PR-03           |  3* | —            | G1    |
|     2 | UX-1 **(entregue #149)**              | Seletor de modelo do agente aberto pelo badge do cabeçalho                                     | AG-24, PR-08           |  3* | —            | G1    |
|     3 | UX-3 **(entregue #152)**              | Primeira execução: "começar grátis" termina no chat com modelo ativo e tarefa inicial no campo | PR-01, substitui APP-2 |   3 | —            | G1    |
|     4 | UX-4 **(entregue #158, #164)**        | Primeira execução: passo "conectar" usa o diálogo da UX-2 e volta ao chat                      | PR-01                  |   3 | UX-2, UX-3   | G2    |
|     5 | UX-5 **(entregue #155)**              | Troca de modelo durante turno vale na próxima mensagem, com estado visível                     | AG-24                  |   3 | UX-1         | G2    |
|     6 | UX-6 **(entregue #169)**              | Modelo do agente visível no cabeçalho do celular, com o mesmo seletor                          | AU-09                  |   2 | UX-1, UX-5   | G3    |
|     7 | UX-7 **(entregue #153)**              | Seção "precisam de você" acima da lista de agentes, com link para o chat                       | TL-13, AG-11, AG-12    |   3 | —            | G1    |
|     8 | UX-8 **(entregue #167, #182)**        | Trocar entre os 9 primeiros agentes pelo teclado, na ordem da lista                            | TL-13                  |   2 | UX-7         | G2    |
|     9 | UX-9 **(entregue #166, #172, #175)**  | Envio idempotente com id de cliente e "tentar de novo" sem duplicar                            | AG-06, CHT-1           |   3 | UX-5         | G3    |
|    10 | UX-10 **(entregue, via CHT-2)**       | Modo "corrigir o rumo" por agente (é a CHT-2; não replanejar)                                  | AG-07, CHT-2           |   5 | UX-9         | G3    |
|    11 | UX-12 **(entregue #168, #174, #177)** | Provedores em lista, com página por provedor, liga/desliga e menu de ações                     | PR-07, PR-11, PR-19    |   5 | UX-2         | G2    |
|    12 | UX-11 **(entregue #171)**             | Listar e revogar "sempre permitir" em Configurações                                            | AG-12, TOL-1           |   3 | UX-12, TOL-1 | G3    |

Total: 35 pontos. Nenhuma fatia passa de 5.

Grupos paralelos (arquivos disjuntos):

- **G1, agora:** UX-2, UX-1, UX-3 e UX-7. Respeitar o limite de três PRs abertos: as duas fatias em andamento contam. UX-3 e UX-7 abrem PR quando houver vaga.
- **G2, depois de G1:** UX-4 (após UX-2 e UX-3), UX-5 (após UX-1), UX-8 (após UX-7) e UX-12 (após UX-2). Tocam áreas diferentes: onboarding e leitura de `ConnectWithProvider`; `connections/panel` e `SettingsModal`; `use-chat-turns` e `ModelStatusBadge`; sidebar e `CommandPalette`.
- **G3, depois de G2:** UX-6 (cabeçalho; depois de UX-5 por causa do `ModelStatusBadge`), UX-9 e UX-10 (ambas em `use-chat-turns`, em sequência) e UX-11 (depois de UX-12 e TOL-1).

Regras da trilha:

- APP-2 fica substituída por UX-3 e UX-4. Não abrir as duas.
- Rotinas, canais e webhooks (AU-03 a AU-05) não entram aqui: continuam em ROT-* e CRW-*.
- Cada fatia fecha com os `AC-*` da especificação da sua área, verificados em 375 px e em desktop.

## Rodada de paridade funcional (2026-11-20)

Uma auditoria do código achou BOT-2 e BOT-3 já prontos (`bot-visibility.ts`,
`WelcomeStarters.tsx`); a tabela só estava atrasada. A mesma rodada entregou:

- **CHT-2 / UX-10:** botão "Corrigir o rumo" ao lado da fila. A resposta em
  curso para onde está, a resposta parcial fica na thread e a última mensagem
  da fila é respondida antes das outras. É a versão no cliente: a mensagem não
  entra no meio de um passo do tool loop.
- **CHT-4:** painel "Pergunta lateral" com as 12 últimas mensagens da thread;
  nada é gravado.
- **BOT-4:** link de instalação com o template no fragmento da URL (nunca vai ao
  servidor), card de prévia e confirmação.
- **BOT-5:** `create_bot` e `update_bot`, sempre perguntando, sem "sempre
  permitir", validados pelo mesmo `validateBotsWrite` da API.
- **TOL-4:** `workspace_list` e `workspace_read`, só leitura, em
  `OPENBOT_WORKSPACE_DIR/<bot>`; sem dotfiles, sem symlink para fora, 64 KB.
- **ROT-7:** campo "Depois de outra rotina"; a seguinte recebe o resultado como
  dado externo, sem ciclo e com no máximo 5 rotinas por cadeia.
- **APP-3 (parcial):** fixar conversas paralelas na barra; pastas ficam para
  depois.
- **APP-4:** ditado (Web Speech) no campo de mensagem e leitura em voz alta nas
  respostas, só onde o navegador oferece.
- **CON-5:** `run-real-model.sh --vault` roda os casos padrão com a chave salva
  no cofre, sem pedir nem ver a chave.
- **Spikes:** [CON-6](../spikes/cli-login-terms.md),
  [TOL-5](../spikes/mcp-tools.md) e [ROT-8](../spikes/telegram-automation.md).

Ainda abertos: PRV-2 (endpoint próprio com nome como conexão; o preset Router
já aceita qualquer URL compatível com OpenAI), ROT-6 (esperas), TOL-6
(biblioteca de arquivos, depende de escrita na pasta de trabalho), APP-3
(pastas), APP-5 (revisão em aparelho) e a validação da CRW-2 com modelo real.

## Segunda rodada (2026-11-20)

- **TOL-5 / MCP-1 a MCP-3:** `mcp/` com config (`OPENBOT_MCP_SERVERS`), nome
  qualificado (`mcp__<servidor>__<tool>`), cliente Streamable HTTP (JSON e SSE,
  sessão, teto de 1 MB) pelo transporte com IP fixado e adaptador para
  `ToolDefinition`. Toda tool MCP pergunta antes; o resultado vai como dado
  externo. MCP-4 (tela em Conexões) e MCP-5 (OAuth) ficam abertas: por ora o
  servidor é configurado no ambiente.
- **TOL-6:** `workspace_write` (pergunta antes, até 7 KB por chamada, porque os
  argumentos de uma tool têm teto de 8 KB) e a seção **Arquivos** no editor do
  bot, que lista e baixa sempre como anexo.
- **ROT-6:** `schedule_wakeup` cria uma rotina de uma vez (novo tipo de agenda
  `once`) numa thread própria: num horário, depois de uma rotina do bot, ou o
  que vier primeiro (até 7 dias). Até 20 esperas por bot; roda uma vez e
  desliga.
- **APP-3:** pastas de bots na barra lateral, pelo editor; os atalhos Alt+N
  seguem a ordem mostrada. Arrastar só reordena fora das pastas.

Continuam abertos: PRV-2 (exige mais de uma vaga de chave por provedor no
cofre), MCP-4 e MCP-5, Telegram (TG-1 a TG-4), SIWC (CON-7), APP-5 e a
validação da CRW-2 com modelo real.

## Terceira rodada (2026-11-20)

- **ROT-8 / TG-1 a TG-3:** ponte do Telegram em `telegram/`, ligada por
  `TELEGRAM_BOT_TOKEN` e `TELEGRAM_ALLOWED_CHATS` (sem lista, fica
  desligada). Long polling com backoff, offset salvo antes de responder (não
  repete depois de reiniciar), mensagens com mais de 10 minutos descartadas,
  contexto das últimas 20 falas por chat no SQLite, `/new` limpa, resposta em
  partes de 4096. Chat fora da lista só recebe o próprio id no `/start`. A
  conversa do Telegram ainda não aparece como thread no app; TG-4 (aprovação
  por botão) segue aberta, então o bot responde sem ferramentas por lá.
- **MCP-4 (parcial):** seção **Integrações do servidor** em Conexões: cada
  servidor MCP (host, no ar, quantas ferramentas) e o estado do Telegram, sem
  tokens, caminhos ou chat ids. Adicionar servidor pela tela continua aberto.
- **Refatoração:** `askBotOnServer` reúne o caminho "perguntar ao bot no
  servidor" usado pelas rotinas e pelo Telegram.

Continuam abertos: PRV-2 (o cofre tem `provider` como chave primária: precisa
de migração), MCP-4 (cadastro pela tela), MCP-5, TG-4, SIWC (CON-7), APP-5 e a
validação da CRW-2 com modelo real.

## Ordem sugerida dos primeiros PRs

| Ordem | PRs em paralelo (máx. 3 abertos) | Motivo                                       |
| ----- | -------------------------------- | -------------------------------------------- |
| 1     | CON-1, PRV-1, BOT-1              | Já pronto; dois ganhos pequenos sem conflito |
| 2     | CON-2, CON-3, TOL-1              | Conexões em duas frentes; base de permissão  |
| 3     | CON-4, CHT-1, CRW-1              | Fecha o Connect; robustez de envio e crew    |
| 4     | ROT-1, TOL-2, APP-1              | Abre o domínio de rotinas                    |

## Fora do roadmap

Navegador próprio, Computer Use, desktop remoto, servidores hospedados, membros e
papéis, agentes ACP, várias contas, atualização de CLIs, analytics, dock e
gerenciadores de senha. Motivo de cada um na [tabela da REA](../spikes/openbot-run/README.md).
