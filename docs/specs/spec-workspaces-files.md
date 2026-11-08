# Especificação Técnica: Workspaces e Gestão de Arquivos (UC-01 & UC-10)

## 1. Visão Geral

No `openbot.run`, cada agente opera vinculado a um workspace físico no disco, podendo consumir arquivos, repositórios e anexos.
No **OpenBot PWA**, adaptamos essa capacidade para o ambiente web/offline-first utilizando **File System Access API**, **IndexedDB** e armazenamento local criptografado.

---

## 2. Casos de Uso Detalhados

### UC-10.1: Anexo de Arquivos no Chat Composer

- **Ator:** Desenvolvedor.
- **Entrada:** Clique no ícone de clipe ou drag-and-drop de arquivos (`.ts`, `.tsx`, `.js`, `.py`, `.md`, `.json`, `.txt`, `.csv`, `.pdf` até 5MB).
- **Fluxo Principal:**
  1. O usuário arrasta ou seleciona 1 ou mais arquivos no composer.
  2. O sistema lê o conteúdo via `FileReader` / `File.text()` no navegador.
  3. Renderiza pills com nome do arquivo, tamanho e botão de remoção acima do campo de texto.
  4. Ao enviar a mensagem, o conteúdo do arquivo é encapsulado em bloco delimitado `[Arquivo: nome.ext]...[/Arquivo]` e incorporado ao contexto do turno.

### UC-10.2: Workspace Persistente por Bot

- **Ator:** Desenvolvedor / Sistema.
- **Fluxo Principal:**
  1. No modal de edição do Bot (`BotEditModal`), o usuário define diretrizes de workspace (`workspaceContext`) e anexa arquivos permanentes de documentação/especificação.
  2. Esses arquivos são armazenados no `IndexedDB` local (`openbot_workspaces`) vinculados ao `bot.id`.
  3. Sempre que o bot responde, seus arquivos de workspace são resumidos ou injetados como instruções de contexto fixo.

---

## 3. Modelo de Dados e Contratos (TypeScript)

```ts
export interface WorkspaceFile {
  id: string;
  botId: string;
  name: string;
  size: number;
  mimeType: string;
  content: string; // Base64 ou texto plano utf-8
  isPermanent: boolean; // true = workspace fixo, false = turno efêmero
  createdAt: string;
}

export interface WorkspaceAttachmentPayload {
  fileName: string;
  content: string;
  language?: string;
}
```

---

## 4. Requisitos de UI / UX

- **Área de Drop:** Destaque visual com borda tracejada `border-cyan-500/50 bg-cyan-950/20` quando arquivos forem arrastados sobre a janela.
- **Pills de Anexo:** Exibição compacta no composer com badge de tamanho (`24 KB`) e ícone `x` de remoção rápida.
- **Visualização na Mensagem:** Arquivos anexados são renderizados no balão da mensagem como acordeão colapsável para não poluir o scroll.

---

## 5. Tarefas e Estimativas (Story Points)

| Tarefa        | Descrição                                                               | Pontos | Critério de Aceite                                                       |
| :------------ | :---------------------------------------------------------------------- | :----: | :----------------------------------------------------------------------- |
| **TASK-W2.1** | Componente `FileAttachmentPill` & input de arquivo no `ChatComposer`    |   2    | Seleção de múltiplos arquivos com preview e remoção.                     |
| **TASK-W2.2** | Handler de Drag-and-Drop global no `ChatExperience`                     |   2    | Arrastar arquivos sobre o chat ativa overlay e preenche lista de anexos. |
| **TASK-W2.3** | Módulo de persistência `workspace-storage.ts` via IndexedDB             |   3    | CRUD de arquivos vinculados a bots com limites de cota local.            |
| **TASK-W2.4** | Injeção no pipeline `execute-chat-message.ts` e renderizador colapsável |   3    | LLM recebe arquivos formatados; UI exibe bloco colapsável.               |
