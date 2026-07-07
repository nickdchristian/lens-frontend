import { LitElement, html, css } from "lit";

export class LensLogin extends LitElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        width: 100%;
        background: linear-gradient(135deg, var(--bg-color), var(--hover-bg));
        font-family: "Inter", system-ui, sans-serif;
      }
      .login-card {
        background: var(--card-bg);
        padding: 4rem 3rem;
        border-radius: var(--radius-lg);
        box-shadow:
          var(--shadow-lg),
          0 20px 40px rgba(0, 0, 0, 0.04);
        text-align: center;
        max-width: 380px;
        width: 90%;
        border: 1px solid var(--border-color);
        position: relative;
        overflow: hidden;
      }
      .login-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: linear-gradient(
          90deg,
          var(--theme-primary),
          var(--theme-accent)
        );
      }
      h1 {
        margin: 0 0 2.5rem 0;
        font-family: "DM Sans", system-ui, sans-serif;
        font-size: 3.25rem;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -2px;
      }
      .login-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        background: var(--theme-primary);
        color: white;
        text-decoration: none;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        font-weight: 500;
        font-size: 1rem;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        cursor: pointer;
        width: 100%;
        box-sizing: border-box;
      }
      .login-btn:hover {
        filter: brightness(1.1);
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(37, 99, 235, 0.15);
      }
      .login-btn svg {
        width: 20px;
        height: 20px;
      }
    `;
  }

  render() {
    const apiHost = localStorage.getItem("apiHost") || "";
    let loginUrl = "/api/v1/auth/login";
    if (apiHost) {
      try {
        const url = new URL(apiHost);
        loginUrl = `${url.origin}/api/v1/auth/login`;
      } catch {
        loginUrl = `${apiHost.replace(/\/$/, "")}/api/v1/auth/login`;
      }
    }

    return html`
      <div class="login-card">
        <h1>Lens.</h1>
        <a href="${loginUrl}" class="login-btn" data-native>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          Login with SSO
        </a>
      </div>
    `;
  }
}

customElements.define("lens-login", LensLogin);
