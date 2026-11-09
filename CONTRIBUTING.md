# Contributing / Como contribuir

## English

Open Bot is an early-stage project. The repository's JavaScript toolchain and local quality gate are in place, and an initial mobile chat prototype (HeroUI React with a simulated calendar tool and mock data) is in `src/`. Real model providers and external integrations remain planned. Questions, documentation improvements and small, focused proposals are welcome. Before a large change, open an issue describing the problem, proposed approach and trade-offs so contributors can align on scope.

1. Read the [architecture principles](docs/architecture/README.md) and [stack candidates](docs/stacks/README.md).
2. Keep each change focused and explain the behavior or decision it addresses.
3. Include relevant verification and identify assumptions or limitations. Do not present planned features as working.
4. Avoid committing credentials, private data or unrelated changes.
5. Open a pull request with context and evidence for reviewers.

Write commit messages in English; see [Git conventions](docs/git-conventions.md).

English and Brazilian Portuguese contributions are welcome. When changing shared product claims, check whether the other language needs a corresponding update.

Local development requires **Node.js >= 22.6.0** (needed by the native test runner with `--experimental-strip-types`); `.nvmrc` pins it, so `nvm use` selects it, and the pre-push hook switches to it when nvm is installed. Install dependencies and hooks with `npm ci` (the `prepare` script installs Husky). Run `npm run check` before pushing. Pre-commit formats and lints staged source files; pre-push and CI run document checks, formatting, lint, type checking (`tsc --noEmit`), current automated tests, and the Next.js production build (`next build`), which actively runs over `src/`. Current automated tests cover the document checker and simulated chat/tool response behavior; real model providers, external integrations, and server security controls will require dedicated tests when added.

## Português

O Open Bot está no início do desenvolvimento. A base de ferramentas JavaScript e o gate local de qualidade já existem, e um protótipo inicial de chat mobile (HeroUI React com ferramenta de agenda simulada e dados fictícios) já está em `src/`. Provedores reais de modelo e integrações externas continuam planejados. Perguntas, melhorias na documentação e propostas pequenas e objetivas são bem-vindas. Antes de uma mudança grande, abra uma issue com o problema, a proposta e as concessões para alinharmos o escopo.

1. Leia as [premissas de arquitetura](docs/architecture/README.md) e os [candidatos de stack](docs/stacks/README.md).
2. Mantenha cada mudança focada e explique o comportamento ou a decisão que ela aborda.
3. Inclua as verificações relevantes e indique hipóteses ou limitações. Não apresente recursos planejados como implementados.
4. Não inclua credenciais, dados privados ou mudanças sem relação com a proposta.
5. Abra um pull request com contexto e evidências para a revisão.

Escreva mensagens de commit em inglês; consulte as [convenções de Git](docs/git-conventions.md).

Contribuições em português brasileiro e inglês são bem-vindas. Ao alterar afirmações sobre o produto, confira se a outra versão também precisa ser atualizada.

O desenvolvimento local requer **Node.js >= 22.6.0** (necessário para o executor de testes nativo com `--experimental-strip-types`); o `.nvmrc` fixa essa versão, então `nvm use` a seleciona, e o hook de pre-push troca para ela quando o nvm está instalado. Instale as dependências e os hooks com `npm ci` (o script `prepare` instala o Husky). Execute `npm run check` antes de enviar alterações. O pre-commit formata e aplica lint aos arquivos staged; o pre-push e o CI executam a checagem de documentos, formatação, lint, verificação de tipos (`tsc --noEmit`), testes automatizados atuais e o build de produção do Next.js (`next build`), que já executa ativamente sobre `src/`. Os testes cobrem atualmente o verificador de documentos e o comportamento da resposta e ferramenta simulada do chat; provedores reais de modelo, integrações externas e controles de segurança de servidor exigirão testes dedicados quando forem adicionados.
