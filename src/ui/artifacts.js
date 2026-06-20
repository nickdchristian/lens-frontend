import { html, render } from "lit";
import { state, actions } from "../state/store.js";
import { DOM } from "./dom.js";
import { getAccentColor } from "./theme.js";
import { formatDictionary, formatDate } from "../utils/formatters.js";

const getEmptyPanelHtml = () => html`
  <div
    style="text-align: center; margin-top: 3rem; color: var(--text-secondary);"
  >
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      stroke="currentColor"
      stroke-width="1.5"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
      style="margin-bottom: 1rem; opacity: 0.5;"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
    <p style="margin: 0; font-size: 0.95rem;">
      Select an artifact node above to view its trace details.
    </p>
  </div>
`;

window.selectTraceNode = function (index) {
  if (!window.currentTraceEvents || !window.currentTraceEvents[index]) return;
  const isCurrentlyActive = state.activeTraceIndex === index;
  actions.setActiveTraceIndex(isCurrentlyActive ? null : index);
};

export function renderArtifactTrace(artifactObj) {
  if (!DOM.traceTimeline) return;

  if (DOM.traceDetails) DOM.traceDetails.style.display = "none";

  const matches = state.allEvents.filter(
    (e) =>
      e.artifact &&
      e.artifact.name === artifactObj.name &&
      e.artifact.version === artifactObj.version
  );

  if (matches.length === 0) {
    const emptyTemplate = html`<div class="empty-state">
      <p>
        No lifecycle events found for artifact "<strong
          >${artifactObj.name} (${artifactObj.version})</strong
        >".
      </p>
    </div>`;
    render(emptyTemplate, DOM.traceTimeline);
    return;
  }

  matches.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const traceNodes = matches.map((event, index) => {
    const stage = event.workflow_name || "Unknown Workflow";
    const dateStr = formatDate(event.timestamp);
    const colorIdx = index % 10;
    const accentColor = getAccentColor(colorIdx);
    const isLast = index === matches.length - 1;
    const isActive = state.activeTraceIndex === index;

    return html`
      <div class="trace-timeline-item" style="--node-accent: ${accentColor}">
        <div class="trace-timeline-track">
          <div class="trace-timeline-circle"></div>
          ${!isLast ? html`<div class="trace-timeline-line"></div>` : ""}
        </div>
        <div
          class="trace-node node-dynamic ${isActive ? "active-node" : ""}"
          @click=${() => window.selectTraceNode(index)}
          id="trace-node-${index}"
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

  window.currentTraceEvents = matches;
  render(traceNodes, DOM.traceTimeline);

  if (matches.length > 0 && DOM.traceDetails && DOM.panelTitle && DOM.panelBody) {
    if (state.activeTraceIndex !== null && matches[state.activeTraceIndex]) {
      const event = matches[state.activeTraceIndex];
      DOM.panelTitle.textContent = `${event.repository} (${event.workflow_name || "Workflow"})`;

      let contentHtml = html`
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
          <div class="details-section">
            <h4 style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Tags</h4>
            ${formatDictionary(event.tags)}
          </div>
          <div class="details-section">
            <h4 style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Custom Data</h4>
            ${formatDictionary(event.custom_data)}
          </div>
          <div class="details-section">
            <h4 style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Metrics</h4>
            ${formatDictionary(event.metrics)}
          </div>
        </div>
      `;
      render(contentHtml, DOM.panelBody);
    } else {
      DOM.panelTitle.textContent = "Event Details";
      render(getEmptyPanelHtml(), DOM.panelBody);
    }
    DOM.traceDetails.style.display = "flex";
  }
}
