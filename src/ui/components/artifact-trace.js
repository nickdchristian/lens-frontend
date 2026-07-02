import { LitElement, html, css, unsafeCSS } from "lit";
import globalStyles from "../../style.css?inline";
import componentStyles from "../../styles/components.css?inline";
import { formatDictionary, formatDate } from "../../utils/formatters.js";
import { getAccentColor } from "../theme.js";

export class LensArtifactTrace extends LitElement {
  static get properties() {
    return {
      events: { type: Array },
      artifactObj: { type: Object },
      activeTraceIndex: { type: Number },
    };
  }

  static get styles() {
    return [
      unsafeCSS(globalStyles),
      unsafeCSS(componentStyles),
      css`
        * {
          box-sizing: border-box;
        }
        .container {
          display: flex;
          justify-content: center;
          gap: 2rem;
          align-items: flex-start;
          padding: 1rem 0;
        }
        .timeline {
          flex: 0 1 550px;
          min-width: 300px;
          position: relative;
          padding: 1rem;
        }
        .details-panel {
          flex: 1;
          max-width: 800px;
          min-width: 450px;
          position: sticky;
          top: 100px;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        @media (max-width: 1024px) {
          .container {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .timeline {
            flex: none;
            width: 100%;
            min-width: 0;
          }

          .details-panel {
            flex: none;
            max-width: 100%;
            min-width: 0;
            position: sticky;
            bottom: 0;
            z-index: 100;
            max-height: 50vh;
            overflow-y: auto;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
          }
        }
        .panel-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          background: var(--details-bg);
          border-top-left-radius: var(--radius-lg);
          border-top-right-radius: var(--radius-lg);
        }
        .panel-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .panel-body {
          padding: 1.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        /* Trace Timeline Items */
        .trace-timeline-item {
          display: flex;
          position: relative;
          padding-bottom: 24px;
        }
        .trace-timeline-track {
          position: relative;
          margin-right: 20px;
          width: 16px;
        }
        .trace-timeline-circle {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: var(--node-accent, var(--border-color));
          border: 3px solid var(--card-bg);
          box-shadow: 0 0 0 1px var(--border-color);
          z-index: 2;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }
        .trace-timeline-line {
          position: absolute;
          top: 16px;
          bottom: -24px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          background-color: var(--border-color);
          z-index: 1;
        }

        .trace-node {
          flex: 1;
          background: var(--card-bg);
          border: 1px solid var(--node-accent, var(--theme-primary));
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .trace-node:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        .active-node {
          border: 2px solid var(--node-accent, var(--theme-primary));
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .trace-node-header {
          font-weight: 600;
          font-size: 1rem;
          padding: 12px 16px;
          background: color-mix(
            in srgb,
            var(--node-accent, var(--theme-primary)) 12%,
            transparent
          );
          border-bottom: 1px solid
            color-mix(
              in srgb,
              var(--node-accent, var(--theme-primary)) 20%,
              var(--border-color)
            );
          color: var(--text-primary);
          text-transform: capitalize;
          transition:
            background 0.2s ease,
            color 0.2s ease;
        }
        .trace-node-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .trace-footer-text {
          font-size: 0.85rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .divider {
          color: var(--border-color);
        }

        /* Trace Details */
        .trace-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }
        .details-section h4 {
          margin: 0;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }
        .empty-panel-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 250px;
          text-align: center;
          color: var(--text-secondary);
        }
        .empty-panel-icon {
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        .trace-duration-box {
          margin-top: 2rem;
          background: var(--details-bg);
          padding: 1rem 1.5rem;
          border-radius: var(--radius-md);
          display: inline-flex;
          align-items: center;
          gap: 2rem;
          text-align: left;
          border: 1px solid var(--border-color);
        }
        .trace-duration-label {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .trace-duration-value {
          margin: 0.25rem 0 0 0;
          font-size: 0.95rem;
          color: var(--text-secondary);
        }
        .trace-duration-divider {
          width: 1px;
          height: 40px;
          background: var(--border-color);
        }
      `,
    ];
  }

  constructor() {
    super();
    this.events = [];
    this.activeTraceIndex = null;
    this.artifactObj = null;
  }

