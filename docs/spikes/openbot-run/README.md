# REA openbot.run: casos de uso e comparação com o Open Bot

Fonte: `nightly-labs/openbot`, commit `a9b40aa` (16/11/2026), lido em modo
somente leitura. Os documentos resumem comportamento; não copiam código, arte
nem textos do produto.

| Documento                                                      | Domínio                                   | Casos                          |
| -------------------------------------------------------------- | ----------------------------------------- | ------------------------------ |
| [agents-conversation.md](agents-conversation.md)               | Agentes, conversa, threads, templates     | AG-01 a AG-24                  |
| [providers-account-settings.md](providers-account-settings.md) | Provedores, conta, cofre, configurações   | PR-01 a PR-19                  |
| [automation-team-remote.md](automation-team-remote.md)         | Canais, rotinas, webhooks, equipe, remoto | AU-01 a AU-11                  |
| [tools-workspace.md](tools-workspace.md)                       | Navegador, arquivos, sandbox, MCP, voz    | TL-01 a TL-14                  |
| [../openbot-run-connect-rea.md](../openbot-run-connect-rea.md) | Fluxo Connect em profundidade             | detalhe de PR-03, PR-10, PR-11 |

O roadmap que sai daqui está em
[docs/roadmap/openbot-run-parity.md](../../roadmap/openbot-run-parity.md).

## Legenda

| Status      | Significado                                                             |
| ----------- | ----------------------------------------------------------------------- |
| **Tem**     | O Open Bot já cobre o caso, com teste                                   |
| **Parcial** | Existe a base; falta uma parte do fluxo                                 |
| **Trazer**  | Cabe no PWA como está desenhado lá                                      |
| **Adaptar** | O valor cabe, mas a mecânica muda (PWA, servidor local, sem CLI)        |
| **Depois**  | Cabe, mas depende de outra fundação ainda não pronta                    |
| **Fora**    | Exige app desktop, servidor hospedado, multiusuário ou CLI de terceiros |

## Agentes e conversa (AG)

| ID    | Caso                               | Status  | No Open Bot hoje / o que falta                                            |
| ----- | ---------------------------------- | ------- | ------------------------------------------------------------------------- |
| AG-01 | Criar agente                       | Tem     | `bots/` com editor, avatar e arquétipos                                   |
| AG-02 | Boas-vindas do novo agente         | Parcial | Estado vazio do chat; falta sugerir 3 primeiras tarefas pelo perfil       |
| AG-03 | Criar/editar agente por conversa   | Trazer  | Ferramenta `create_bot`/`update_bot` no tool loop, com aprovação          |
| AG-04 | Excluir com desfazer               | Parcial | `BotDeleteControl` apaga na hora; falta janela de desfazer                |
| AG-05 | Ocultar/restaurar agente           | Trazer  | Grupo "ocultos" na barra lateral                                          |
| AG-06 | Enviar mensagem idempotente        | Parcial | Envio existe; falta `clientMessageId` para reenvio sem duplicar           |
| AG-07 | Mensagem com agente ocupado        | Parcial | Fila FIFO existe; falta o modo "corrigir o rumo" (steer)                  |
| AG-08 | Threads laterais                   | Parcial | `conversations/` tem várias conversas; falta thread filha de uma conversa |
| AG-09 | Ramificar conversa                 | Trazer  | `RollbackControl` volta; falta copiar até um turno para conversa nova     |
| AG-10 | Painel de tarefas                  | Depois  | Depende de AG-08                                                          |
| AG-11 | Pergunta ao usuário / blocos de UI | Trazer  | Ferramenta `ask_user` com cartão de opções                                |
| AG-12 | Aprovação de ação                  | Tem     | Aprovação no tool loop (`OPENBOT_TOOLS`)                                  |
| AG-13 | Pergunta lateral                   | Trazer  | Painel que usa o contexto recente sem gravar no histórico                 |
| AG-14 | Delegação entre agentes            | Tem     | `crew/` com chefe e delegações                                            |
| AG-15 | Rotina silenciosa                  | Depois  | Depende de rotinas (AU-03)                                                |
| AG-16 | Rotina em thread própria           | Depois  | Depende de AU-03 e AG-08                                                  |
| AG-17 | Esperas (waits)                    | Depois  | Depende de rotinas e eventos                                              |
| AG-18 | Publicar template                  | Parcial | `bot-sharing/` exporta arquivo; falta card de preview                     |
| AG-19 | Instalar template                  | Parcial | Importa arquivo; falta link de instalação com preview                     |
| AG-20 | Agente ACP próprio                 | Fora    | Exige processo local por stdio                                            |
| AG-21 | API local para scripts             | Adaptar | Rota local com token próprio, só loopback                                 |
| AG-22 | Dock de agentes                    | Fora    | Janela de desktop                                                         |
| AG-23 | Contexto, memória, skills auto     | Tem     | Compactação, `memory/`, sugestão de skill                                 |
| AG-24 | Limite de uso e modelo de backup   | Parcial | Failover 2.7 e `usage/`; falta backup por bot e espera do reset           |

## Provedores, conta e configurações (PR)

