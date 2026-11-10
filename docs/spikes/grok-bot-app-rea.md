# REA do app Grok Bot instalado: o que trazer para o Open Bot

Data: 2026-11-10. Alvo: o app **Grok Bot 0.79.3** instalado no Mac do mantenedor (`/Applications/Grok Bot.app`, desktop Electron, "Grok Bot desktop agent"). Complementa o [spike de UX do Grok Bot](grok-bot-ux-spike.md).

## Método e limites

- **Só o que o pacote instalado expõe por fora:** `Info.plist`, a lista de arquivos do `app.asar` (nomes e pastas), `package.json` e as telas do app. **Nenhum código-fonte foi lido** e nada foi copiado: nem código, nem imagem, nem texto, nem marca.
- **Sem login.** O app abriu na tela de entrada ("Your team of always-on Bots that you can give real work to") e eu não autentiquei. Nenhuma tela interna foi vista.
- **Consequência:** o que segue é **inferência a partir de nomes de módulos**, por exemplo `voice-call-harness`. Diz que o recurso existe no produto, não como ele se comporta. Cada linha é hipótese até alguém ver a tela.

## O que o pacote indica

Produto: "uma equipe de Bots sempre ativos a quem você dá trabalho real", rodando como agente no desktop, com 30 e poucos idiomas.

| Sinal no pacote                                                                     | Recurso provável                                                            |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 26 formas de avatar de bot, cada uma com e sem "rosto", e um ícone de "working"     | Bots com identidade visual rica e estado "trabalhando" na barra de menus    |
| `menubar-tray`, `attention-count`                                                   | Contador de bots que precisam de atenção, visível fora da janela            |
| `voice-call-harness`, permissão de microfone e câmera                               | Chamada de voz com o bot                                                    |
| `dnd-kit`                                                                           | Reordenar itens arrastando                                                  |
| `usage-banner`, `xai-commerce-prepaid`                                              | Aviso de uso e créditos pré-pagos                                           |
| `agent-summarization`, `agent-transcript`                                           | Resumo e transcrição das conversas                                          |
| `locales/*` com cerca de 38 idiomas                                                 | Interface multilíngue                                                       |
| `local-exec-daemon`, `shell-exec`, `desktop-mount` (VNC), `sand-playwright-runtime` | Execução de comandos, controle de tela e de navegador na máquina do usuário |
| `messages-mac`, `slack-app-setup`, `onepassword-connection-service`, MCP, plugins   | Integrações com iMessage, Slack, 1Password, MCP e um marketplace de plugins |

## Comparação com o Open Bot

O Open Bot já tem bots com avatar, skills por bot, delegação, fila, failover, GitHub, bloqueio local, backup, PT e EN, cancelar e e2e. O que falta e cabe num PWA local-first:

| Recurso                                            | Cabe no PWA?                                                 | Pontos | Risco                                              |
| -------------------------------------------------- | ------------------------------------------------------------ | -----: | -------------------------------------------------- |
| Mais formas de avatar (hoje 9), desenhadas por nós | Sim: novas formas no gerador de SVG                          |      2 | Baixo                                              |
| Reordenar bots arrastando                          | Sim: o bot principal continua fixo no topo                   |      3 | Baixo: acessibilidade por teclado precisa de teste |
| Estado "trabalhando" e contador de atenção por bot | Sim: indicador na lista e Badging API no app instalado       |      3 | Baixo                                              |
| Voz (entrada e saída)                              | Sim: fala do navegador, sem servidor nosso                   |      5 | Médio: suporte varia por navegador                 |
| Uso e custo por bot                                | Parcial: depende do provedor devolver contagem de tokens     |      3 | Médio                                              |
| Mais um idioma (espanhol)                          | Sim: dicionários de texto já centralizados                   |      3 | Baixo: README em paridade                          |
| Execução local, controle de tela e navegador       | Não: um PWA não deve nem pode; é superfície de ataque grande |      - | Alto                                               |
| iMessage, Slack, 1Password, MCP, marketplace       | Não agora: exigem servidor ou app nativo; ficam no backlog   |      - | Alto                                               |

## Recomendação

Em ordem, um PR pequeno por item:

1. **Mais formas de avatar** e **reordenar bots** (2 + 3): visual e de uso diário, sem risco.
2. **Estado "trabalhando" e contador de atenção** (3): faz o app parecer uma equipe sempre ativa.
3. **Voz** (5, dividir em entrada e saída): o maior ganho no celular.
4. **Espanhol** (3) e **uso por bot** (3) depois.

## Antes de implementar

- Abrir o app logado e confirmar, tela por tela, cada linha da primeira tabela. Só então marcar como "observado".
- Desenhar as formas e os textos do zero; usar o app só como referência de comportamento.
- Confirmar suporte a fala e a badge nos navegadores alvo (Chrome, Safari no iOS).
