# Roadmap do Open Bot

**Status: proposta, sem datas prometidas.** O projeto está em planejamento; nenhuma feature do aplicativo está pronta. Pontos representam complexidade e incerteza, não horas. Divida qualquer item que deixe de ser independente ou ultrapasse 5 pontos. Cada entrega deve ter critérios verificáveis e um PR próprio.

## Objetivo do MVP

O primeiro marco atende desenvolvedores: abrir no celular, parear com o computador, escolher um modelo validado e consultar issues e PRs de um repositório autorizado com fontes. O contrato, limites, portas de decisão e aceite estão em [primeiro marco para devs](developer-first.md). Calendário e resumo diário ampliam o MVP após esse aceite.

Um caminho de modelo aprovado basta para o primeiro marco; a opção gratuita só é oferecida quando validada e não bloqueia a entrega com outro caminho aprovado. Interfaces pequenas para modelos e ferramentas permitem crescer sem exigir múltiplos agentes, RAG ou serviços separados.

## Premissas

- Uma pessoa e seus dispositivos; servidor próprio em funcionamento. O celular precisa alcançar o servidor por conexão autenticada e HTTPS confiável.
- PWA Next.js e HeroUI React formam a base atual da interface. SQLite e Liquid ainda são candidatos a validar na spike. Anthropic por API é o primeiro provedor externo proposto; 9Router é opcional.
- O usuário escolhe o modelo e enxerga o destino dos dados. Não há troca silenciosa para nuvem. Um modelo local precisa de um processo de inferência acessível.
- Sem modelo configurado, oferecer modelo gratuito na nuvem via 9Router, se houver provedor compatível disponível. Informar destino, política de dados, conta ou chave necessária e limites antes de ativar. A opção exige escolha explícita; não pressupõe gratuidade ilimitada nem serviço disponível.
- O 9Router é um processo opcional de roteamento, não um fornecedor de modelos. Não distribuir uma chave compartilhada. Um fallback posterior de local para nuvem ou de gratuito para pago exige configuração e consentimento explícitos, com o destino visível.
- As chaves e tokens permanecem protegidos no servidor. Uma skill é uma instrução, não permissão nem treinamento. O executor valida cada chamada de ferramenta.
- O MVP de integrações é somente leitura. Ações externas de escrita exigem uma etapa posterior de aprovação explícita.
- A interface e os cenários de avaliação incluem português brasileiro e inglês. Modelos e provedores só são declarados suportados após verificação.
- A interface terá apenas tema escuro. A direção visual é inspirada nas cores e na simplicidade do Grok Bot, com identidade própria; cores exatas serão definidas e verificadas no protótipo.

## Direção de UI e UX

O chat é a entrada principal após o pareamento. Mostra o modelo ativo, progresso compreensível, respostas com fontes e erros parciais. Histórico, conexões e ajustes ficam acessíveis sem transformar conceitos como MCP em barreiras para o usuário. A primeira entrada orienta pareamento, modelo, nome e idioma do bot e conexões opcionais.

Para acelerar, o protótipo usa componentes públicos de **HeroUI React** e seu tema dark padrão; o template de chat da HeroUI é Pro e não é copiado. As [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) orientam hierarquia, acessibilidade e experiência no iPhone; validar também os comportamentos esperados no Android. O protótipo ainda não comprova instalação PWA, teclado ou suporte em dispositivos reais.

Explorar fundo escuro `#181818`, superfícies `#252525` e um destaque inicial `#6B6EEA`. São candidatos, não cores oficiais do Grok Bot nem decisões finais. Verificar contraste, estados, leitura e acessibilidade antes de adotá-los. Criar identidade e símbolo próprios; não copiar a marca ou ativos do Grok Bot.

Primeiros fluxos a prototipar: chat vazio e em uso; pareamento; escolha do modelo e chave; conexões e permissões; resumo diário com fontes e falha parcial. Verificar teclado, rolagem, foco, leitor de tela, tamanho do texto, áreas seguras e movimento reduzido nos dispositivos disponíveis.

## Etapa 0 — fundação e decisões

