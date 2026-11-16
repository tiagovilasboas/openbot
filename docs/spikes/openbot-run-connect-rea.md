# REA: como o openbot.run conecta provedores

Fonte: `nightly-labs/openbot`, commit `a9b40aa` (16/11/2026), lido em modo somente leitura.
Este documento resume o comportamento; não copia código nem textos.

## 1. Conclusão curta

- O botão **Connect** do openbot.run roda o **login do próprio CLI** do provedor
  (Codex CLI, Claude Code, Grok CLI...). Os tokens ficam com o CLI; o app só
  inicia o login e confere o status depois.
- Para provedores de **chave de API** (OpenRouter, DeepSeek, Inception) não há
  Connect: o usuário cola a chave uma vez e o app guarda cifrada com o
  `safeStorage` do Electron (chave-mestra no Keychain do macOS).
- O Open Bot é um PWA que chama APIs HTTP, não CLIs. Por isso trazemos o
  **desenho** dos fluxos, não a mecânica de CLI.

## 2. Inventário: os 18 provedores e como entram

| Provedor           | Roda via           | Connect (neste computador)                          | Alternativa por código               | Termina em |
| ------------------ | ------------------ | --------------------------------------------------- | ------------------------------------ | ---------- |
| ChatGPT            | Codex CLI          | Login no navegador (protocolo do CLI devolve a URL) | Device code                          | callback   |
| Claude             | Claude Code        | `claude auth login --claudeai`                      | Código colado de volta               | callback   |
| Grok               | Grok CLI           | Comando de login do CLI                             | Device code                          | callback   |
| Cursor             | Cursor CLI         | ACP `authenticate` (`cursor_login`)                 | Device code; contas extras por chave | callback   |
| Cline              | Cline CLI          | Comando de login do CLI                             | Device code                          | callback   |
| Kimi               | Kimi Code CLI      | Comando de login do CLI                             | Device code                          | página     |
| Devin              | Devin CLI          | ACP `authenticate` (`devin-browser`)                | —                                    | callback   |
| GitHub Copilot     | Copilot CLI        | Comando de login do CLI                             | Device code                          | callback   |
| Mistral            | Mistral Vibe       | Comando de login do CLI                             | Device code                          | página     |
| Gemini             | Antigravity CLI    | Login do CLI                                        | —                                    | callback   |
| Hermes             | Hermes Agent       | Login do CLI                                        | Device code                          | página     |
| Muse               | Muse CLI           | Device code do `muse serve`, abre a página          | Device code                          | página     |
| Pi                 | Pi CLI             | Terminal interativo; atualiza a conta ao fechar     | —                                    | callback   |
| OpenCode           | OpenCode CLI       | `external`: usuário entra no CLI; app só reconfere  | —                                    | callback   |
| OpenRouter         | Pi CLI             | `external`: **cola a chave de API**                 | —                                    | —          |
| DeepSeek           | Pi CLI             | `external`: cola a chave de API                     | —                                    | —          |
| Inception          | Pi CLI             | `external`: cola a chave de API                     | —                                    | —          |
| Agente ACP próprio | comando do usuário | `external`                                          | —                                    | —          |

Tipos de login no backend (união fechada, um caso por forma de entrar):
`browser`, `cli-command`, `external`, `terminal`, `muse-device`,
`acp-authenticate`. Logout é por comando do CLI (`logout`) quando existe.

## 3. Os fluxos de interface

### 3.1 Decisão da rota (uma função só)

Toda tela (onboarding, Configurações, composer, seletor de modelo, cliente web)
pergunta à mesma função o que o Connect faz e o que o menu `⋯` oferece:

| Rota        | Quando                                                               |
| ----------- | -------------------------------------------------------------------- |
| `browser`   | App no próprio computador                                            |
| `code`      | Servidor remoto, ou alternativa local (device code ou código colado) |
| `relay`     | App ligado a um servidor: página abre aqui, callback vai ao host     |
| `host-page` | Login roda no navegador do host e aparece por live view              |
| `use-app`   | Aba de navegador que não recebe callback: só o app desktop termina   |

A função lê só o descritor do provedor e as capacidades do lugar; um provedor
novo não muda a função.

### 3.2 Diálogo de login por código (máquina de estados)

`starting` → `waiting` (device code com URL e validade) | `paste` (colar código)
| `link` | `page` | `relay` → `verifying` → fim: `connected` (com rótulo da
conta), `expired` ou `failed` (com mensagem). O fim fecha o diálogo e vira
notificação. O código é um identificador de uso único; o token obtido nunca
chega à interface.

### 3.3 Diálogo de chave

Lê o estado da chave salva, salva, remove, abre a página do provedor para criar
a chave, e tem "tentar de novo" sem mexer na credencial. A chave vai para o host
quando o app está ligado a um servidor.

### 3.4 Onboarding

Passo de escolha de provedor com linhas: planos assinados, provedor grátis,
provedores de chave, endpoint próprio (OpenAI-compatível) e servidores locais
encontrados por varredura. Só avança com provedor conectado, ou com um grátis.

### 3.5 Servidor local

Uma requisição `GET {baseUrl}/models` feita no processo principal. Corpo
limitado a 1 MB; mensagens de erro citam só o host, nunca caminho, query ou
cabeçalhos, que podem ter token.

### 3.6 Proteção da chave em processos filhos

A chave entra por variável de ambiente e é apagada antes de qualquer ferramenta
criar processo filho. Nunca é gravada no arquivo de extensão.

## 4. O que trazemos, o que adaptamos, o que fica de fora

