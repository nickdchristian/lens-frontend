import { LitElement, html } from "lit";
import { formatDate } from "../../utils/formatters.js";

export class LensRecentArtifacts extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      events: { type: Array },
    };
  }

  render() {
    const artifactEvents = (this.events || []).filter(
      (e) => e.artifact && e.artifact.name && e.artifact.version
    );

    const artifactMap = new Map();
    artifactEvents.forEach((e) => {
      const key = `${e.artifact.name}@${e.artifact.version}`;
      if (!artifactMap.has(key)) {
        artifactMap.set(key, {
          repo: e.repository,
          name: e.artifact.name,
          version: e.artifact.version,
          latestEvent: e,
        });
      } else {
        const existing = artifactMap.get(key);
        if (new Date(e.timestamp) > new Date(existing.latestEvent.timestamp)) {
          existing.latestEvent = e;
        }
      }
    });

    const recentArtifacts = Array.from(artifactMap.values())
      .sort(
        (a, b) =>
          new Date(b.latestEvent.timestamp) - new Date(a.latestEvent.timestamp)
      )
      .slice(0, 50);

    const rows = recentArtifacts.map((art) => {
      const dateStr = formatDate(art.latestEvent.timestamp);
      const stage = art.latestEvent.workflow_name || "Unknown";

      return html`
        <tr
          style="cursor: pointer;"
          class="hoverable-row"
          tabindex="0"
          role="button"
          @click=${() => {
            const url = `/artifacts/${encodeURIComponent(art.name)}/${encodeURIComponent(art.version)}`;
            window.history.pushState({}, "", url);
            window.dispatchEvent(new Event("popstate"));
          }}
          @keydown=${(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              const url = `/artifacts/${encodeURIComponent(art.name)}/${encodeURIComponent(art.version)}`;
              window.history.pushState({}, "", url);
              window.dispatchEvent(new Event("popstate"));
            }
          }}
        >
          <td>${art.repo}</td>
          <td style="font-weight: var(--font-semibold);">${art.name}</td>
          <td><span class="tag-pill">${art.version}</span></td>
          <td>${stage.replace(/_/g, " ")}</td>
          <td style="color: var(--text-secondary);">${dateStr}</td>
        </tr>
      `;
    });

    return html`
      <div
        class="table-container"
        style="grid-column: 1 / -1; margin-top: var(--space-4);"
      >
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align: left;">Repository</th>
              <th style="text-align: left;">Artifact</th>
              <th style="text-align: left;">Version</th>
              <th style="text-align: left;">Latest Stage</th>
              <th style="text-align: left;">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length > 0
              ? rows
              : html`<tr>
                  <td
                    colspan="5"
                    style="text-align: center; padding: var(--space-8); color: var(--text-secondary);"
                  >
                    No artifacts found.
                  </td>
                </tr>`}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define("lens-recent-artifacts", LensRecentArtifacts);
