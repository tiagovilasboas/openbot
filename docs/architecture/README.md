# Architecture principles

OpenBot follows **Screaming Architecture**, **Dependency Rule**, **SRP**, and **Clean Code**.

- **[Camadas e Estrutura do Sistema](layers.md):** Mapa completo das 4 camadas (Apresentação, Aplicação, Domínio e Infraestrutura/Adaptadores).
- **[Contrato de Portas de Entrega](delivery-gates.md):** Git hooks versionados, checks de qualidade estáticos e CI gate para o repositório.
- **[Especificação do MVP](mvp.md):** Escopo inicial e contratos de leitura para desenvolvedores.

## Princípios Arquiteturais

- **Screaming Architecture:** Organização dos módulos pelo domínio de negócio (`src/features/*`), não por convenções de framework.
- **Dependency Rule:** Dependências sempre apontam para dentro. O domínio e os contratos são independentes de detalhes externos.
- **Clean Code & SRP:** Módulos pequenos, responsabilidades coesas e limite rígido de ~300 linhas por arquivo.
- **Adapters Isolados:** Provedores de modelo (OpenRouter, Ollama, Anthropic), APIs externas (GitHub) e armazenamento são isolados atrás de interfaces tipadas com suporte a failover automático.