| Ordem | Entrega                                      | Pontos | Depende de | Critério de aceite                                                                                                                            |
| ----- | -------------------------------------------- | -----: | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1   | Guias, licença e instruções para agentes     |      3 | —          | README bilíngue, arquitetura e convenções publicadas; CI e hooks documentados. **Concluído para documentação inicial.**                       |
| 0.2   | Descoberta de skills por Codex e Claude Code |      2 | 0.1        | Registrar versões e evidência de descoberta e uso da skill em uma sessão real de cada ferramenta; documentar limitações dos links simbólicos. |
| 0.3   | Alinhar decisões de stack                    |      1 | 0.1        | Documentos apontam Liquid local e Anthropic como primeiros caminhos propostos e mantêm demais escolhas como hipóteses.                        |

## Etapa 1 — spike e avaliação

| Ordem | Entrega                             | Pontos | Depende de    | Critério de aceite                                                                                                                                                                                                                                             |
| ----- | ----------------------------------- | -----: | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1   | PWA Next.js + HeroUI e acesso móvel |      5 | 0.1           | Registrar instalação, navegação, teclado, áreas seguras e acesso HTTPS no iPhone; testar Android se disponível e declarar lacunas.                                                                                                                             |
| 1.2   | Modelo local e Anthropic            |      5 | 0.1           | Executar os mesmos casos em português e inglês com cada caminho; registrar versões, respostas, falhas, latência e custo quando disponível.                                                                                                                     |
| 1.3   | Ferramenta simulada e 9Router       |      5 | 1.2           | Comparar Liquid, Anthropic e ao menos um provedor gratuito acessado pelo 9Router nos mesmos casos; verificar streaming, ferramentas, limites, cadastro, termos, privacidade e erros. Registrar disponibilidade real e não simular sucesso quando indisponível. |
| 1.4   | Decisão de stack e avaliação        |      2 | 1.1, 1.2, 1.5 | Publicar resultados reais, amostra, limitações e decisão para UI, servidor, modelos e roteador. Sem evidência, manter item em aberto.                                                                                                                          |
| 1.5   | Protótipo de UI escura              |      3 | 1.1           | Prototipar os cinco fluxos, avaliar contraste e experiência mobile com HeroUI; registrar aparelhos, falhas e lacunas.                                                                                                                                          |

As frentes 1.1 e 1.2 podem avançar em paralelo. A comparação opcional 1.3 não bloqueia 1.4 se houver outro modelo aprovado. A decisão de UI considera o protótipo 1.5. A ferramenta e a comparação dependem dos caminhos de modelo. O protocolo detalhado está em [spike](../spikes/mobile-agent.md).

## Etapa 2 — entrada e conversa

| Ordem | Entrega                     | Pontos | Depende de | Critério de aceite                                                                                                                                                                     |
| ----- | --------------------------- | -----: | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1   | Inicialização local e HTTPS |      5 | 1.4        | Uma pessoa inicia o servidor e abre a interface no celular com certificado confiável; instruções descrevem limites e configuração.                                                     |
| 2.2   | Pareamento e sessão         |      5 | 2.1        | Código temporário de uso único conecta dispositivo; expiração, tentativa inválida e acesso sem sessão são recusados.                                                                   |
| 2.3   | Gerenciar dispositivos      |      3 | 2.2        | Listar e revogar sessões; dispositivo revogado perde acesso e consegue iniciar novo pareamento.                                                                                        |
| 2.4   | Conversa e histórico        |      5 | 1.4, 2.2   | Criar e retomar conversa; respostas em fluxo e falhas de rede ficam visíveis.                                                                                                          |
| 2.5   | Configurar modelo           |      5 | 1.4, 2.2   | Escolher endpoint local, Anthropic ou rota gratuita validada; testar conexão, identificar destino, guardar credenciais no servidor e permitir removê-las.                              |
| 2.6   | Boas-vindas e idioma        |      3 | 2.2, 2.5   | Orientar pareamento, escolha de modelo, nome e idioma; sem modelo configurado, oferecer rota gratuita validada com informação e ativação explícita; permitir conectar serviços depois. |
| 2.7   | Falhas e fallback de modelo |      3 | 2.5        | Mostrar indisponibilidade ou limite; permitir escolher outra rota. Fallback automático só após configuração e consentimento explícitos para o destino e eventual cobrança.             |

Após a autenticação, conversa, configuração de modelo e gestão de dispositivos podem avançar em paralelo com contratos estáveis. A implementação deve definir proteção de origem, sessão, expiração e armazenamento seguro antes de expor o serviço.

## Etapa 3 — GitHub para devs e expansão pessoal