  get matches() {
    if (!this.artifactObj) return [];
    return this.events
      .filter((e) => {
        if (!e.artifact) return false;
        const eName = String(e.artifact.name);
        const eVersion = String(e.artifact.version);
        const oName = String(this.artifactObj.name);
        const oVersion = String(this.artifactObj.version);
        // Use decodeURIComponent on the event just in case, or allow partial matches
        try {
          return (
            decodeURIComponent(eName) === decodeURIComponent(oName) &&
            decodeURIComponent(eVersion) === decodeURIComponent(oVersion)
          );
        } catch {
          return eName === oName && eVersion === oVersion;
        }
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  handleNodeClick(index) {
    this.dispatchEvent(new CustomEvent("node-click", { detail: { index } }));
  }

  getEmptyPanelHtml(matches) {
    let timeHtml = "";
    if (matches && matches.length > 0) {
      const firstDate = new Date(matches[0].timestamp);
      const lastDate = new Date(matches[matches.length - 1].timestamp);
      const elapsedMs = lastDate - firstDate;
      const diffSecs = Math.floor(elapsedMs / 1000);
      const days = Math.floor(diffSecs / 86400);
      const hours = Math.floor((diffSecs % 86400) / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);

      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (mins > 0) parts.push(`${mins}m`);
      if (parts.length === 0) parts.push(`< 1m`);
      const timeStr = parts.join(" ");

      timeHtml = html`
        <div class="trace-duration-box">
          <div>
            <p class="trace-duration-label">Total Duration</p>
            <p class="trace-duration-value">${timeStr}</p>
          </div>
          <div class="trace-duration-divider"></div>
          <div>
            <p
              style="margin: 0; font-size: 0.85rem; color: var(--text-primary);"
            >
              <span style="color: var(--text-secondary); margin-right: 0.5rem;"
                >First:</span
              >${formatDate(matches[0].timestamp)}
            </p>
            <p
              style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--text-primary);"
            >
              <span style="color: var(--text-secondary); margin-right: 0.5rem;"
                >Last:</span
              >${formatDate(matches[matches.length - 1].timestamp)}
            </p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="empty-panel-container">
        <svg
          class="empty-panel-icon"
          viewBox="0 0 24 24"
          width="32"
          height="32"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <p style="margin: 0; font-size: 0.95rem;">
          Select an artifact node to view its trace details.
        </p>
        ${timeHtml}
      </div>
    `;
  }

  renderDetailsPanel(matches) {
    if (matches.length === 0) return "";

    let title = "Event Details";
    let body = this.getEmptyPanelHtml(matches);

    if (this.activeTraceIndex !== null && matches[this.activeTraceIndex]) {
      const event = matches[this.activeTraceIndex];
      title = `${event.repository} (${event.workflow_name || "Workflow"})`;

      body = html`
        <div class="trace-details-grid">
          <div class="details-section">
            <h4>Tags</h4>
            ${formatDictionary(event.tags)}
          </div>
          <div class="details-section">
            <h4>Custom Data</h4>
            ${formatDictionary(event.custom_data)}
          </div>
          <div class="details-section">
            <h4>Metrics</h4>
            ${formatDictionary(event.metrics)}
          </div>
        </div>
      `;
    }

    return html`
      <div class="details-panel">
        <div class="panel-header">
          <h3>${title}</h3>
        </div>
        <div class="panel-body">${body}</div>
      </div>
    `;
  }

  render() {
    const matches = this.matches;

    if (matches.length === 0) {
      return html`
        <div class="empty-state">
          <p>
            No lifecycle events found for artifact "<strong
              >${this.artifactObj?.name} (${this.artifactObj?.version})</strong
            >".
          </p>
        </div>
      `;
    }

    const traceNodes = matches.map((event, index) => {
      const stage = event.workflow_name || "Unknown Workflow";
      const dateStr = formatDate(event.timestamp);
      const colorIdx = index % 10;
      const accentColor = getAccentColor(colorIdx);
      const isLast = index === matches.length - 1;
      const isActive = this.activeTraceIndex === index;

      return html`
        <div
          class="trace-timeline-item"
          role="listitem"
          style="--node-accent: ${accentColor}"
        >
          <div class="trace-timeline-track">
            <div class="trace-timeline-circle"></div>
            ${!isLast ? html`<div class="trace-timeline-line"></div>` : ""}
          </div>
          <div
            class="trace-node ${isActive ? "active-node" : ""}"
            tabindex="0"
            role="button"
            aria-expanded="${isActive}"
            aria-controls="trace-details-panel"
            @click=${() => this.handleNodeClick(index)}
            @keydown=${(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.handleNodeClick(index);
              }
            }}
          >
            <div class="trace-node-header">${stage.replace(/_/g, " ")}</div>
            <div class="trace-node-body">
              <div class="trace-footer-text">
                <span>Repo: ${event.repository}</span>
                <span class="divider">|</span>
                <span>Time: ${dateStr}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    return html`
      <div class="container">
        <div
          class="timeline"
          role="list"
          aria-label="Artifact Lifecycle Events"
        >
          ${traceNodes}
        </div>
        ${this.renderDetailsPanel(matches)}
      </div>
    `;
  }
}
customElements.define("lens-artifact-trace", LensArtifactTrace);
