# Roadmap: paridade com o openbot.run, por domínio

Base: [REA dos 68 casos de uso](../spikes/openbot-run/README.md). Aqui entram só
os casos **Parcial**, **Trazer**, **Adaptar** e **Depois**. Os 17 casos **Fora**
e os 9 que já temos não geram task.

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

| Task  | Entrega                                                            | Casos        | Pts | Depende de                |
| ----- | ------------------------------------------------------------------ | ------------ | --: | ------------------------- |
| CON-1 | `core/`: tipos, rota do Connect, máquina de estados, regra ESLint  | PR-03        |   3 | feito, PR aberto pendente |
| CON-2 | Mover chave e tela atual para `api-key/`, `credentials/`, `panel/` | PR-03        |   5 | CON-1                     |
| CON-3 | OAuth PKCE do OpenRouter e `server/` (início, callback, troca)     | PR-03        |   5 | CON-1                     |
| CON-4 | Botão Conectar, diálogo de estados e Desconectar                   | PR-03, PR-11 |   3 | CON-2, CON-3              |
| CON-5 | Script de teste real lê o cofre                                    | PR-03        |   3 | CON-3                     |
| CON-6 | Spike `cli-login/` (Codex, OpenCode) com análise de termos         | PR-10        |   3 | CON-1                     |

Paralelo: CON-2 e CON-3; CON-5 e CON-6 depois de CON-3.

## 2. Provedores e modelos (`model/`, `usage/`)

| Task  | Entrega                                                               | Casos        | Pts | Depende de |
| ----- | --------------------------------------------------------------------- | ------------ | --: | ---------- |
| PRV-1 | Varredura local de Ollama e LM Studio, erro só com host, corpo ≤ 1 MB | PR-05        |   3 | —          |
| PRV-2 | Endpoint OpenAI-compatível próprio com nome, guardado como conexão    | PR-04        |   3 | CON-2      |
| PRV-3 | Liga/desliga de provedor na tela, sem apagar a chave                  | PR-07        |   2 | CON-4      |
| PRV-4 | Lista de modelos de backup por bot, usada pelo failover               | PR-08, AG-24 |   3 | —          |
| PRV-5 | Espera do reset de limite com aviso, antes do backup                  | PR-09, AG-24 |   3 | PRV-4      |

Paralelo: PRV-1 e PRV-4 desde já, sem tocar em `connections/`.

## 3. Conversa (`chat/`, `conversations/`)

| Task  | Entrega                                                          | Casos | Pts | Depende de |
| ----- | ---------------------------------------------------------------- | ----- | --: | ---------- |
| CHT-1 | `clientMessageId` no envio: reenvio não duplica                  | AG-06 |   3 | —          |
| CHT-2 | Modo "corrigir o rumo": mensagem entra no próximo passo do turno | AG-07 |   5 | CHT-1      |
| CHT-3 | Ramificar: copia até um turno concluído para conversa nova       | AG-09 |   3 | —          |
| CHT-4 | Pergunta lateral: contexto recente, nada gravado no histórico    | AG-13 |   3 | —          |
| CHT-5 | Thread filha de uma conversa (modelo de dados e lista)           | AG-08 |   5 | —          |
| CHT-6 | Painel de tarefas com as threads de todos os bots                | AG-10 |   3 | CHT-5      |

Paralelo: CHT-1, CHT-3, CHT-4 e CHT-5 não compartilham arquivos de domínio;
coordenar só `ChatExperience.tsx`.

## 4. Agentes (`bots/`, `bot-sharing/`)

| Task  | Entrega                                                          | Casos        | Pts | Depende de |
| ----- | ---------------------------------------------------------------- | ------------ | --: | ---------- |
| BOT-1 | Excluir com desfazer: some da lista, apaga depois de 8 s         | AG-04        |   2 | —          |
| BOT-2 | Ocultar e restaurar, com grupo recolhido na barra lateral        | AG-05        |   2 | —          |
| BOT-3 | Boas-vindas: 3 primeiras tarefas sugeridas pelo perfil           | AG-02        |   2 | —          |
| BOT-4 | Card de preview do template e link de instalação com confirmação | AG-18, AG-19 |   5 | —          |
| BOT-5 | Ferramentas `create_bot` e `update_bot`, sempre com aprovação    | AG-03        |   3 | TOL-1      |

## 5. Ferramentas (`tools/`, `attachments/`)

| Task  | Entrega                                                          | Casos        | Pts | Depende de |
| ----- | ---------------------------------------------------------------- | ------------ | --: | ---------- |
| TOL-1 | Nível por ferramenta: perguntar, permitir, bloquear              | TL-10        |   3 | —          |
| TOL-2 | Ferramenta `ask_user` com cartão de opções                       | AG-11        |   3 | —          |
| TOL-3 | `read_page`: leitura de página pelo servidor, com `server-guard` | TL-01        |   5 | TOL-1      |
| TOL-4 | Pasta de trabalho por bot, só leitura no início                  | TL-08        |   5 | TOL-1      |
| TOL-5 | Spike de MCP como ferramenta (transporte, OAuth, permissão)      | PR-18, TL-11 |   3 | TOL-1      |
| TOL-6 | Biblioteca de arquivos gerados                                   | TL-09        |   2 | TOL-4      |

## 6. Rotinas e automação (novo domínio `routines/`)

| Task  | Entrega                                                       | Casos        | Pts | Depende de   |
| ----- | ------------------------------------------------------------- | ------------ | --: | ------------ |
| ROT-1 | Domínio puro: agenda, próxima execução, estados, regra ESLint | AU-03        |   3 | —            |
| ROT-2 | Agendador no servidor local, persistido no SQLite             | AU-03        |   5 | ROT-1        |
| ROT-3 | Tela de rotinas e execução silenciosa ("sem novidade")        | AU-03, AG-15 |   5 | ROT-2        |
| ROT-4 | Rotina com thread própria                                     | AG-16        |   2 | ROT-3, CHT-5 |
| ROT-5 | Rota local de automação com token, só loopback                | AU-05, AG-21 |   5 | ROT-2        |
| ROT-6 | Esperas: bot pausa até rotina ou evento acordar               | AG-17        |   3 | ROT-5        |
| ROT-7 | Rotinas encadeadas                                            | AU-04        |   3 | ROT-3        |
| ROT-8 | Spike de Telegram sobre a rota de automação                   | AU-10        |   3 | ROT-5        |

## 7. Equipe (`crew/`)

| Task  | Entrega                                                         | Casos | Pts | Depende de |
| ----- | --------------------------------------------------------------- | ----- | --: | ---------- |
| CRW-1 | Guarda de loop: teto de rodadas e detector de eco               | AU-02 |   3 | —          |
| CRW-2 | Sala do crew como canal com vários bots e roteamento pelo chefe | AU-01 |   5 | CRW-1      |

## 8. App e plataforma (`pwa/`, `settings/`, shell)

| Task  | Entrega                                          | Casos | Pts | Depende de |
| ----- | ------------------------------------------------ | ----- | --: | ---------- |
| APP-1 | Aviso de nova versão do service worker           | PR-13 |   2 | —          |
| APP-2 | Onboarding: provedor conectado ou começar grátis | PR-01 |   3 | CON-4      |
| APP-3 | Fixar conversas e pastas na barra lateral        | TL-13 |   3 | —          |
| APP-4 | Ditado e leitura em voz alta com Web Speech API  | TL-12 |   3 | —          |
| APP-5 | Revisão do fluxo móvel instalado                 | AU-09 |   3 | —          |

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
