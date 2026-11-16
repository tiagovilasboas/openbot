# Especificação: features do MVP, responsabilidades e divisão BFF e front

Data: 2026-11-10. Base: o estado real do repositório na `main`, a auditoria funcional, o [REA do Grok Bot](https://github.com/tiagovilasboas/downshift-labs/tree/rea/grok-bot-desktop/reverse/grok-bot) e as specs já existentes nesta pasta.

O que vale aqui é a **divisão de responsabilidades** e a **ordem de entrega**. Nada abaixo é um compromisso de comportamento do Grok Bot: usamos o REA como referência de padrões, com desenho e código próprios.

## 1. Onde estamos

Já entregue e na `main`: chat com modelo, vários bots, bot principal que delega à equipe, skills por bot, fila de mensagens, failover, resumo de GitHub, bloqueio local, backup, template de bot em arquivo, cancelar com erros claros, guard de API, proteção contra SSRF, testes e2e, armazenamento local no servidor (SQLite) com cofre de chaves cifrado, compactação de conversas longas e o laço de ferramentas com aprovação (atrás de `OPENBOT_TOOLS`).

Ainda não provado: **uma resposta de modelo real** (item 4.5 do roadmap). Enquanto isso não existir, o produto não deve ser chamado de funcional.

## 2. Regra de divisão: BFF e front

O Open Bot é **local-first**: os dados ficam na máquina de quem roda o servidor. O BFF (as rotas `src/app/api` do Next) **guarda estado local** num banco SQLite (`src/shared/local-store`, arquivo `openbot.db` em `OPENBOT_DATA_DIR` ou, sem ela, em `~/.openbot`; pasta `0700`, arquivos `0600`). Cada domínio tem a sua tabela e as suas migrações: bots (`/api/bots`), conversas (`/api/conversations`), memória (`/api/memory`), uso (`/api/usage`), ajustes (`/api/settings`) e as chaves de provedor (`/api/keys`, cofre cifrado). O servidor é a fonte da verdade; o `localStorage` do navegador é só um **cache de leitura** que o front espelha a partir dele.

Quem chama a API: sem `OPENBOT_ACCESS_TOKEN`, só um chamador de loopback é atendido (outro recebe 403 `access_token_required`); com o token definido, todo chamador precisa enviá-lo como `Authorization: Bearer`. Os scripts `dev` e `start` escutam apenas em `127.0.0.1`.

| Responsabilidade                               | Fica no BFF                                                           | Fica no front                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Falar com o provedor de modelo                 | Sim: adaptador, timeout, failover, tradução de erro                   | Não                                                                   |
| Segredos do servidor (`.env`, token do GitHub) | Sim, nunca saem dele                                                  | Não                                                                   |
| Chaves de provedor que o usuário digita        | Cofre cifrado (AES-256-GCM) no banco; injeta a chave certa na chamada | Envia a chave uma vez para `/api/keys`; não a guarda (seção 6)        |
| Validar tamanho, formato, origem e taxa        | Sim (`proxy.ts`, `parse-chat-request`)                                | Não confia nele; valida o que lê de volta                             |
| Proteção contra SSRF e `baseUrl`               | Sim                                                                   | Não                                                                   |
| Marcar texto externo como dado nos prompts     | Sim, no montador do servidor                                          | Envia o texto cru e rotulado                                          |
| Conversas, bots, skills, memória, uso, ajustes | Sim: tabelas SQLite por domínio, fonte da verdade                     | Cache de leitura (`localStorage`) e edição; sincroniza com o servidor |
| Backup (exportar e importar)                   | Não                                                                   | Sim                                                                   |
| Orquestração da equipe (delegar, sintetizar)   | Não                                                                   | Sim (`run-crew-turn`), chamando o BFF uma vez por passo               |
| Fila de mensagens, cancelar, retentar          | Não                                                                   | Sim                                                                   |
| Contagem de uso (tokens)                       | Devolve o que o provedor informou e guarda o registro de uso          | Soma e mostra por bot                                                 |
| Streaming                                      | Transporta eventos tipados                                            | Renderiza aos poucos e guarda o que chegou                            |
| Bloqueio por senha local                       | Não                                                                   | Sim (PBKDF2 no navegador)                                             |
| Tarefas agendadas                              | Necessário, mas **fora do MVP**                                       | Só mostra e liga ou desliga                                           |

Contrato entre os dois: cada rota do BFF recebe JSON validado e responde com um tipo discriminado. Nenhuma regra de negócio de um lado repete a do outro: o front decide **o que perguntar e o que guardar**, o BFF decide **como e com que limites chamar de fora**.

## 3. Features do MVP

Pontos em Fibonacci. Cada linha é um PR de até 5 pontos.

| #   | Feature                                                                   | Valor para o usuário                                   | BFF                                                                                   | Front                                                                | Pontos |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -----: |
| F1  | **Rodada real com modelo** (4.5)                                          | Prova que o produto responde de verdade, em PT e EN    | Nenhuma mudança                                                                       | Registro da rodada em `docs/`                                        |      3 |
| F2  | **Streaming** (4.10), parte BFF                                           | A resposta aparece enquanto é gerada                   | Rota que repassa o fluxo do provedor como eventos tipados, com aborto e falha no meio | Nenhuma                                                              |      5 |
| F3  | **Streaming**, parte front                                                | Texto aparecendo, parcial mantido se falhar, "repetir" | Nenhuma                                                                               | Cliente do fluxo, render incremental, delegação por especialista     |      5 |
| F4  | **Modelo por bot**                                                        | Um bot de código num modelo e outro de texto noutro    | Lista permitida de ids e validação                                                    | Campo opcional no bot, seletor, template e backup                    |      3 |
| F5  | **Memória visível e apagável**                                            | O bot lembra do que importa, sob controle do usuário   | Aceita e delimita o bloco de memória como dado, com teto de tamanho                   | Lista local por bot, editar, apagar, desligar, entrar no backup      |      5 |
| F6  | **Sugerir skill a partir do histórico**                                   | Transformar o que se repete em skill                   | Uma rota de análise: um passo de modelo que devolve um rascunho                       | Botão por bot, rascunho para aceitar ou descartar                    |      3 |
| F7  | **Anexar arquivo como contexto**                                          | Perguntar sobre um arquivo                             | Teto de tamanho e delimitação como dado                                               | Ler texto no aparelho, truncar, mostrar o que foi enviado            |      5 |
| F8  | **Uso por bot**                                                           | Saber quanto cada bot consome                          | Devolve contagem de tokens quando o provedor informa                                  | Soma local e exibição                                                |      3 |
| F9  | **Sala visível da equipe**                                                | Ver quem fez o quê numa delegação                      | Nenhuma                                                                               | Visão dos passos de `run-crew-turn`                                  |      3 |
| F10 | **Reordenar e agrupar bots, mais formas de avatar, estado "trabalhando"** | Barra lateral que parece uma equipe viva               | Nenhuma                                                                               | Arrastar com teclado, seções, formas novas, indicador e badge do app |      5 |
| F11 | **Voltar a uma mensagem**                                                 | Refazer a partir de um ponto                           | Nenhuma                                                                               | Corta o histórico e reenvia                                          |      2 |

Ficam **fora do MVP**: rotinas agendadas (exigem agendador no servidor e notificações, já descritas em `spec-background-routines.md`), pedidos estruturados do bot ao usuário (só fazem sentido quando o bot puder agir), canais e integrações externas, execução local e controle de tela.

## 4. Ordem e paralelismo

| Onda | Itens                          | Podem rodar juntos?                                      | Depende de       |
| ---- | ------------------------------ | -------------------------------------------------------- | ---------------- |
| A    | F2 (BFF do streaming), F4, F10 | Sim: arquivos distintos (`api/`, `bots/`, barra lateral) | Nada             |
| B    | F3, F5, F11                    | F3 depende de F2. F5 e F11 são independentes             | F2               |
| C    | F6, F7, F8, F9                 | Sim, depois de F5 e F3                                   | F5 (F6), F3 (F9) |
| D    | F1                             | Quando houver uma chave de provedor do mantenedor        | Qualquer onda    |

Regras de entrega: no máximo três PRs abertos, cada um com testes e e2e do fluxo, tudo verde no pre-push, PT e EN em paridade, arquivos de até 300 linhas e nada que misture domínios.

## 5. Responsabilidades por módulo

Seguindo Screaming Architecture e a regra de dependência, cada feature tem um dono:

| Feature        | Pasta dona                                               | Contrato público                                                                  |
| -------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Streaming      | `features/model` (adaptador) e `features/chat` (cliente) | Eventos `start`, `delta`, `done` e `error` com código tipado                      |
| Modelo por bot | `features/bots` e `features/model`                       | `BotProfile.modelId` opcional, validado contra uma lista no servidor              |
| Memória        | `features/memory` (nova)                                 | `MemoryEntry`, `buildMemoryBlock` e `parseMemoryBlock`; o chat só consome o bloco |
| Sugerir skill  | `features/skills` e uma rota nova em `api/skills`        | Rascunho de skill sempre marcado como "sugerido"                                  |
| Anexo          | `features/attachments` (nova)                            | `readAttachment` devolve texto truncado e metadados                               |
| Uso            | `features/usage` (nova)                                  | `UsageRecord` por bot e por dia, só local                                         |
| Sala           | `features/crew`                                          | Eventos de passo já emitidos por `run-crew-turn`                                  |

## 6. Decisões a registrar

1. **Chaves de provedor digitadas pelo usuário** ficam no cofre do servidor (`src/features/key-vault`, #117 e #121): cifradas com AES-256-GCM, com o provedor e a origem ligados ao texto cifrado (uma linha movida para outro provedor ou origem não abre). A chave mestra vem de `OPENBOT_VAULT_KEY` (base64 de 32 bytes) ou, sem ela, do arquivo `vault.key` (`0600`) criado na pasta de dados. `/api/keys` lista só provedor, origem e data, nunca o valor, e uma chave só é usada na origem para a qual foi salva. Chaves que uma versão antiga deixou no navegador são movidas para o cofre e só saem do navegador depois que o servidor responde 200. O BFF não registra o corpo das requisições.
2. **Onde mora a memória**: por bot, global ou por espaço. Recomendado: por bot, com opção de promover para global depois.
3. **Armazenamento**: o servidor guarda tudo em SQLite (seção 2). O `localStorage` do navegador é cache; a decisão sobre IndexedDB para anexos grandes (F7) continua em aberto.
4. **Texto vindo de arquivo, de memória ou de skill importada** é sempre dado, nunca instrução. Todo montador de prompt usa o delimitador já existente.

## 7. O que não é verificado ainda

- O comportamento de streaming depende de cada provedor expor fluxo; é preciso confirmar com o provedor real antes de F3.
- A divisão acima descreve o código de hoje, lido na `main`. Mudanças em curso podem exigir ajuste.
- As seções 3 a 5 (features F1 a F11 e a ordem das ondas) foram escritas antes do armazenamento no servidor e não foram revisadas aqui; o que está entregue consta no [roadmap](../roadmap/roadmap.pt-BR.md).
