# Open Bot: comparação e roadmap de oportunidades

Data: 20/11/2026. Base: código do `main` (b4ac0ab), site openbot.run, docs públicas do Grok Bot (xAI).

**Legenda:** ✅ tem · parcial · ❌ não tem · ? não consegui verificar

**Sobre as fontes:**

- **Open Bot:** lido no código. "(doc)" quer dizer que veio só do README ou do roadmap.
- **openbot.run:** site oficial. "(REA)" quer dizer que veio da leitura do código deles, feita antes e guardada em `docs/spikes/openbot-run/`.
- **Grok Bot:** produto da xAI lançado em 11/08/2026, em beta, também ligado ao Cursor. Fontes: docs.x.ai e x.ai/news. O spike `grok-bot-ux-spike.md` do repo é só contexto interno e não entrou na coluna.

---

## 1. Resposta direta: o Open Bot tem sala de reunião?

**Tem a base, mas ainda não é uma reunião de verdade.** Existem duas coisas diferentes.

**A. "Sala da equipe" no chat** (`crew/CrewRoomControl.tsx`)

- Quando o agente principal delega, aparece um botão "Sala da equipe" embaixo da resposta.
- O botão abre um painel só de leitura com o que o chefe disse, os passos de cada especialista (tarefa, status e tempo) e a resposta final.
- É um registro de um turno, não uma conversa.

**B. "Canais da equipe"** (`crew/channel/`, gravados no SQLite do servidor)

- Cada canal tem nome, até 8 agentes, um líder e instruções (até 4.000 caracteres).
- **Como chegar lá:** abrir o editor do **agente principal** → seção "Canais da equipe" → Abrir. O canal não aparece na barra lateral e fica escondido dentro de um modal de edição.
- **Como funciona uma mensagem:**
  1. O líder decide quem chama. Uma `@menção` pula o líder.
  2. Até 3 especialistas respondem, **um de cada vez e com um salto só**.
  3. O líder escreve um resumo.
  4. A guarda de loop corta eco e excesso.
- **Limites do canal:**
  - Uma rodada por vez: se outra estiver rodando, o servidor responde `409 channel_busy`.
  - A tela mostra "A equipe está respondendo…" e só exibe o resultado quando **tudo termina**, sem streaming.

**O que falta para virar uma reunião:**

| Falta                                                   | Hoje                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Agentes respondem uns aos outros                        | Cada especialista vê só o pedido e a tarefa dele. Não vê o canal nem a resposta dos colegas |
| Várias rodadas                                          | Uma rodada por mensagem, com um salto só                                                    |
| Pessoa no meio da reunião                               | Só dá para falar depois que a rodada acaba. Não há "parar" nem "sua vez"                    |
| Ata (decisões, pendências, responsáveis)                | Só o resumo do líder, em texto livre                                                        |
| Ver quem está falando agora                             | Não. Espera o fim da rodada                                                                 |
| Entrada fácil (barra lateral, "chamar reunião" no chat) | Não                                                                                         |
| Reunião agendada (ex.: daily dos agentes)               | Não. Rotinas são por agente, não por canal                                                  |
| Ferramentas e memória no canal                          | Pelo código lido, o canal chama o modelo sem o loop de ferramentas. Não testei              |
| Validação com modelo real                               | Ainda aberta, segundo o próprio roadmap (CRW-2)                                             |

**Como os outros fazem:**

- **Grok Bot:**
  - Grupos de 2 a 6 bots.
  - Sem menção, os bots decidem quem responde. Também dá para usar `@bot`, `@everyone` e responder a uma mensagem específica.
  - Um bot pode mandar mensagem assíncrona a outro.
  - Há threads para comentar um resultado.
  - Um "Stop now" interrompe o trabalho.
  - As aprovações não aparecem no grupo.
- **openbot.run (REA):**
  - Canais com líder, tarefas, atribuições (até 8 por pedido, 2 em paralelo), transferência e resposta entre agentes.
  - Resumo do histórico antigo.
  - Pessoas e agentes no mesmo canal.

---

## 2. Comparação por área

### Agentes

