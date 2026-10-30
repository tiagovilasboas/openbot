# Roadmap do Open Bot

**Status: proposta, sem datas prometidas.** O projeto está em planejamento; nenhuma feature do aplicativo está pronta. Pontos representam complexidade e incerteza, não horas. Divida qualquer item que deixe de ser independente ou ultrapasse 5 pontos. Cada entrega deve ter critérios verificáveis e um PR próprio.

## Objetivo do MVP

Uma pessoa abre o Open Bot no celular, pareia com o servidor no seu computador, escolhe um modelo local ou uma API, conecta GitHub e calendário para leitura e pede um resumo diário com fontes. O bot informa falhas parciais e não executa alterações externas nesse fluxo.

## Premissas

- Uma pessoa e seus dispositivos; servidor próprio em funcionamento. O celular precisa alcançar o servidor por conexão autenticada e HTTPS confiável.
- PWA, Next.js, Ionic, SQLite e Liquid são candidatos a validar na spike. Anthropic por API é o primeiro provedor externo proposto; 9Router é opcional.
- O usuário escolhe o modelo e enxerga o destino dos dados. Não há troca silenciosa para nuvem. Um modelo local precisa de um processo de inferência acessível.
- As chaves e tokens permanecem protegidos no servidor. Uma skill é uma instrução, não permissão nem treinamento. O executor valida cada chamada de ferramenta.
- O MVP de integrações é somente leitura. Ações externas de escrita exigem uma etapa posterior de aprovação explícita.
- A interface e os cenários de avaliação incluem português brasileiro e inglês. Modelos e provedores só são declarados suportados após verificação.

## Etapa 0 — fundação e decisões

| Ordem | Entrega | Pontos | Depende de | Critério de aceite |
| --- | --- | ---: | --- | --- |
| 0.1 | Guias, licença e instruções para agentes | 3 | — | README bilíngue, arquitetura e convenções publicadas; CI e hooks documentados. **Concluído para documentação inicial.** |
| 0.2 | Descoberta de skills por Codex e Claude Code | 2 | 0.1 | Registrar versões e evidência de descoberta e uso da skill em uma sessão real de cada ferramenta; documentar limitações dos links simbólicos. |
| 0.3 | Alinhar decisões de stack | 1 | 0.1 | Documentos apontam Liquid local e Anthropic como primeiros caminhos propostos e mantêm demais escolhas como hipóteses. |

## Etapa 1 — spike e avaliação

| Ordem | Entrega | Pontos | Depende de | Critério de aceite |
| --- | --- | ---: | --- | --- |
| 1.1 | PWA Next.js + Ionic e acesso móvel | 5 | 0.1 | Registrar instalação, navegação, teclado, áreas seguras e acesso HTTPS no iPhone; testar Android se disponível e declarar lacunas. |
| 1.2 | Modelo local e Anthropic | 5 | 0.1 | Executar os mesmos casos em português e inglês com cada caminho; registrar versões, respostas, falhas, latência e custo quando disponível. |
| 1.3 | Ferramenta simulada e 9Router | 5 | 1.2 | Verificar chamada, argumentos, recusa e erros com ferramenta fictícia; comparar rota direta e 9Router sem troca silenciosa de provedor. |
| 1.4 | Decisão de stack e avaliação | 2 | 1.1, 1.2, 1.3 | Publicar resultados reais, amostra, limitações e decisão para UI, servidor, modelos e roteador. Sem evidência, manter item em aberto. |

As frentes 1.1 e 1.2 podem avançar em paralelo. A ferramenta e a comparação dependem dos caminhos de modelo. O protocolo detalhado está em [spike](../spikes/mobile-agent.md).

## Etapa 2 — entrada e conversa

| Ordem | Entrega | Pontos | Depende de | Critério de aceite |
| --- | --- | ---: | --- | --- |
| 2.1 | Inicialização local e HTTPS | 5 | 1.4 | Uma pessoa inicia o servidor e abre a interface no celular com certificado confiável; instruções descrevem limites e configuração. |
| 2.2 | Pareamento e sessão | 5 | 2.1 | Código temporário de uso único conecta dispositivo; expiração, tentativa inválida e acesso sem sessão são recusados. |
| 2.3 | Gerenciar dispositivos | 3 | 2.2 | Listar e revogar sessões; dispositivo revogado perde acesso e consegue iniciar novo pareamento. |
| 2.4 | Conversa e histórico | 5 | 1.4, 2.2 | Criar e retomar conversa; respostas em fluxo e falhas de rede ficam visíveis. |
| 2.5 | Configurar modelo | 5 | 1.4, 2.2 | Escolher endpoint local ou Anthropic, testar conexão e identificar destino; guardar credenciais no servidor e permitir removê-las. |
| 2.6 | Boas-vindas e idioma | 3 | 2.2, 2.5 | Orientar pareamento, escolha de modelo, nome e idioma; oferecer conectar serviços depois. |

