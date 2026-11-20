# Spike CON-6: entrar com a assinatura (Codex, OpenCode, Claude)

Data: 2026-11-20. Status: **feito; decisão abaixo**. Pergunta: o Open Bot pode
usar o plano que a pessoa já paga (ChatGPT, Claude) em vez de uma chave de API,
como o openbot.run faz?

## O que os termos dizem hoje

| Provedor                   | Caminho                                                   | Permitido para um app de terceiros?                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI (ChatGPT)           | "Sign in with ChatGPT" (SIWC), programa oficial para apps | **Sim, sob termos próprios.** Os termos de SIWC (29/09/2026) regem o uso do login dentro de um app que você mantém: o app usa o próprio nome, não se passa pela OpenAI nem por outro projeto e só obtém tokens pelo fluxo oficial. |
| OpenAI (Codex CLI)         | `codex login` com o plano                                 | O CLI aceita login com ChatGPT ou chave de API; o uso segue os termos do ChatGPT. Reaproveitar o token do CLI fora dele não é o fluxo oficial: o caminho certo é o SIWC.                                                           |
| Anthropic (Claude Pro/Max) | OAuth da assinatura                                       | **Não.** Desde fevereiro de 2026 os termos reservam os tokens OAuth dos planos Free, Pro e Max ao Claude Code e ao Claude.ai; em 04/04/2026 a Anthropic passou a bloquear harnesses de terceiros (OpenCode, OpenClaw e outros).    |
| OpenCode                   | Login próprio + modelos grátis                            | Ferramenta de terceiros; com Claude cai na mesma proibição. Os modelos grátis do OpenCode não dependem de assinatura.                                                                                                              |

Fontes: [Sign in with ChatGPT Terms](https://openai.com/policies/sign-in-with-chatgpt-terms/),
[Codex: Authentication](https://developers.openai.com/codex/auth),
[The Register, 20/02/2026](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access),
[Hongkiat, abril de 2026](https://www.hongkiat.com/blog/anthropic-closed-openclaw-loophole/).
Termos mudam: reler antes de implementar.

## Decisão

1. **Claude:** nada de login por assinatura. Continua só chave de API
   (`ANTHROPIC_API_KEY` ou Conexões). Não ler `~/.claude`, não falsificar o
   cliente do Claude Code.
2. **ChatGPT:** o único caminho aceitável é o SIWC oficial, com o nome "Open
   Bot", tokens no cofre do servidor e o mesmo fluxo de estados do Connect
   (`connections/core`). Vira uma task nova (CON-7, ~5 pontos) depois de ler os
   termos completos e confirmar se um app self-hosted e de código aberto pode se
   registrar.
3. **Codex/OpenCode via CLI (`cli-login/`):** não implementar. Ler tokens de
   outro programa contorna o fluxo oficial e quebra a regra de segredo só no
   servidor do AGENTS.md.

Com isso o roadmap troca "login por CLI" por "SIWC oficial" e deixa Claude por
assinatura fora, com o motivo acima.
