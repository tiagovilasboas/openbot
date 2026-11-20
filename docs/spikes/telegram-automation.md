# Spike ROT-8: Telegram sobre a rota de automação

Data: 2026-11-20. Status: **descartado**: o dono do projeto não quer ponte com o Telegram. O
código entrou no #193 e foi removido logo depois; este documento fica só como
registro. Pergunta:
como falar com um bot do Open Bot pelo Telegram sem expor o servidor?

## O que já existe

A rota `/api/automation/run` (ROT-5) aceita um token próprio e só responde a
chamadas de loopback. Ela roda uma rotina ou um prompt e devolve o texto.

## Desenho

O servidor do Open Bot continua sem porta aberta para a internet. Um processo
local faz **long polling** na Bot API do Telegram (`getUpdates`) e repassa cada
mensagem para a rota de automação em `127.0.0.1`:

```
Telegram  <--getUpdates/sendMessage--  ponte local  --POST loopback-->  /api/automation/run
```

- Sem webhook: webhook exigiria HTTPS público apontando para o servidor.
- O token do bot do Telegram fica no cofre do servidor; a ponte o recebe por
  uma rota só de loopback, nunca por variável `NEXT_PUBLIC_`.
- Lista de permissão por `chat_id`: só os chats que o dono autorizou falam com
  o bot. Mensagem de outro chat é ignorada e registrada sem o texto.
- Uma conversa do Telegram vira uma thread própria do bot escolhido (ROT-4),
  com o mesmo teto de tamanho e a fila do chat.
- Ferramentas que pedem aprovação não rodam pelo Telegram no começo: o turno
  responde que a ação precisa do app.

## Fatias

| Task | Entrega                                                                    | Pts |
| ---- | -------------------------------------------------------------------------- | --: |
| TG-1 | Ponte de long polling (`automation/telegram/`), com backoff e parada limpa |   5 |
| TG-2 | Tela em Conexões: token no cofre, bot de destino, `chat_id` permitidos     |   3 |
| TG-3 | Thread por conversa do Telegram e resposta em partes (limite de 4096)      |   3 |
| TG-4 | Aprovação de ferramenta por botão inline do Telegram                       |   5 |

Risco: o processo da ponte precisa ficar de pé junto com o servidor. No
`npm start` ele sobe pelo `instrumentation.ts`, como o agendador de rotinas.
