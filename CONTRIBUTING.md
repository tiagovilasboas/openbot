# Contributing / Como contribuir

## English

Open Bot is in the planning stage. Questions, documentation improvements and small, focused proposals are welcome. Before a large change, open an issue describing the problem, proposed approach and trade-offs so contributors can align on scope.

1. Read the [architecture principles](docs/architecture/README.md) and [stack candidates](docs/stacks/README.md).
2. Keep each change focused and explain the behavior or decision it addresses.
3. Include relevant verification and identify assumptions or limitations. Do not present planned features as working.
4. Avoid committing credentials, private data or unrelated changes.
5. Open a pull request with context and evidence for reviewers.

Write commit messages in English; see [Git conventions](docs/git-conventions.md).

English and Brazilian Portuguese contributions are welcome. When changing shared product claims, check whether the other language needs a corresponding update.

Install the versioned hooks with `npx --yes lefthook@1.11.4 install`. Run the shared local and CI gate with `node scripts/check-docs.mjs`. It checks only that core documents are present and non-empty; it does not validate application behavior or security.

## Português

O Open Bot está em planejamento. Perguntas, melhorias na documentação e propostas pequenas e objetivas são bem-vindas. Antes de uma mudança grande, abra uma issue com o problema, a proposta e as concessões para alinharmos o escopo.

1. Leia as [premissas de arquitetura](docs/architecture/README.md) e os [candidatos de stack](docs/stacks/README.md).
2. Mantenha cada mudança focada e explique o comportamento ou a decisão que ela aborda.
3. Inclua as verificações relevantes e indique hipóteses ou limitações. Não apresente recursos planejados como implementados.
4. Não inclua credenciais, dados privados ou mudanças sem relação com a proposta.
5. Abra um pull request com contexto e evidências para a revisão.

Escreva mensagens de commit em inglês; consulte as [convenções de Git](docs/git-conventions.md).

Contribuições em português brasileiro e inglês são bem-vindas. Ao alterar afirmações sobre o produto, confira se a outra versão também precisa ser atualizada.

Instale os hooks versionados com `npx --yes lefthook@1.11.4 install`. Execute a verificação local e do CI com `node scripts/check-docs.mjs`. Ela verifica apenas se os documentos principais existem e não estão vazios; não valida o comportamento ou a segurança do aplicativo.