| Fluxo deles                                                        | Decisão      | No Open Bot                                                                                |
| ------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------ |
| Cola a chave uma vez (OpenRouter, DeepSeek)                        | **Já temos** | Configurações → Conexões, cofre AES-256-GCM                                                |
| Diálogo de chave: testar, remover, tentar de novo, link para criar | **Alinhar**  | `connections/` já testa e descreve falhas; falta o link "criar chave" e o "tentar de novo" |
| Uma função decide a rota do Connect                                | **Trazer**   | `connect-route.ts` por provedor: `oauth`, `key`, `local`                                   |
| Máquina de estados do login com fim em notificação                 | **Trazer**   | Estados `starting`, `waiting`, `verifying`, `connected`, `expired`, `failed`               |
| Token nunca chega à interface                                      | **Trazer**   | Troca do código e gravação no servidor; a UI só vê "conectado"                             |
| Connect de um clique para OpenRouter                               | **Ir além**  | OAuth PKCE do OpenRouter, que eles não usam                                                |
| Chave-mestra no Keychain                                           | **Depois**   | Exige módulo nativo ou `security` do macOS; hoje `vault.key` 0600                          |
| Varredura de servidor local com erro sem segredo                   | **Conferir** | Comparar com `local-adapter.ts` e o guard de rede                                          |
| Logout                                                             | **Trazer**   | "Desconectar" apaga a chave do cofre                                                       |
| Login de assinatura via CLI (ChatGPT, Claude, Grok...)             | **Fora**     | Outra arquitetura; a Anthropic restringe o OAuth do Claude a apps nativos dela             |
| `relay`, `host-page`, `use-app`, várias contas                     | **Fora**     | Não temos servidor remoto nem multi-conta                                                  |

## 5. Arquitetura: camada de conexões isolada

Antes do CON-2, `src/features/connections/` era só a tela e importava direto de
`model/`, `key-vault/` e `github/`. Desde o CON-2 a tela está em `panel/`, o
fluxo de chave em `api-key/` e o resto do app entra só por `index.ts`. As
pendências dessa fronteira estão no [mapa de módulos](../architecture/module-reuse-map.md).

```
src/features/connections/
├── core/          ← domínio puro: tipos, rota do Connect, máquina de estados, portas
├── api-key/       ← fluxo "cola a chave": testar, salvar, remover
├── oauth/         ← fluxo OAuth PKCE (OpenRouter primeiro)
├── cli-login/     ← futuro: login via CLI oficial (Codex, OpenCode)
├── credentials/   ← único adaptador que fala com o key-vault
├── server/        ← handlers HTTP e raiz de composição
├── panel/         ← UI: lista, detalhe, botão Conectar, diálogo de estados
└── index.ts       ← contrato público para o resto do app
```

Cada pasta grita **como** a conexão acontece, não a tecnologia.

| Pasta          | Responsabilidade única                                                              | Pode importar                        |
| -------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| `core/`        | Regras: qual método cada provedor usa, estados e transições, portas                 | nada fora de `core/`                 |
| `api-key/`     | Caso de uso de chave colada                                                         | `core/`                              |
| `oauth/`       | PKCE, URL de autorização, troca do código, estado pendente                          | `core/`                              |
| `cli-login/`   | Rodar o login do CLI e ler o status                                                 | `core/`                              |
| `credentials/` | Implementa a porta `CredentialStore` sobre o key-vault                              | `core/`, API pública do `key-vault/` |
| `server/`      | Liga handlers às portas; rotas em `src/app/api/connections/` com menos de 30 linhas | todas acima                          |
| `panel/`       | Telas; consome só `core/` e o cliente HTTP da feature                               | `core/`, `shared/ui`                 |

Regras:

- **Dependency Rule:** `core/` não importa React, Next, `node:*`, key-vault nem
  `model/`. Fluxos dependem de portas (`CredentialStore`, `PendingAuthStore`,
  `HttpClient`, `Clock`), nunca de implementação.
- **Dono da cifra continua sendo o `key-vault/`.** Conexões guardam credencial só
  pela porta; `model/` continua lendo a chave pelo `KeyLookup` que já existe. Nenhuma
  feature de fora importa `connections/` internos, só `index.ts`.
- **Token nunca chega à UI:** o `panel/` só vê `{ provider, state, accountLabel }`.
- **Sensor computacional:** regra `no-restricted-imports` no ESLint para `core/` e
  para imports de fora em internos de `connections/`. O `npm run lint` passa a
  barrar violação.
- **Limites:** arquivos com menos de 300 linhas e menos de 10 funções.

## 6. Ordem de entrega proposta

| PR  | Conteúdo                                                                                                  | Pontos | Depende de       |
| --- | --------------------------------------------------------------------------------------------------------- | ------ | ---------------- |
| 1   | `core/`: tipos, rota do Connect, máquina de estados, portas, testes e regra de import no ESLint           | 3      | —                |
| 2   | Mover o fluxo de chave e a tela atual para `api-key/`, `credentials/` e `panel/`, sem mudar comportamento | 5      | 1                |
| 3   | `oauth/` do OpenRouter e `server/` (início, callback, troca, cofre) com testes                            | 5      | 1 (paralelo a 2) |
| 4   | Botão Conectar, diálogo de estados e Desconectar no `panel/`                                              | 3      | 2 e 3            |
| 5   | Script de teste real lê o cofre; prompt só como reserva                                                   | 3      | 3                |
| 6   | Spike `cli-login/` com Codex CLI e OpenCode CLI, incluindo termos de uso                                  | 3      | 1                |
