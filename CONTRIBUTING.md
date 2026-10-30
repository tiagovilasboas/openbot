# Contributing / Como contribuir

## English

Open Bot is an early-stage project. The repository's JavaScript toolchain and local quality gate are in place; the mobile chat and integrations remain planned. Questions, documentation improvements and small, focused proposals are welcome. Before a large change, open an issue describing the problem, proposed approach and trade-offs so contributors can align on scope.

1. Read the [architecture principles](docs/architecture/README.md) and [stack candidates](docs/stacks/README.md).
2. Keep each change focused and explain the behavior or decision it addresses.
3. Include relevant verification and identify assumptions or limitations. Do not present planned features as working.
4. Avoid committing credentials, private data or unrelated changes.
5. Open a pull request with context and evidence for reviewers.

Write commit messages in English; see [Git conventions](docs/git-conventions.md).

English and Brazilian Portuguese contributions are welcome. When changing shared product claims, check whether the other language needs a corresponding update.

Install dependencies and hooks with `npm ci` (the `prepare` script installs Husky). Run `npm run check` before pushing. Pre-commit formats and lints staged source files; pre-push and CI run document checks, formatting, lint, type checking, the current automated tests, and a production build when the Next.js app exists. Until app source is added, the typecheck and build scripts report that they are skipped. Current tests cover the document checker only; application behavior is not covered yet.

## Português

O Open Bot está no início do desenvolvimento. A base de ferramentas JavaScript e o gate local de qualidade já existem; o chat mobile e as integrações continuam planejados. Perguntas, melhorias na documentação e propostas pequenas e objetivas são bem-vindas. Antes de uma mudança grande, abra uma issue com o problema, a proposta e as concessões para alinharmos o escopo.

1. Leia as [premissas de arquitetura](docs/architecture/README.md) e os [candidatos de stack](docs/stacks/README.md).
2. Mantenha cada mudança focada e explique o comportamento ou a decisão que ela aborda.
3. Inclua as verificações relevantes e indique hipóteses ou limitações. Não apresente recursos planejados como implementados.
4. Não inclua credenciais, dados privados ou mudanças sem relação com a proposta.
5. Abra um pull request com contexto e evidências para a revisão.

Escreva mensagens de commit em inglês; consulte as [convenções de Git](docs/git-conventions.md).

Contribuições em português brasileiro e inglês são bem-vindas. Ao alterar afirmações sobre o produto, confira se a outra versão também precisa ser atualizada.

Instale as dependências e os hooks com `npm ci` (o script `prepare` instala o Husky). Execute `npm run check` antes de enviar alterações. O pre-commit formata e aplica lint aos arquivos de código staged; o pre-push e o CI executam a checagem de documentos, formatação, lint, verificação de tipos, testes automatizados atuais e build de produção quando o app Next.js existir. Até a inclusão do código do app, os scripts de typecheck e build informam que foram ignorados. Os testes atuais cobrem apenas o verificador de documentos; o comportamento do aplicativo ainda não tem cobertura.