Após a autenticação, conversa, configuração de modelo e gestão de dispositivos podem avançar em paralelo com contratos estáveis. A implementação deve definir proteção de origem, sessão, expiração e armazenamento seguro antes de expor o serviço.

## Etapa 3 — ferramentas e resumo diário

| Ordem | Entrega | Pontos | Depende de | Critério de aceite |
| --- | --- | ---: | --- | --- |
| 3.1 | Execução de ferramentas | 5 | 2.4, 2.5 | Validar identidade, permissões e argumentos; limites, erros e recusas são visíveis; nenhuma skill concede acesso. |
| 3.2 | Carregamento de skills | 3 | 3.1 | Selecionar skill permitida sob demanda; tratar conteúdo externo como não confiável e nunca executar scripts automaticamente. |
| 3.3 | Cliente MCP | 5 | 3.1 | Conectar servidor aprovado, expor somente ferramentas permitidas e tratar desconexão e encerramento. |
| 3.4 | Conexão GitHub | 5 | 3.1, 2.2 | Autorizar leitura, consultar issues ou PRs permitidos, mostrar fontes e permitir desconexão. |
| 3.5 | Conexão calendário | 5 | 3.1, 2.2 | Autorizar leitura, consultar eventos por período e fuso, tratar token expirado e permitir desconexão. |
| 3.6 | Resumo diário | 3 | 3.2, 3.4, 3.5 | Responder com fontes, datas e falhas parciais; não inventar dados nem executar escritas. |
| 3.7 | Configurações de conexões | 3 | 3.4, 3.5 | Mostrar provedor, escopos e estado; permitir reconectar ou revogar acesso. |

GitHub e calendário podem avançar em paralelo após contrato de ferramentas e autenticação. A escolha entre MCP e API direta é feita por integração; não depende de expor todo catálogo de ferramentas ao modelo.

## Aceite do MVP

- Parear um celular, reiniciar e retomar a conversa; negar sessão expirada ou revogada.
- Escolher Liquid local ou Anthropic e indicar claramente o provedor ativo; não enviar dados à nuvem sem escolha do usuário.
- Conectar e desconectar GitHub e calendário com escopos de leitura; não expor credenciais no navegador ou nos logs.
- Pedir resumo em português e inglês, obter fontes e entender falhas parciais. Nenhuma alteração externa ocorre no fluxo.
- Avaliar ferramentas com argumentos inválidos, permissão negada e conteúdo externo adversarial; registrar resultados e limites da amostra.
- Documentar instalação, configuração, custos de API e acesso móvel; executar checks reais locais e de CI adequados ao código criado.

## Depois do MVP

| Candidato | Condição para priorizar |
| --- | --- |
| Escritas com confirmação | Definir e testar aprovação vinculada aos argumentos exatos, repetição e auditoria. |
| Voz | Spike de ditado e fala, privacidade, idiomas e experiência em dispositivos. |
| Acesso fora da rede / serviço contínuo | Decidir hospedagem, disponibilidade do modelo local, identidade e custo operacional. |
| Rotinas e notificações | Definir execução em segundo plano, consentimento, limites e falhas. |
| Múltiplos bots, usuários e equipe | Validar isolamento, permissões e necessidade real antes de expandir. |
| Mais provedores, marketplace e apps nativos | Priorizar conforme demanda e compatibilidade comprovada. |

## Métricas e decisões em aberto

Medir na mesma suíte: tarefas aceitas, falhas críticas, correções humanas, latência, tokens e custo. Registrar versão, configuração, hardware e amostra; não afirmar melhora ou paridade sem baseline comparável. Nenhum baseline existe ainda.

Decisões abertas incluem armazenamento de segredos, registro e escopos OAuth, certificado e pareamento, descoberta de skills pelos dois agentes, compatibilidade Next.js/Ionic e suporte do runtime ao modelo Liquid. Não há cronograma de release definido.
