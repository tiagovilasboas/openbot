# Spike de UX: Arquitetura Grok Bot & Dots para o OpenBot

Este documento detalha o spike de UX, modelo mental e implementação canônica do padrão **Grok Bot / Dots** integrado ao OpenBot.

---

## 1. Modelo Mental: 1 Bot = 1 Chat (Conversa 1:1 Dedicada)

No ecossistema do Grok Bot e Dots, cada bot opera como uma entidade autônoma com especialidade, prompt de sistema e skills próprias:

- **Isolamento de Conversas**: A interface não mistura contextos ou históricos de bots diferentes. Ao alternar o bot ativo na barra lateral ou no cabeçalho, o chat carrega exclusivamente o histórico (`messages`) correspondente àquele bot em `localStorage` (`openbot_msgs_<botId>`).
- **Identidade Visual Icônica**: Cada bot possui um avatar geométrico em SVG (`hex`, `tablet`, `gem`, `shield`, `cloud`, `wedge`, `pebble`, `capsule`, `egg`) combinado com uma paleta de 9 cores vibrantes (`cyan`, `blue`, `violet`, `magenta`, `green`, `yellow`, `orange`, `red`, `black`).
- **Instruções de Sistema**: A `description` do bot ativo atua diretamente como `system prompt` para o modelo de IA em todas as requisições.

---

## 2. Experiência Out-of-the-Box (Zero Fricção)

- O sistema inicia com **1 único bot padrão** (**`Chief of Staff`**, id `chief-of-staff`, avatar `shield` na cor `cyan`, papel: `Manager & Orquestrador` em PT / `Manager & Orchestrator` em EN).
- O usuário não precisa configurar nada para começar a interagir: o composer e os prompts de sugestão já estão disponíveis imediatamente no contexto do Chief of Staff.

---

## 3. Gestão de Bots pelo Usuário na Barra Lateral

A barra lateral é limpa, focada exclusivamente na lista de bots do usuário e no botão de criação:

1. **Lista de Bots**: Exibe cada bot cadastrado com seu avatar geométrico, nome, papel e botão de edição rápida.
2. **Criação de Bots (`BotEditModal`)**:
   - Nome e especialidade/título (ex: "Eng Reviewer", "Especialista em Rust").
   - Forma geométrica e cor do avatar SVG.
   - Instruções do sistema (prompt de comportamento e personalidade).
   - Skills associadas: toggle das ferramentas ativas para aquele bot.

---

## 4. Skills Vinculadas por Bot & Gestão em Configurações

- **Gestão Global em Configurações**: O catálogo global e a criação/importação de `SKILL.md` residem no modal de Configurações (`SettingsModal`), mantendo a barra lateral despoluída.
- **Skills Vinculadas por Bot**: Cada bot gerencia suas próprias skills no seu modal de edição.
- **Menu `/` Inteligente**: No composer, digitar `/` abre o catálogo filtrado apenas pelas **skills habilitadas no bot ativo**, garantindo previsibilidade e foco.
- A injeção de prompt no backend anexa exclusivamente as diretrizes das skills ativas do bot selecionado.

---

## 5. Bot Coordenador & Orquestração Multi-Bot (`@bot`)

- O bot manager canônico (**`Chief of Staff`**) atua como coordenador e orquestrador da equipe de bots.
- O usuário pode direcionar perguntas específicas usando menções `@NomeDoBot` diretamente na mensagem.
- Ao detectar uma menção `@bot`, o orquestrador delega o processamento ao bot especialista referenciado, sinalizando visualmente na conversa qual bot respondeu (`via @NomeDoBot`).

---

## 6. Layout Enxuto & Respiro Visual

- **Composer Compacto**: Eliminação de altura mínima inflada (`min-h-[96px]` removido em prol de containers justos com textarea adaptativo e espaçamento proporcional).
- **Separação de Camadas**: O container de mensagens (`flex-1 overflow-y-auto`) e o footer do composer operam em camadas distintas, eliminando scrolls duplos e buracos visuais inferiores.
