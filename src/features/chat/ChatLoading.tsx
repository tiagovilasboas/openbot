import { chatCopy } from "./chat-copy";

export function ChatLoading() {
  const content = chatCopy.pt;

  return (
    <div className="openbot-page" aria-busy="true">
      <header className="chat-header">
        <div className="header-content">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              O
            </span>
            <div>
              <p className="brand-name">{content.title}</p>
              <p className="brand-subtitle">{content.subtitle}</p>
            </div>
          </div>
          <span className="demo-status">
            <span className="status-dot" aria-hidden="true" />
            {content.demo}
          </span>
        </div>
      </header>

      <main className="conversation">
        <section className="welcome-state">
          <p className="welcome-kicker">OPEN BOT</p>
          <h1>Por onde começamos?</h1>
          <p className="welcome-copy">{content.intro}</p>
          <div className="suggestions" aria-label="Sugestões de mensagem">
            <button type="button" disabled>
              <span aria-hidden="true">◷</span>
              {content.prompt}
            </button>
            <button type="button" disabled>
              {content.sample}
            </button>
          </div>
        </section>
      </main>

      <footer className="composer-footer">
        <div className="composer-wrap">
          <div className="composer" aria-hidden="true">
            <span className="composer-placeholder">{content.placeholder}</span>
            <button className="loading-send-button" type="button" disabled>
              ↑
            </button>
          </div>
          <p className="composer-caption">
            A demonstração usa apenas respostas locais e dados fictícios.
          </p>
        </div>
      </footer>
    </div>
  );
}
