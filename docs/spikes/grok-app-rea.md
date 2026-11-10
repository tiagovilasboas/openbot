# REA do app Grok: o que trazer para o Open Bot

Data: 2026-11-10. Alvo: o app Grok (grok.com e apps móveis). Este documento complementa o [spike de UX do Grok Bot](grok-bot-ux-spike.md), que trata do modelo "1 bot, 1 conversa".

## Limites desta análise

- **O app exige login.** A tela inicial de `grok.com` redireciona para `accounts.x.ai/sign-in` (Google, X, Apple, GitHub ou e-mail). Não criei conta nem entrei, então **nenhuma tela interna foi observada**.
- Tudo abaixo vem de fontes públicas e secundárias, em sua maioria de 2025: a listagem da App Store, cobertura de imprensa e guias. Não achei notas de versão oficiais. Trate cada linha como **hipótese a confirmar com uma conta de teste**, não como fato sobre a interface atual.
- Método: só o que é observável de fora. Nada de código, texto, imagem ou marca do produto será copiado; cada recurso é reimplementado com nossa arquitetura e nosso visual.

## O que a fonte pública diz que o app faz

| Recurso              | O que se sabe                                                                               | Fonte                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSearch           | Pesquisa iterativa na web e no X, que termina num relatório estruturado.                    | [Suprmind](https://suprmind.ai/hub/grok/grok-features/)                                                                                                               |
| Think                | Raciocínio explícito para problemas difíceis, mostrando passos intermediários.              | [Suprmind](https://suprmind.ai/hub/grok/grok-features/)                                                                                                               |
| Imagine              | Gera imagens e vídeos curtos com som a partir de texto, e anima fotos.                      | [App Store](https://apps.apple.com/au/app/id6670324846)                                                                                                               |
| Voz e câmera ao vivo | Conversa por voz com resposta falada e modo em que o modelo "vê" a câmera.                  | [App Store](https://apps.apple.com/au/app/id6670324846)                                                                                                               |
| Companions           | Personagens para conversa; sem detalhe público sobre o funcionamento.                       | [App Store](https://apps.apple.com/au/app/id6670324846)                                                                                                               |
| Memória              | Lembra de conversas passadas; dá para desligar em controles de dados e apagar cada memória. | [TechCrunch](https://techcrunch.com/2025/04/16/xai-adds-a-memory-feature-to-grok), [MacRumors](https://macrumors.com/2025/04/17/grok-ai-chatbot-gains-memory-feature) |
| Workspaces           | Agrupam conversas, arquivos e instruções personalizadas sob um tema.                        | [Maginative](https://www.maginative.com/article/xai-upgrades-grok-with-personalized-memory-and-custom-workspaces/)                                                    |
| Planos pagos         | Mais uso de DeepSearch e Think e acesso à voz ficam no plano pago.                          | [Suprmind](https://suprmind.ai/hub/grok/grok-features/)                                                                                                               |

Não achei fonte sobre Projects nem Tasks, então ficam fora.

## Comparação com o Open Bot

O Open Bot já tem: vários bots com avatar e instruções, skills por bot com menu `/`, delegação do bot principal à equipe, fila de mensagens, failover, resumo de GitHub, bloqueio local, backup sem segredos, PT e EN, PWA instalável, e cancelar com erros claros.

| Recurso do Grok        | Equivalente no Open Bot       | Encaixa na arquitetura local-first?                                                        | Pontos | Risco                                                                  |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ | -----: | ---------------------------------------------------------------------- |
| Workspaces             | Só o bot isola a conversa     | Sim: agrupar bots, instruções e arquivos num "espaço" salvo no aparelho                    |      5 | Médio: toca em armazenamento, backup e delegação                       |
| Memória controlável    | Nenhum                        | Sim, se for local, visível, editável e desligável, nunca enviada sem o usuário ver         |      5 | Médio: entra no prompt, então é texto externo e precisa de delimitação |
| Entrada por voz        | Nenhum                        | Sim: reconhecimento de fala do navegador, sem servidor nosso                               |      3 | Baixo: suporte varia por navegador, com fallback                       |
| Resposta falada        | Nenhum                        | Sim: síntese de voz do navegador                                                           |      2 | Baixo                                                                  |
| Think (raciocínio)     | Nenhum                        | Parcial: depende de o provedor expor raciocínio; mostrar "pensando" com o que ele devolver |      3 | Médio: varia por modelo, não dá para prometer                          |
| Anexar arquivos        | Nenhum                        | Parcial: ler texto no cliente é simples; imagem e PDF dependem do modelo                   |      5 | Médio: limite de tamanho e o guard de 64 KB do servidor                |
| DeepSearch             | Nenhum                        | Não sem backend de busca: exige ferramenta, chave e custo                                  |      8 | Alto: quebra o teto de pontos, precisa ser dividido                    |
| Imagine (imagem/vídeo) | Nenhum                        | Não: custo e provedor próprio, fora do escopo do produto                                   |      8 | Alto                                                                   |
| Câmera ao vivo         | Nenhum                        | Não: streaming de vídeo exige backend                                                      |     13 | Alto                                                                   |
| Companions             | Os bots já cumprem esse papel | Já coberto                                                                                 |      0 | Nenhum                                                                 |

## Recomendação

Trazer, nesta ordem, três recursos que cabem no Open Bot sem servidor novo e sem quebrar a regra de nada sensível no cliente:

1. **Entrada e saída por voz** (3 + 2 pontos, dois PRs). Menor risco e o ganho mais visível no celular, que é o uso principal de um PWA.
2. **Memória controlável** (5 pontos). A parte difícil é a confiança: precisa ser uma lista que o usuário vê, edita, apaga e desliga, incluída no backup, e entra no prompt marcada como dado.
3. **Workspaces** (5 pontos). Só depois da memória, porque os dois decidem onde o contexto mora e é melhor desenhar juntos antes de implementar.

Ficam de fora por custo ou por exigirem backend: DeepSearch, Imagine e câmera ao vivo. Think e anexos ficam para depois, porque dependem do que o provedor devolve e do limite do guard.

## O que validar antes de implementar

- Abrir o app com uma conta de teste que o mantenedor fornecer e confirmar, por tela, cada linha da tabela acima. Só então atualizar este documento de "hipótese" para "observado".
- Confirmar o suporte de reconhecimento e síntese de fala nos navegadores alvo (Chrome e Safari no iOS) e definir o comportamento de fallback.
- Decidir se a memória é global, por bot ou por workspace antes de escrever código.
