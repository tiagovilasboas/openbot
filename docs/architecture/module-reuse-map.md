# Mapa de módulos: o que isolar e o que reaproveitar

Guia para as tasks do [roadmap de paridade](../roadmap/openbot-run-parity.md).
Antes de criar um arquivo, procure aqui o módulo que já faz aquilo. Regra geral:
o domínio dono da lógica expõe um contrato público; os outros consomem esse
contrato e nunca os internos.

## 1. Fundações compartilhadas (`src/shared/`)

| Módulo                | O que faz                                               | Use em                              |
| --------------------- | ------------------------------------------------------- | ----------------------------------- |
| `shared/local-store/` | Abre o `openbot.db` (SQLite), pasta de dados, migrações | todo repositório de servidor novo   |
| `shared/storage/`     | Sufixos de chave do armazenamento do navegador          | dados do lado do cliente            |
| `shared/testing/`     | Pasta de dados temporária, fixtures de stream           | todo teste que toca disco ou modelo |
| `shared/ui/`          | `FormField`, `SecretInput`, `ResponsiveSheet`           | formulários e painéis               |

Nada de regra de negócio entra em `shared/`. Só sobe para lá o que tem dois
consumidores reais em domínios diferentes.

## 2. Lógica que já existe e deve ser reaproveitada

| Lógica                                                       | Dono                                                                        | Tasks que reaproveitam               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------ |
| Guardas de rota: origem, token, loopback, corpo, rate limit  | `server-guard/`                                                             | CON-3, ROT-5, PRV-1, TOL-3           |
| Fetch protegido: faixas reservadas, conexão fixada, base URL | `model/guarded-model-fetch.ts`, `ip-address-policy.ts`, `base-url-guard.ts` | PRV-1, PRV-2, TOL-3                  |
| Classificar falha do modelo                                  | `model/classify-model-failure.ts`                                           | PRV-4, PRV-5, CON-3 (mensagens)      |
| Troca de provedor                                            | `model/failover-runner.ts`                                                  | PRV-4, PRV-5                         |
| Cofre de chaves                                              | `key-vault/` (só pela API pública)                                          | CON-3 via `connections/credentials/` |
| Permissões por ferramenta e auditoria                        | `tools/server/grants-repository.ts`, `audit-repository.ts`                  | TOL-1, BOT-5, TOL-3, TOL-4           |
| Turno pausado para aprovação                                 | `tools/server/pending-turns-repository.ts`, `resume-turn.ts`                | TOL-2 (`ask_user`), ROT-6 (esperas)  |
| Fila de envio do composer                                    | `chat/message-queue.ts`                                                     | CHT-1, CHT-2                         |
| Volta no histórico                                           | `chat/RollbackControl.tsx`                                                  | CHT-3 (ramificar)                    |
| Repositório de conversas                                     | `conversations/server/`                                                     | CHT-3, CHT-5, ROT-4                  |
| Delegação e sala do crew                                     | `crew/run-crew-turn.ts`, `parse-delegations.ts`                             | CRW-1, CRW-2                         |
| Sanitização e storage do bot                                 | `bots/bot-sanitize.ts`, `bot-storage.ts`                                    | BOT-2, PRV-4, BOT-5                  |
| Export e import de template                                  | `bot-sharing/`                                                              | BOT-4                                |
| Texto não confiável vindo de fora                            | `untrusted-text/`                                                           | TOL-3, ROT-5, ROT-8                  |

## 3. Padrões que se repetem

**Servidor por domínio.** `bots/`, `memory/`, `usage/`, `conversations/`,
`settings/` seguem o mesmo trio `*-schema.ts`, `*-repository.ts`,
`*-handler.ts`, com rota fina em `src/app/api/`. Rotinas (ROT-2) e conexões
(CON-3) seguem o mesmo trio; não inventam outro formato.

**Sincronização navegador ↔ servidor.** `memory/sync`, `usage/sync` e
`conversations/sync` têm três cópias da mesma forma: fila de PUT, carga inicial
e falha descrita. Não extrair agora. Se rotinas (ROT-3) precisar de uma quarta
cópia, extraia antes um `shared/sync/` genérico em PR próprio, com os três
consumidores atuais migrados e testados.

**Textos.** Cada domínio tem seu dicionário `*-copy.ts` com pt, en e es. O
teste `language/copy-parity.test.ts` cobra a paridade. Arquivo de textos acima
de 300 linhas se divide por fluxo (exemplo: `bot-starters-copy.ts`).

## 4. Fronteiras por domínio

| Domínio        | Núcleo puro                          | Regra de import no ESLint                                      | Situação                               |
| -------------- | ------------------------------------ | -------------------------------------------------------------- | -------------------------------------- |
| `connections/` | `core/`                              | sim, `core/`, `api-key/`, `panel/` e externo só via `index.ts` | feito (CON-1, CON-2)                   |
| `routines/`    | `core/` (agenda, estados)            | criar em ROT-1                                                 | novo, nasce isolado                    |
| `tools/`       | `tool-policy.ts`, `validate-args.ts` | criar em TOL-1                                                 | `client/` e `server/` já separados     |
| `model/`       | adapters e failover                  | não                                                            | mistura UI de configurações e servidor |
| `bots/`        | `bot-*.ts` puros                     | não                                                            | puros já separados das telas           |
| `chat/`        | `message-queue.ts` e afins           | não                                                            | maior feature, a mais acoplada         |

Pendências conhecidas da fronteira de `connections/`:

- `panel/` ainda importa `chat`, `model`, `github` e `key-vault` direto. Sai
  quando o painel usar só o cliente HTTP da feature (CON-4).
- `api-key/manage-connection.ts` ainda chama o cofre direto. Passa a usar
  `credentials/` quando CON-3 entrar.

## 5. Onde duas tasks tocam o mesmo arquivo

| Arquivo                                | Tasks               | Como evitar conflito                                   |
| -------------------------------------- | ------------------- | ------------------------------------------------------ |
| `bots/bot-types.ts`, `bot-sanitize.ts` | BOT-2, PRV-4        | Cada campo opcional e independente; merge em sequência |
| `chat/ChatExperience.tsx`              | BOT-1/2/3, CHT-*    | Uma frente de conversa por vez                         |
| `eslint.config.mjs`                    | CON-*, ROT-1, TOL-1 | Um bloco por domínio, nunca editar o de outro          |
| `model/SettingsModal.tsx`              | CON-4, PRV-1, PRV-3 | CON-4 primeiro; PRV encaixa abas depois                |
