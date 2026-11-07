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

- O sistema inicia com **1 único bot padrão** (`OpenBot`, avatar `hex` cor `cyan`), com foco em assistência técnica, GitHub e organização pessoal.
- O usuário não precisa configurar nada para começar a interagir: o composer e os prompts de sugestão já estão disponíveis imediatamente.

---

## 3. Gestão de Bots pelo Usuário

O usuário tem controle total sobre o catálogo de bots via modal de edição/criação (`BotEditModal`):

1. **Nome e Especialidade**: Nome único e papel opcional (ex: "Eng Reviewer", "Especialista em Rust").
2. **Forma e Cor**: Seletor visual em grade das 9 formas geométricas e 9 cores.
3. **Instruções do Sistema**: Prompt de comportamento e personalidade.
4. **Skills Associadas**: Toggle das ferramentas ativas para o bot (`github`, `calendar`, `summary`, além de skills customizadas).

---

## 4. Skills Vinculadas por Bot & Menu `/`

- Cada bot gerencia suas próprias skills.
- No composer, digitar `/` abre o catálogo filtrado apenas pelas **skills habilitadas no bot ativo**, garantindo previsibilidade e foco.
- A injeção de prompt no backend anexa exclusivamente as diretrizes das skills ativas do bot selecionado.

---

## 5. Bot Coordenador & Orquestração Multi-Bot (`@bot`)

- O bot principal (`OpenBot`) pode atuar como **Coordenador/Orquestrador**.
- O usuário pode direcionar perguntas específicas usando menções `@NomeDoBot` diretamente na mensagem.
- Ao detectar uma menção `@bot`, o orquestrador delega o processamento ao bot especialista referenciado, sinalizando visualmente na conversa qual bot respondeu.

---

## 6. Layout Enxuto & Respiro Visual

- **Composer Compacto**: Eliminação de altura mínima inflada (`min-h-[96px]` removido em prol de containers justos com textarea adaptativo e espaçamento proporcional).
- **Separação de Camadas**: O container de mensagens (`flex-1 overflow-y-auto`) e o footer do composer operam em camadas distintas, eliminando scrolls duplos e buracos visuais inferiores.
