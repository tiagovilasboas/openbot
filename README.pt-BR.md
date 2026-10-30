# Open Bot

**Um agente pessoal de IA open source, pensado para o celular e para o modelo que você escolher.**

[English](README.md) · [Arquitetura](docs/architecture/README.md) · [Candidatos de stack](docs/stacks/README.md) · [Como contribuir](CONTRIBUTING.md)

O Open Bot nasceu de uma dor conhecida: o Grok Bot ficou caro demais para um brasileiro duro que queria um agente pessoal. A ideia é construir algo acessível, aberto a contribuições e flexível para usar um modelo local ou uma chave de API do provedor escolhido. O Open Bot é um projeto independente e não tem vínculo com o Grok Bot.

**Status: planejamento.** Ainda não há aplicativo funcionando. As funcionalidades abaixo são objetivos a validar, não recursos já disponíveis.

## A primeira experiência útil

Perguntar pelo celular: “O que tenho no calendário hoje e quais issues do GitHub precisam da minha atenção?” O Open Bot usaria conexões autorizadas e uma skill reutilizável para preparar um resumo com referências às fontes.

O MVP proposto é um PWA para celular conectado a um servidor no computador. A intenção é oferecer:

- Um modelo Liquid hospedado localmente ou um provedor externo, como a Anthropic, escolhido pelo usuário.
- Instruções reutilizáveis em `SKILL.md` e ferramentas autorizadas por MCP ou APIs diretas.
- Primeiro, leitura do GitHub e do calendário; confirmação explícita antes de alterações externas.
- Interface e documentação em português brasileiro e inglês.

Compatibilidade dos provedores, chamadas de ferramentas, qualidade em português, acesso pelo celular e stack ainda precisam de validação prática. Um roteador de modelos como o 9Router é uma opção a avaliar, não uma exigência. Modelos locais precisam de um servidor de inferência; provedores em nuvem podem cobrar pelo uso da API.

## Direção de arquitetura

O aplicativo deve separar o comportamento do produto dos detalhes de provedores e integrações. Skills fornecem instruções; elas não concedem permissões. O projeto aproveita os padrões de papéis, limites e aprovação do [grok-bot-architecture](https://github.com/tiagovilasboas/grok-bot-architecture).

Consulte as [premissas de arquitetura](docs/architecture/README.md) e os [candidatos de stack](docs/stacks/README.md). Ideias, perguntas e contribuições são bem-vindas; veja [como contribuir](CONTRIBUTING.md).

## Licença

O Open Bot nasce open source, sob a [licença MIT](LICENSE).

## Apoie o projeto

O Open Bot é mantido por Tiago Vilas Boas. Para apoiar seu desenvolvimento, [patrocine pelo GitHub Sponsors](https://github.com/sponsors/tiagovilasboas). O apoio é opcional; contribuições, sugestões e relatos de problemas também são bem-vindos.