| Ordem | Entrega                   | Pontos | Depende de    | Critério de aceite                                                                                                           |
| ----- | ------------------------- | -----: | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 3.1   | Execução de ferramentas   |      5 | 2.4, 2.5      | Validar identidade, permissões e argumentos; limites, erros e recusas são visíveis; nenhuma skill concede acesso.            |
| 3.2   | Carregamento de skills    |      3 | 3.1           | Selecionar skill permitida sob demanda; tratar conteúdo externo como não confiável e nunca executar scripts automaticamente. |
| 3.3   | Cliente MCP               |      5 | 3.1           | Conectar servidor aprovado, expor somente ferramentas permitidas e tratar desconexão e encerramento.                         |
| 3.4   | Conexão GitHub            |      5 | 3.1, 2.2      | Autorizar leitura, consultar issues ou PRs permitidos, mostrar fontes e permitir desconexão.                                 |
| 3.5   | Conexão calendário        |      5 | 3.8           | Autorizar leitura, consultar eventos por período e fuso, tratar token expirado e permitir desconexão.                        |
| 3.6   | Resumo diário             |      3 | 3.2, 3.4, 3.5 | Responder com fontes, datas e falhas parciais; não inventar dados nem executar escritas.                                     |
| 3.7   | Configurações de conexões |      3 | 3.4           | Mostrar escopos e estado do GitHub; permitir reconectar ou revogar acesso. Estender ao calendário em 3.5.                    |
| 3.8   | Aceite e piloto para devs |      3 | 3.4, 3.7      | Concluir os cenários, instalação externa e critérios do primeiro marco; registrar lacunas antes de expandir.                 |

O calendário começa após o aceite do marco para devs. O cliente MCP é necessário apenas se a integração escolhida o utilizar; API direta aprovada pode atender o primeiro marco. A escolha entre MCP e API direta é feita por integração; não depende de expor todo catálogo de ferramentas ao modelo.

## Aceite do MVP

- Parear um celular, reiniciar e retomar a conversa; negar sessão expirada ou revogada.
- Escolher Liquid local, Anthropic ou rota gratuita validada e indicar claramente o provedor ativo; não enviar dados à nuvem sem escolha do usuário. Se a rota gratuita exigir conta ou chave, explicar como configurá-la.
- Sem provedor gratuito disponível, informar o problema e oferecer configuração local ou API. Não incluir chave compartilhada nem prometer disponibilidade ou gratuidade ilimitada.
- Conectar e desconectar GitHub e calendário com escopos de leitura; não expor credenciais no navegador ou nos logs.
- Pedir resumo em português e inglês, obter fontes e entender falhas parciais. Nenhuma alteração externa ocorre no fluxo.
- Avaliar ferramentas com argumentos inválidos, permissão negada e conteúdo externo adversarial; registrar resultados e limites da amostra.
- Documentar instalação, configuração, custos de API e acesso móvel; executar checks reais locais e de CI adequados ao código criado.
- Verificar o tema escuro, acessibilidade, teclado e áreas seguras nas plataformas disponíveis, sem alegar cobertura de dispositivos não testados.

## Depois do MVP

| Candidato                                   | Condição para priorizar                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Escritas com confirmação                    | Definir e testar aprovação vinculada aos argumentos exatos, repetição e auditoria.   |
| Voz                                         | Spike de ditado e fala, privacidade, idiomas e experiência em dispositivos.          |
| Acesso fora da rede / serviço contínuo      | Decidir hospedagem, disponibilidade do modelo local, identidade e custo operacional. |
| Rotinas e notificações                      | Definir execução em segundo plano, consentimento, limites e falhas.                  |
| Múltiplos bots, usuários e equipe           | Validar isolamento, permissões e necessidade real antes de expandir.                 |
| Mais provedores, marketplace e apps nativos | Priorizar conforme demanda e compatibilidade comprovada.                             |

## Métricas e decisões em aberto

Medir na mesma suíte: tarefas aceitas, falhas críticas, correções humanas, latência, tokens, tentativas e custo por tarefa aceita. Registrar versão, configuração, hardware e amostra; não afirmar melhora ou paridade sem baseline comparável. Nenhum baseline existe ainda.

Decisões abertas incluem armazenamento de segredos, registro e escopos OAuth, certificado e pareamento, descoberta de skills pelos dois agentes e suporte do runtime ao modelo Liquid. O uso de HeroUI no protótipo ainda precisa de validação em dispositivos. Não há cronograma de release definido.