| Capacidade                                             | Open Bot                                      | openbot.run                 | Grok bot                        |
| ------------------------------------------------------ | --------------------------------------------- | --------------------------- | ------------------------------- |
| Criar/editar agente (nome, papel, instruções, avatar)  | ✅                                            | ✅                          | ✅                              |
| Instalação limpa, sem agentes prontos                  | ✅ (tela `AgentSetup`, #196)                  | ✅ (`FirstAgentSetup`, REA) | ?                               |
| Agente cria/edita agente por conversa                  | ✅ (`create_bot`/`update_bot`, com aprovação) | ✅ (REA)                    | ?                               |
| Modelo por agente e modelos de backup                  | ✅                                            | ✅                          | ?                               |
| Delegação do principal para especialistas              | ✅ (até 3, um salto)                          | ✅                          | ✅ (um passa trabalho ao outro) |
| Agente manda mensagem a outro agente por conta própria | ❌                                            | ✅ (`send_message`, REA)    | ✅                              |
| Memória por agente                                     | ✅                                            | ✅                          | ✅                              |
| Link/modelo de agente para compartilhar                | ✅ (link com prévia)                          | ✅                          | ✅ (Shared Bots e marketplace)  |
| Ocultar, pastas, excluir com desfazer                  | ✅                                            | ✅                          | ?                               |

### Sala de reunião / grupo

| Capacidade                              | Open Bot                       | openbot.run                        | Grok bot                     |
| --------------------------------------- | ------------------------------ | ---------------------------------- | ---------------------------- |
| Canal com vários agentes e um líder     | parcial (escondido no editor)  | ✅                                 | ✅ (grupos)                  |
| `@menção` para escolher quem responde   | ✅                             | ✅                                 | ✅ (+ `@everyone`)           |
| Agentes veem e respondem uns aos outros | ❌                             | ✅ (REA)                           | ✅                           |
| Várias rodadas com a pessoa no meio     | ❌                             | parcial (tarefas, REA)             | ✅                           |
| Ver ao vivo quem está falando           | ❌                             | ?                                  | ?                            |
| Ata / resumo da reunião                 | parcial (só o resumo do líder) | parcial (resumo do histórico, REA) | ?                            |
| Threads dentro do grupo                 | ❌                             | ?                                  | ✅                           |
| Parar a reunião                         | ❌                             | ✅ (cancelar, REA)                 | ✅ ("Stop now")              |
| Pessoas diferentes no mesmo canal       | ❌ (por desenho, app pessoal)  | ✅                                 | parcial (Team Bots no Slack) |

### Automações

| Capacidade                                  | Open Bot                       | openbot.run    | Grok bot                              |
| ------------------------------------------- | ------------------------------ | -------------- | ------------------------------------- |
| Rotina agendada por agente                  | ✅                             | ✅             | ✅ (até 50 por bot)                   |
| Rodar sem novidade, em silêncio             | ✅                             | ✅             | ?                                     |
| Histórico de execuções                      | ✅ (`RoutineRunsList`)         | ✅             | ✅ (últimas 20)                       |
| Rotinas encadeadas                          | ✅ (até 5)                     | ✅             | ?                                     |
| Esperas (agente pausa e acorda depois)      | ✅ (`schedule_wakeup`)         | ✅             | ✅ (mensagem assíncrona acorda o bot) |
| Fluxo com passo de aprovação humana         | ❌                             | ✅ (workflows) | ✅                                    |
| Rotina que roda no canal (reunião agendada) | ❌                             | ✅ (REA)       | ?                                     |
| Gatilho por evento externo (webhook)        | parcial (rota local com token) | ✅             | ✅                                    |
| Aprender rotina por demonstração            | ❌                             | ?              | ✅                                    |

### Conversas

| Capacidade                            | Open Bot                            | openbot.run | Grok bot                          |
| ------------------------------------- | ----------------------------------- | ----------- | --------------------------------- |
| Fila e "corrigir o rumo"              | ✅                                  | ✅          | ✅ (mensagem nova tem prioridade) |
| Threads, ramificar, painel de tarefas | ✅                                  | ✅          | ✅ (threads)                      |
| Pergunta lateral                      | ✅                                  | ✅          | ?                                 |
| Compactação de contexto               | ✅                                  | ✅          | ?                                 |
| Voz                                   | ✅ (ditado e leitura no navegador)  | ✅          | ✅ (chamada de voz)               |
| Mesmo histórico em vários aparelhos   | parcial (servidor + `localStorage`) | ✅          | ✅                                |
| "Precisam de você" (pendências)       | ✅                                  | ✅          | ✅ (cartões)                      |

### Ferramentas

| Capacidade                                               | Open Bot                      | openbot.run | Grok bot                                  |
| -------------------------------------------------------- | ----------------------------- | ----------- | ----------------------------------------- |
| Aprovação por ferramenta (perguntar, permitir, bloquear) | ✅                            | ✅          | ✅ (Allow once/Always/Deny + Auto Review) |
| Arquivos do agente                                       | ✅ (pasta, 7 KB por escrita)  | ✅          | ✅ (computador na nuvem)                  |
| Ler página web                                           | ✅ (`read_page`)              | ✅          | ✅                                        |
| Controlar navegador / rodar comandos                     | ❌ (fora do escopo)           | ✅          | ✅                                        |
| MCP                                                      | parcial (configurado por env) | ✅          | ✅                                        |
| Skills                                                   | ✅                            | ✅          | ✅                                        |
| `ask_user` com opções                                    | ✅                            | ✅          | ?                                         |

### Configuração / primeira instalação

| Capacidade                              | Open Bot                             | openbot.run | Grok bot        |
| --------------------------------------- | ------------------------------------ | ----------- | --------------- |
| Começar grátis ou conectar provedor     | ✅                                   | ✅          | ❌ (assinatura) |
| Modelo local (Ollama, LM Studio)        | ✅                                   | ✅          | ❌              |
| Montar a equipe a partir de um objetivo | ❌                                   | ?           | ?               |
| Boas-vindas com 3 tarefas sugeridas     | ✅                                   | ✅          | ?               |
| App instalado no celular                | parcial (PWA, sem teste em aparelho) | ✅ (apps)   | ✅ (iOS)        |

### Confiabilidade

| Capacidade                                     | Open Bot              | openbot.run | Grok bot                   |
| ---------------------------------------------- | --------------------- | ----------- | -------------------------- |
| Envio idempotente / tentar de novo             | ✅                    | ✅          | ?                          |
| Failover de modelo e espera do reset de limite | ✅                    | ✅          | ?                          |
| Guarda de loop entre agentes                   | ✅                    | ✅          | parcial (pedir para parar) |
| Testes contra modelo real                      | ❌ (só simulado)      | ?           | ?                          |
| Trabalha com o app fechado                     | ✅ (servidor próprio) | ✅          | ✅ (nuvem)                 |
| Pausar rotinas depois de muito tempo sem uso   | ❌                    | ?           | ✅                         |

---

## 3. Onde estamos atrás

- **Reunião:** os agentes não conversam entre si. Hoje é uma consulta rápida em que o chefe pergunta e resume.
- **O canal é difícil de achar:** fica dentro do editor do agente principal.
- **Pouca coisa ao vivo:** o canal só mostra o resultado no fim, então reuniões longas parecem travadas.
- **Fluxo com aprovação humana no meio:** existe nos dois concorrentes.
- **Um agente não fala com outro por conta própria:** não há mensagem assíncrona entre agentes.
- **Montar a equipe:** com instalação zerada, falta "me diga seu objetivo e eu sugiro os agentes".
- **Prova com modelo real:** delegação e canais nunca rodaram em teste contra um modelo de verdade.

---

## 4. Roadmap de oportunidades (por valor)

**Fora:** Telegram e novas conexões externas. Regra do repo: até 5 pontos por PR e no máximo 3 PRs abertos.

### Agora

**1. Sala de reunião de verdade** (≈ 22 pts em 6 PRs). É o diferencial pedido e já tem base: canal, guarda de loop, `@menção`.

| ID     | Tarefa                                                                                                                                    | Pts |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --: |
| MEET-1 | Canais na barra lateral, com tela cheia própria (sair do editor do agente)                                                                |   3 |
| MEET-2 | Cada especialista recebe um resumo curto do canal e as falas anteriores da rodada (marcadas como dado externo)                            |   3 |
| MEET-3 | Mostrar cada fala assim que fica pronta: gravar a fala no servidor e o cliente busca a cada poucos segundos, com "falando agora: X"       |   5 |
| MEET-4 | Modo reunião: pauta e até 3 rodadas. Cada agente vê as outras falas e concorda, discorda ou complementa; a guarda de loop vale por rodada |   5 |
| MEET-5 | Pessoa no meio: botões "Parar" e "Sua vez" entre rodadas; mensagem da pessoa entra na próxima rodada                                      |   3 |
| MEET-6 | Ata no fim: decisões, pendências e responsável, com botão para salvar como arquivo do líder                                               |   3 |

**2. Validar com modelo real** (2 pts). Sem isso não dá para afirmar que delegação ou reunião funcionam (CRW-2 está aberta).

| ID     | Tarefa                                                                         | Pts |
| ------ | ------------------------------------------------------------------------------ | --: |
| RELY-1 | Casos de canal e delegação no `run-real-model.sh --vault`, com relatório no PR |   2 |

**3. Primeira instalação que monta a equipe** (5 pts). Com zero agentes, é a primeira impressão.

| ID      | Tarefa                                                                                                | Pts |
| ------- | ----------------------------------------------------------------------------------------------------- | --: |
| SETUP-1 | No `AgentSetup`, campo "o que você quer resolver?" com papéis sugeridos (só sugestão, a pessoa marca) |   3 |
| SETUP-2 | Ao marcar 2 ou mais agentes, oferecer criar um canal "Equipe" já pronto                               |   2 |

### Próximo

**4. Reunião agendada** (5 pts). Uma "daily dos agentes" que entrega a ata de manhã junta rotina e reunião.

| ID     | Tarefa                                                                 | Pts |
| ------ | ---------------------------------------------------------------------- | --: |
| AUTO-1 | Rotina com destino "canal": roda a reunião do MEET-4 e grava a ata     |   3 |
| AUTO-2 | Rotina de canal silenciosa quando a ata não traz decisão nem pendência |   2 |

**5. Aprovação humana dentro da automação** (8 pts em 2 PRs). Os dois concorrentes têm, e isso deixa a automação segura.

| ID     | Tarefa                                                                                          | Pts |
| ------ | ----------------------------------------------------------------------------------------------- | --: |
| AUTO-3 | Passo "pedir aprovação" na rotina encadeada: pausa, cartão em "Precisam de você", segue ou para |   5 |
| AUTO-4 | Aprovação de rotina expira (ex.: 30 min) e a execução fica como "não aprovada"                  |   3 |

**6. Chamar reunião pelo chat** (3 pts). A pessoa não deveria precisar criar o canal antes.

| ID     | Tarefa                                                                                                 | Pts |
| ------ | ------------------------------------------------------------------------------------------------------ | --: |
| MEET-7 | Comando `/reuniao @a @b assunto` no chat do principal abre um canal temporário e leva a pessoa até ele |   3 |

**7. Agente fala com agente** (5 pts). Hoje só o chefe delega. Tem mais risco, por isso vem depois da guarda por rodada.

| ID    | Tarefa                                                                                                              | Pts |
| ----- | ------------------------------------------------------------------------------------------------------------------- | --: |
| BOT-6 | Ferramenta `message_bot` (assíncrona, com teto por hora e guarda de loop). A resposta chega na thread de quem pediu |   5 |

### Depois

| Item                                                        | Por quê                                                    |                      Pts |
| ----------------------------------------------------------- | ---------------------------------------------------------- | -----------------------: |
| Pausar rotinas sem uso (AUTO-5)                             | Grok faz isso; evita gastar cota à toa                     |                        2 |
| Thread por fala no canal (MEET-8)                           | Comentar uma fala sem bagunçar a reunião                   |                        3 |
| Ferramentas no canal, com a mesma aprovação (MEET-9)        | Reunião que age, não só opina. Só depois da MEET-4 estável |                        5 |
| Revisão em aparelho real do PWA (APP-5, já no roadmap)      | Mobile-first sem prova em aparelho                         |                        3 |
| Histórico só no servidor (fim do `localStorage` como fonte) | Mesmo histórico em vários aparelhos                        | dividir em tarefas antes |

**Não recomendo agora:**

- Controle de navegador e comandos.
- Multiusuário e papéis.
- Aprender rotina por demonstração.
- Marketplace.

São grandes e fogem do "um servidor, uma pessoa".

---

## 5. Fontes

**Open Bot (repo local):**

- `src/features/crew/**`
- `src/features/bots/agent-setup.ts`
- `README.pt-BR.md`
- `docs/roadmap/openbot-run-parity.md`
- `docs/spikes/openbot-run/*.md`
- `docs/spikes/grok-bot-ux-spike.md`
- `docs/spikes/functional-audit.md`

**openbot.run:**

- https://openbot.run
- Código: https://github.com/nightly-labs/openbot (lido antes, via REA)

**Grok Bot (xAI):**

- https://x.ai/news/introducing-grok-bot
- https://x.ai/news/team-bots
- https://docs.x.ai/grok-bot/overview.md
- https://docs.x.ai/grok-bot/chat-and-collaboration.md
- https://docs.x.ai/grok-bot/skills-routines-and-automations.md
- https://docs.x.ai/grok-bot/approvals-security-and-privacy.md