| ID    | Caso                             | Status  | No Open Bot hoje / o que falta                                   |
| ----- | -------------------------------- | ------- | ---------------------------------------------------------------- |
| PR-01 | Onboarding                       | Adaptar | Falta o passo "escolha um provedor ou comece grátis"             |
| PR-02 | Consentimento de analytics       | Fora    | Não coletamos analytics                                          |
| PR-03 | Conectar com chave               | Tem     | Cofre AES-256-GCM; OAuth do OpenRouter em andamento              |
| PR-04 | Provedor OpenAI-compatível       | Parcial | Endpoint local existe; falta cadastrar endpoint próprio com nome |
| PR-05 | Detecção de servidor local       | Trazer  | Varredura de Ollama e LM Studio, erro só com host                |
| PR-06 | Agentes ACP                      | Fora    | Igual a AG-20                                                    |
| PR-07 | Ligar/desligar provedores        | Parcial | Router por env; falta liga/desliga na tela                       |
| PR-08 | Seletor e modelos de backup      | Parcial | Seletor por bot; falta lista de backup                           |
| PR-09 | Uso e limites                    | Parcial | `usage/` por bot; falta limite e aviso de reset                  |
| PR-10 | Várias contas                    | Fora    | Uma conta por provedor                                           |
| PR-11 | Desconectar                      | Trazer  | Conexões PR 4                                                    |
| PR-12 | Atualizar CLIs                   | Fora    | Não usamos CLI                                                   |
| PR-13 | Atualizar o app                  | Trazer  | Aviso "nova versão" do service worker                            |
| PR-14 | Conta OpenBot                    | Fora    | Temos PIN local                                                  |
| PR-15 | Cofre                            | Tem     | `key-vault/`; chave-mestra no Keychain fica para depois          |
| PR-16 | Gerenciador de senhas            | Fora    | Integração nativa                                                |
| PR-17 | Conectores de mensagens e GitHub | Parcial | GitHub por token; mensagens ficam em AU-10                       |
| PR-18 | MCP e OAuth do MCP               | Depois  | Depende do tool loop estável                                     |
| PR-19 | Configurações gerais             | Tem     | `settings/`                                                      |

## Automação, equipe e remoto (AU)

| ID    | Caso                           | Status  | No Open Bot hoje / o que falta                         |
| ----- | ------------------------------ | ------- | ------------------------------------------------------ |
| AU-01 | Canais compartilhados          | Adaptar | Sala do crew vira canal com vários bots                |
| AU-02 | Multiagente com guarda de loop | Parcial | Crew delega; falta teto de rodadas e detector de eco   |
| AU-03 | Rotinas e agenda               | Trazer  | Agenda local no servidor Next, com execução silenciosa |
| AU-04 | Rotinas encadeadas             | Depois  | Depende de AU-03                                       |
| AU-05 | Webhooks e automação loopback  | Adaptar | Rota local com token; sem relay público                |
| AU-06 | Membros e papéis               | Fora    | Produto de uso pessoal                                 |
| AU-07 | Servidores hospedados          | Fora    | Sem hospedagem                                         |
| AU-08 | Cliente web                    | Tem     | O Open Bot já é web                                    |
| AU-09 | App de celular                 | Parcial | PWA instalável; falta revisar fluxo móvel              |
| AU-10 | Apps de mensagens              | Depois  | Telegram é o candidato, depois de AU-05                |
| AU-11 | Desktop remoto                 | Fora    | Fora do escopo                                         |

## Ferramentas e ambiente (TL)

| ID    | Caso                       | Status  | No Open Bot hoje / o que falta                                    |
| ----- | -------------------------- | ------- | ----------------------------------------------------------------- |
| TL-01 | Navegador embutido         | Adaptar | Só leitura de página pelo servidor, com `server-guard`            |
| TL-02 | Perfis e proxies           | Fora    | Depende de navegador próprio                                      |
| TL-03 | Takeover do navegador      | Fora    | Idem                                                              |
| TL-04 | Segredos no navegador      | Fora    | Idem                                                              |
| TL-05 | Visão remota do navegador  | Fora    | Idem                                                              |
| TL-06 | Computer Use               | Fora    | Controle de desktop                                               |
| TL-07 | Desktop remoto             | Fora    | Igual a AU-11                                                     |
| TL-08 | Workspaces e arquivos      | Adaptar | `attachments/` lê arquivos; falta pasta de trabalho por bot       |
| TL-09 | Biblioteca de arquivos     | Depois  | Depende de TL-08                                                  |
| TL-10 | Sandbox e acesso total     | Adaptar | Níveis de permissão por ferramenta: perguntar, permitir, bloquear |
| TL-11 | MCP como ferramenta        | Depois  | Igual a PR-18                                                     |
| TL-12 | Voz                        | Adaptar | Ditado e leitura com Web Speech API                               |
| TL-13 | Janela e navegação lateral | Parcial | Barra lateral existe; faltam fixar e pastas                       |
| TL-14 | Internacionalização        | Tem     | pt, en, es                                                        |

## Placar

| Status  |  AG |  PR |  AU |  TL | Total |
| ------- | --: | --: | --: | --: | ----: |
| Tem     |   4 |   3 |   1 |   1 |     9 |
| Parcial |   8 |   5 |   2 |   1 |    16 |
| Trazer  |   5 |   3 |   1 |   0 |     9 |
| Adaptar |   1 |   1 |   2 |   4 |     8 |
| Depois  |   4 |   1 |   2 |   2 |     9 |
| Fora    |   2 |   6 |   3 |   6 |    17 |
| Total   |  24 |  19 |  11 |  14 |    68 |
