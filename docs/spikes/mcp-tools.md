# Spike TOL-5: MCP como ferramenta

Data: 2026-11-20. Status: **feito; MCP-1 a MCP-3 entregues, MCP-4 e MCP-5 abertas**. Pergunta:
como um bot usa um servidor MCP sem abrir mão das regras de permissão que o
tool loop já tem (`tools/`, níveis perguntar/permitir/bloquear)?

## Onde o MCP entra

O tool loop já recebe um `ToolRegistry` montado em `server-tools.ts`. Um
servidor MCP vira mais uma fonte de `ToolDefinition`, montada por requisição:

```
mcp/
  core/        tipos, nome qualificado (mcp__<servidor>__<tool>), validação
  server/      cliente MCP (transporte), cache da lista de tools, adaptador
               ToolDefinition <- tool MCP
  client/      tela em Conexões: adicionar servidor, testar, ligar/desligar
```

`tools/` não importa `mcp/` diretamente: `server-tools.ts` recebe as
definições prontas, como já faz com `workspaceTools`.

## Transporte

| Transporte      | Decisão                                | Motivo                                                                                                                             |
| --------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Streamable HTTP | **Primeiro**                           | Cabe no servidor Next sem processo filho; mesma guarda de rede do `read_page` (`server-guard`, sem endereço privado salvo opt-in). |
| stdio           | Depois, atrás de `OPENBOT_MCP_STDIO=1` | Executa um binário local: só para quem roda o servidor na própria máquina.                                                         |
| SSE legado      | Não                                    | Substituído pelo Streamable HTTP.                                                                                                  |

## Autenticação

- Token estático: guardado no cofre (`key-vault`), nunca no `localStorage`.
- OAuth do servidor MCP: reaproveita a máquina de estados e o PKCE de
  `connections/oauth`; o callback é o mesmo `/api/connections/[id]/callback`.

## Permissão

- Toda tool MCP nasce com `policy: "ask"` e `allowAlways: true`; o nível do
  usuário (TOL-1) vale igual.
- Uma tool que o servidor marca com `readOnlyHint` pode sugerir "permitir",
  mas nunca vem permitida de fábrica: a dica vem de fora e não é confiável.
- Descrição e resultado de tool MCP são texto externo: passam por
  `wrapExternalText` antes de chegar ao modelo, com teto de caracteres.
- Nome qualificado por servidor: duas tools iguais de servidores diferentes
  não colidem, e "sempre permitir" vale por servidor e tool.

## Fatias

| Task  | Entrega                                                             | Pts |
| ----- | ------------------------------------------------------------------- | --: |
| MCP-1 | `mcp/core`: tipos, nome qualificado, validação de schema de entrada |   3 |
| MCP-2 | Cliente Streamable HTTP com guarda de rede, lista de tools em cache |   5 |
| MCP-3 | Adaptador para `ToolDefinition` e registro por requisição           |   3 |
| MCP-4 | Tela em Conexões: adicionar, testar, desligar; token no cofre       |   5 |
| MCP-5 | OAuth do servidor MCP sobre `connections/oauth`                     |   5 |

Fora: stdio sem a flag, prompts e resources do MCP (só tools no começo).
