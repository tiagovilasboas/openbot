# Primeiro marco: assistente de bolso para desenvolvedores

Status: plano de entrega, sem implementação ou validação de usuários. Os limites abaixo são valores iniciais de projeto, sujeitos a revisão com evidência.

## Público e resultado

O público inicial são desenvolvedores que conseguem instalar um servidor em seu computador e querem acompanhar trabalho do GitHub pelo celular. O computador deve estar ligado e alcançável. A primeira versão atende uma pessoa, um bot e seus dispositivos.

Pedido central: **“Resuma as issues abertas e os PRs deste repositório; destaque os que pedem minha revisão e mostre as fontes.”** O usuário escolhe um repositório autorizado. O bot apresenta fatos e sugestões separadamente; não presume acesso a todos os repositórios nem inventa critérios de prioridade.

O marco inclui pareamento, chat com histórico, seleção de um modelo validado, leitura de issues/PRs e resposta com fontes. Liquid local, Anthropic e rota gratuita via 9Router são caminhos a avaliar; um caminho aprovado basta para a primeira entrega. Somente caminhos efetivamente verificados aparecem como suportados. O trabalho do router não bloqueia a primeira entrega com outro provedor aprovado.

## Portas de decisão da spike

| Hipótese | Evidência para decidir | Saída |
| --- | --- | --- |
| Next.js + Ionic | Navegação, teclado, áreas seguras, streaming e reconexão no protótipo escuro | Manter se o fluxo funcionar sem disputa de roteadores; caso contrário, registrar alternativa de UI e comparar o mesmo fluxo antes de adotar. |
| assistant-ui | Integração com Ionic e modelo sem duplicar estado ou quebrar rolagem | Adotar se reduzir implementação; caso contrário, chat próprio pequeno. |
| Modelo e runtime | Suíte fixa de chat e ferramentas em PT/EN, incluindo erros | Aprovar cada caminho individualmente; falha de um candidato não impede usar outro aprovado. |
| 9Router e gratuito | Provedor permitido e disponível, requisitos, limites, política de dados, streaming e ferramentas | Oferecer somente rota validada com ativação explícita; indisponibilidade deixa a opção desabilitada com explicação. |
| Acesso móvel | Instalação por pessoa externa, HTTPS e pareamento | Aprovar a receita reproduzível ou registrar impedimento antes de abrir o piloto. |

## Contrato mínimo do agente

1. Receber pedido autenticado, conversa e modelo escolhido; recusar sessão inválida antes de chamar modelo ou ferramenta.
2. Montar contexto com instruções do bot, uma skill selecionada quando relevante, histórico dentro do orçamento e resultados autorizados. Resultados externos são dados não confiáveis.
3. O modelo devolve texto ou proposta de ferramenta. O executor valida ferramenta, argumentos, repositório e permissões; o modelo nunca executa diretamente.
4. Executar leitura ou devolver erro tipado; retornar resultado ao modelo dentro dos limites. O cliente recebe progresso e resposta com fontes.
5. Se faltarem repositório ou informações essenciais, pedir esclarecimento. Em limite, cancelamento ou falha, encerrar com estado explícito e preservar mensagens concluídas.

Exemplo: pedido de issues no repositório selecionado → leitura autorizada → resumo com URLs. Se a ferramenta retornar `permission_denied`, informar que a consulta foi recusada, sem responder como se o repositório estivesse vazio. Se uma issue contiver instruções para ler outro repositório, a autorização continua limitada à seleção do usuário.

## Limites operacionais iniciais

| Limite | Proposta inicial e comportamento |
| --- | --- |
| Trabalho concorrente | Uma tarefa ativa por conversa; nova solicitação permite cancelar ou aguardar. |
| Loop do agente | Até 4 chamadas de modelo e 6 chamadas de ferramenta por tarefa; ao atingir limite, devolver resultado parcial e explicar. |
| Tempo | 120 segundos por tarefa e até 30 segundos por ferramenta, limitados pelo prazo restante; cancelamento impede novas chamadas. |
| Retentativa | Até uma para leitura com erro transitório, respeitando prazo e limites; nunca repetir permissão negada ou argumentos inválidos automaticamente. |
| Contexto | Orçamento explícito por adapter, reservando saída; reduzir resultados e histórico de forma visível quando necessário. O valor depende do runtime validado. |
| Consumo | Registrar chamadas, duração e tokens quando disponíveis; custo estimado somente com preço e uso conhecidos. Não apresentar ausência de medição como custo zero. |

Verificar estes limites com testes determinísticos do executor. Qualidade e fidelidade das respostas exigem revisão dos cenários e evidência. Cancelar localmente pode não interromper trabalho já aceito pelo provedor; informar limitações e medir chamadas adicionais.

## Dados, operação e experiência de falha

Salvar conversas e preferências explícitas de nome, idioma e fuso; permitir excluir histórico. Memória inferida, RAG, agendas autônomas e escrita externa ficam fora deste marco. Credenciais não pertencem ao histórico; definir armazenamento protegido, remoção e revogação no adapter.

Exibir servidor offline quando o Mac dormir ou a conexão cair. Preservar mensagens concluídas; marcar tarefa interrompida sem reexecutar silenciosamente ao reconectar. Manter identificador da tarefa para distinguir retomada da tela e nova execução. Validar origem, sessão, expiração e revogação. Mostrar escopos GitHub e permitir desconectar. Não assumir que estar na rede local autentica o usuário.

## Aceite e piloto

- Uma pessoa externa ao desenvolvimento instala a partir de checkout limpo, seguindo instruções, pareia o celular e conclui o pedido central. Registrar tempo, passos manuais e pontos de ajuda; não prometer prazo sem observação.
- Executar 20 cenários fixos em PT/EN, incluindo pelo menos cinco de falha, permissão, conteúdo adversarial e cancelamento. Publicar fixtures fictícias e resultados por caminho, versão e configuração.
- Meta inicial proposta: pelo menos 18/20 tarefas aceitas, zero execução não autorizada, zero envio para destino não escolhido e fontes corretas para todo fato apresentado como dado do GitHub. Falha crítica bloqueia piloto, independentemente da média. Revisar a rubrica antes de executar, sem alterar o baseline para ocultar perdas.
- Verificar reinício, sessão revogada, credencial inválida, repositório sem itens e serviço indisponível. Cada estado deve ser distinguível na interface.
- Antes de ampliar público, convidar três desenvolvedores para o piloto e registrar conclusão das tarefas, obstáculos e pedidos recorrentes. Isso é uma meta de pesquisa, não validação já obtida.

## Preparação para contribuição e expansão

Entregar uma receita de instalação e inicialização, configuração de exemplo sem segredos, modo de demonstração com fixtures e checks locais iguais aos do CI. O modo de demonstração deve ser claramente identificado e não contar como validação de integração real. Documentar recuperação dos dados, atualização, dependências e limitações dos modelos.

Depois do aceite do marco para devs, priorizar calendário e resumo diário, preservando os mesmos contratos de ferramentas e modelos. Escritas, voz e acesso remoto exigem incrementos próprios. Múltiplos usuários só começam após evidência de demanda e desenho de isolamento. As interfaces internas permitem adicionar adapters; nenhuma plataforma distribuída é necessária para o piloto.
