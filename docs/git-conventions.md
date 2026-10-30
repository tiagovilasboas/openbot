# Git conventions

These conventions apply to human and automated contributions.

## Commits

- Write the subject and any body in English. Documentation and discussion may be in English or Brazilian Portuguese.
- Use a short, descriptive subject in the imperative, such as `Add calendar connection` or `Fix tool approval flow`.
- Keep each commit focused on a coherent change. Explain the reason and relevant context in the body when the subject is not enough.
- A type prefix such as `feat:` or `docs:` is optional; do not add one without making the message clearer.
- Do not include credentials, private data, or AI co-author attribution in commit messages or metadata.

## Branches and pull requests

- Use descriptive branch names, for example `docs/git-conventions` or `feat/calendar-read`.
- Keep pull requests focused and describe the change, checks performed, and remaining limitations.
- Run the checks documented in [CONTRIBUTING.md](../CONTRIBUTING.md). Do not bypass hooks to make a failing check appear successful.
- Follow repository protections and wait for actual passing CI checks before merging. A pull request with no CI execution is not green.

The English-language rule is a contributor and agent guide; the current documentation gate does not automatically verify commit language.
