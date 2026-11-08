# Especificação Técnica: Navegação e Inspeção Web (UC-08)

## 1. Visão Geral

No `openbot.run`, agentes contam com um navegador embutido (embedded browser) para abrir links, inspecionar DOM e interagir com páginas.
No **OpenBot PWA**, essa capacidade deve obedecer com rigor ao **Guardrail de Instância Única (Zero Janelas Paralelas)**, utilizando ferramentas seguras de extração de conteúdo e inspeção headless via CDP/Playwright local sem interferir no browser pessoal do usuário.

---

## 2. Casos de Uso Detalhados

### UC-08.1: Extração e Leitura Segura de URLs

- **Ator:** Bot / Agente.
- **Entrada:** URL enviada pelo usuário ou identificada em uma issue/PR.
- **Fluxo Principal:**
  1. O agente identifica a necessidade de ler o conteúdo de uma página web externa.
  2. Aciona a ferramenta de extração segura de texto (Readability / HTML to Markdown).
  3. O parser higieniza o HTML, remove scripts, anúncios e cookies trackers.
  4. Devolve o texto limpo em Markdown para o contexto do modelo.

### UC-08.2: Inspeção Dinâmica via CDP Headless (Desenvolvedor Local)

- **Ator:** Agente especialista de QA / Bug Hunter.
- **Fluxo Principal:**
  1. Tarefa de diagnóstico de aplicação web em execução local (ex: testar `http://localhost:3000`).
  2. O servidor conecta-se à porta CDP isolada (porta 9222 do Chrome supervisionado pelo `agyo`).
  3. Coleta erros de console (`window.onerror`), falhas de requisição de rede (`network 4xx/5xx`) e árvore de acessibilidade.
  4. Nenhuma janela gráfica paralela é criada no desktop do usuário.
  5. Relata as evidências técnicas encontradas diretamente no chat do bot.

---

## 3. Modelo de Dados e Contratos (TypeScript)

```ts
export interface WebPageExtractResult {
  url: string;
  title: string;
  markdownContent: string;
  statusCode: number;
  extractedAt: string;
}

export interface CdpInspectionReport {
  targetUrl: string;
  consoleErrors: Array<{ level: string; message: string; source: string }>;
  failedNetworkRequests: Array<{ url: string; status: number; method: string }>;
  pageTitle: string;
}
```

---

## 4. Tarefas e Estimativas (Story Points)

| Tarefa        | Descrição                                                   | Pontos | Critério de Aceite                                                    |
| :------------ | :---------------------------------------------------------- | :----: | :-------------------------------------------------------------------- |
| **TASK-B1.1** | Endpoint de extração limpa `/api/web/extract`               |   3    | Sanitização de HTML para Markdown com timeout estrito de 5s.          |
| **TASK-B1.2** | Ferramenta integrada `fetch_url_content` no pipeline do bot |   2    | O bot invoca a leitura automática de links postados na conversa.      |
| **TASK-B1.3** | Adaptador CDP headless local para inspeção de erros         |   5    | Coleta de logs de console e falhas de rede via CDP sem abrir janelas. |
