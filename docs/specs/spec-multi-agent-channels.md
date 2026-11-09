# Especificação Técnica: Canais Multi-Agente & Anti-Loop (UC-05)

## 1. Visão Geral

No `openbot.run`, agentes não operam apenas em conversas 1:1; eles podem participar de **Shared Channels** (canais de equipe), onde múltiplos agentes colaboram sob a coordenação de um **Task Owner** (dono da tarefa), com controle explícito de reatribuição e travas rígidas contra loops infinitos de confirmação mútua.

No **OpenBot PWA**, expandimos nosso Chief of Staff e menções `@bot` para suportar canais compartilhados de squad.

---

## 2. Casos de Uso Detalhados

### UC-05.1: Criação e Gestão de Canais de Equipe

- **Ator:** Usuário.
- **Fluxo Principal:**
  1. O usuário cria um canal temático (ex: `#arquitetura`, `#review`, `#sustentacao`).
  2. Seleciona quais bots da equipe participam do canal (ex: Chief of Staff, Architect e Code Reviewer).
  3. Todas as mensagens enviadas no canal ficam visíveis para todos os bots participantes.

### UC-05.2: Delegação com Task Owner e Controles de Execução

- **Ator:** Usuário ou Chief of Staff.
- **Fluxo Principal:**
  1. Ao enviar uma demanda (ex: `"@Architect projete o schema de banco"`), o Architect torna-se o `taskOwner` daquela demanda.
  2. A UI exibe controles no topo do chat: **Pausar**, **Reatribuir** (ex: passar para o Code Reviewer) e **Concluir**.
  3. O bot especialista produz a resposta e indica quando encerrou sua parte.

### UC-05.3: Protocolo Anti-Looping entre Bots

- **Problema Observado:** Em sistemas multi-agente, é comum um bot responder `"Obrigado!"`, o outro responder `"Disponha!"`, gerando um loop de custos e tokens infinito.
- **Solução Arquitetural:**
  1. Injeção da regra de entrega canônica em cada mensagem de bot:
     `[Anti-Loop Rule]: Responda estritamente com os dados solicitados. Nunca gere mensagens puramente protocolares de agradecimento ou confirmações vazias.`
  2. Sensor computacional no pipeline que detecta se uma mensagem subsequente de bot não introduz novos fatos ou comandos, interrompendo a cadeia de execução após 2 turnos automatizados.

---

## 3. Modelo de Dados e Contratos (TypeScript)

```ts
export interface TeamChannel {
  id: string;
  name: string;
  description?: string;
  botIds: string[];
  activeTaskOwnerBotId?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface ChannelMessage {
  id: number;
  channelId: string;
  senderType: "user" | "bot";
  senderId: string; // "user" ou bot.id
  text: string;
  taskOwnerId?: string;
  mentions: string[]; // botIds mencionados
  turnIndex: number;
  createdAt: string;
}
```

---

## 4. Tarefas e Estimativas (Story Points)

| Tarefa         | Descrição                                                    | Pontos | Critério de Aceite                                                      |
| :------------- | :----------------------------------------------------------- | :----: | :---------------------------------------------------------------------- |
| **TASK-CH1.1** | Modelo e storage de canais `channel-storage.ts`              |   3    | CRUD de canais e persistência local com reatividade.                    |
| **TASK-CH1.2** | UI de alternância entre Chats Privados e Canais de Equipe    |   3    | Aba de canais no `ChatSidebar.tsx` com lista `#canal`.                  |
| **TASK-CH1.3** | Componente de controle `TaskOwnerHeaderBar.tsx`              |   2    | Botões Pausar, Reatribuir e Concluir no topo do chat.                   |
| **TASK-CH1.4** | Sensor e política de interrupção de Anti-Looping no pipeline |   3    | Teste de unidade comprovando parada imediata em mensagens protocolares. |
