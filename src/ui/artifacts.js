import { html, render } from "lit";
import { state } from "../state/store.js";
import { DOM } from "./dom.js";
import { getAccentColor } from "./theme.js";
import { formatDictionary } from "../utils/formatters.js";

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

  const activeNode = document.getElementById(`trace-node-${index}`);
  const isActive = activeNode && activeNode.classList.contains("active-node");

  if (!DOM.traceDetails || !DOM.panelTitle || !DOM.panelBody) return;

  document
    .querySelectorAll(".trace-node")
    .forEach((node) => node.classList.remove("active-node"));

  if (isActive) {
    DOM.panelTitle.textContent = "Event Details";
    render(getEmptyPanelHtml(), DOM.panelBody);
    return;
  }

  if (activeNode) activeNode.classList.add("active-node");

  const event = window.currentTraceEvents[index];
  DOM.panelTitle.textContent = `Details: ${event.repository} (${event.workflow_name || "Workflow"})`;

  let contentHtml = html`
    <div
      style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;"
    >
      <div class="details-section">
        <h4
          style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"
        >
          Tags
        </h4>
        ${formatDictionary(event.tags)}
      </div>
      <div class="details-section">
        <h4
          style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"
        >
          Custom Data
        </h4>
        ${formatDictionary(event.custom_data)}
      </div>
      <div class="details-section">
        <h4
          style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"
        >
          Metrics
        </h4>
        ${formatDictionary(event.metrics)}
      </div>
    </div>
  `;

  render(contentHtml, DOM.panelBody);
  DOM.traceDetails.style.display = "flex";
};

export function renderArtifactTrace(versionQuery) {
  if (!DOM.traceTimeline) return;

  if (DOM.traceDetails) DOM.traceDetails.style.display = "none";

  const matches = state.allEvents.filter(
    (e) =>
      e.artifact_version &&
      e.artifact_version.toLowerCase() === versionQuery.toLowerCase()
  );

  if (matches.length === 0) {
    const emptyTemplate = html`<div class="empty-state">
      <p>
        No lifecycle events found for version
        "<strong>${versionQuery}</strong>".
      </p>
    </div>`;
    render(emptyTemplate, DOM.traceTimeline);
    return;
  }

  matches.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const traceNodes = matches.map((event, index) => {
    let stage = event.workflow_name;
    if (event.custom_data && event.custom_data.lifecycle_stage) {
      stage = event.custom_data.lifecycle_stage;
    }

    const dateStr = new Date(event.timestamp).toLocaleString();

    let hash = 0;
    for (let i = 0; i < stage.length; i++) {
      hash = stage.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIdx = Math.abs(hash) % 10;
    const accentColor = getAccentColor(colorIdx);

    const isLast = index === matches.length - 1;

    return html`
      <div
        class="trace-node node-dynamic"
        @click=${() => window.selectTraceNode(index)}
        id="trace-node-${index}"
        style="--node-accent: ${accentColor}"
      >
        <div class="trace-node-header">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${stage.replace(/_/g, " ")}
        </div>
        <div class="trace-node-body">
          <div class="trace-repo-name">${event.repository}</div>
          <div class="trace-time">${dateStr}</div>
        </div>
      </div>
      ${!isLast
        ? html`
            <div class="trace-connector">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          `
        : ""}
    `;
  });

  window.currentTraceEvents = matches;
  render(traceNodes, DOM.traceTimeline);

  if (
    matches.length > 0 &&
    DOM.traceDetails &&
    DOM.panelTitle &&
    DOM.panelBody
  ) {
    DOM.panelTitle.textContent = "Event Details";
    render(getEmptyPanelHtml(), DOM.panelBody);
    DOM.traceDetails.style.display = "flex";
  }
}
