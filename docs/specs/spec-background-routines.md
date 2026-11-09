# Especificação Técnica: Rotinas em Segundo Plano e Automação (UC-06 & UC-07)

## 1. Visão Geral

No `openbot.run`, agentes podem executar tarefas programadas sem intervenção humana contínua. Para evitar sobrecarregar o usuário com notificações desnecessárias quando nada mudou, o sistema implementa **Quiet Routine Runs** (`routine_no_update`). Além disso, disponibiliza um **Loopback Automation Server** em `127.0.0.1` com token bearer e limite de taxa para integração com scripts externos.

No **OpenBot PWA**, implementamos as rotinas via **Web Workers** no cliente e estendemos as rotas de API locais para automação.

---

## 2. Casos de Uso Detalhados

### UC-06.1: Execução de Rotina Periódica Silenciosa

- **Ator:** Sistema (Web Worker Timer / Agendador).
- **Fluxo Principal:**
  1. O usuário agenda uma rotina para um bot (ex: `"Verificar se há novas issues no repositório a cada 30 minutos"`).
  2. O Web Worker dispara a execução em segundo plano no horário devido.
  3. O bot consulta o GitHub ou endpoint configurado.
  4. Se não houver novas ocorrências, o modelo emite o marcador `[[no-update]]` ou aciona a ferramenta `routine_no_update`.
  5. O sistema registra o run no histórico local com flag `quiet: true`.
  6. **Nenhuma notificação sonora, push ou pop-up é exibida ao usuário**, poupando sua atenção.

### UC-06.2: Relatório de Falha em Rotina

- **Ator:** Bot / Sistema.
- **Fluxo Principal:**
  1. Durante a rotina, o bot encontra um erro crítico (ex: credencial expirada ou API fora do ar).
  2. O bot aciona `routine_report_failure` com a razão da falha.
  3. O status do run comuta imediatamente de `running` para `failed`.
  4. Uma notificação visual de alerta é emitida para intervenção do usuário.

### UC-07.1: Loopback API para Scripts Locais

- **Ator:** Terminal / Scripts bash ou python do desenvolvedor.
- **Fluxo Principal:**
  1. O desenvolvedor habilita `"Permitir automação por scripts locais"` nas configurações.
  2. O servidor gera um token bearer volátil persistido localmente em `~/.openbot/automation.json`.
  3. Scripts locais enviam requisições `POST /api/chat` com `Authorization: Bearer <token>`.
  4. O sistema valida que a requisição partiu de `127.0.0.1` ou `localhost` e rejeita qualquer cabeçalho `Origin` externo.
  5. Limite de segurança de 30 execuções por hora por padrão para impedir gasto descontrolado de quotas.

---

## 3. Modelo de Dados e Contratos (TypeScript)

```ts
export interface AgentRoutine {
  id: string;
  botId: string;
  name: string;
  prompt: string;
  intervalMinutes: number;
  isEnabled: boolean;
  runIn: "chat" | "thread"; // Chat principal ou thread isolada
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface RoutineRunRecord {
  id: string;
  routineId: string;
  botId: string;
  status: "succeeded" | "failed" | "quiet";
  output?: string;
  errorMessage?: string;
  ranAt: string;
  durationMs: number;
}
```

---

## 4. Tarefas e Estimativas (Story Points)

| Tarefa        | Descrição                                                          | Pontos | Critério de Aceite                                                 |
| :------------ | :----------------------------------------------------------------- | :----: | :----------------------------------------------------------------- |
| **TASK-R1.1** | Motor de agendamento em Web Worker `routine-worker.ts`             |   3    | Disparo pontual de tarefas agendadas em segundo plano.             |
| **TASK-R1.2** | Tratamento de `[[no-update]]` e supressão de notificações          |   2    | Testes unitários validando `quiet: true` e preservação silenciosa. |
| **TASK-R1.3** | Interface de gerenciamento de rotinas no `BotEditModal.tsx`        |   3    | Criação, pausa e exclusão de rotinas por agente.                   |
| **TASK-R1.4** | Guard de Loopback API em `127.0.0.1` com token bearer e rate limit |   3    | Rejeição de requisições externas e trava de 30 runs/hora.          |
