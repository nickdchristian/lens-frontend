import { LitElement, html } from "lit";
import {} from "../../state/store.js";
import { formatDate } from "../../utils/formatters.js";

export class LensHistoryTable extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      events: { type: Array },
      columns: { type: Array },
      currentPage: { type: Number },
      eventsPerPage: { type: Number },
      historySearchQuery: { type: String },
      isLocalPagination: { type: Boolean },
      hasNextPage: { type: Boolean },
      currentRepo: { type: String },
      expandedRowIndex: { type: Number },
    };
  }

  constructor() {
    super();
    this.expandedRowIndex = null;
  }

  willUpdate(changedProperties) {
    if (changedProperties.has("events")) {
      this.expandedRowIndex = null;
    }
  }

  toggleRow(index) {
    if (this.expandedRowIndex === index) {
      this.expandedRowIndex = null;
    } else {
      this.expandedRowIndex = index;
    }
  }

  renderEventDetails(event) {
    const isArtifactView = this.columns.includes("artifact");
    let customDataHtml = "";
    if (
      isArtifactView &&
      event.custom_data &&
      Object.keys(event.custom_data).length > 0
    ) {
      customDataHtml = Object.entries(event.custom_data)
        .filter(([k]) => !k.startsWith("_lens_"))
        .map(
          ([k, v]) =>
            html`<div class="data-row">
              <dt>${k}</dt>
              <dd>${JSON.stringify(v)}</dd>
            </div>`
        );
    }

    let tagsHtml = "";
    if (event.tags && Object.keys(event.tags).length > 0) {
      tagsHtml = Object.entries(event.tags)
        .filter(([k]) => !k.startsWith("_lens_"))
        .map(
          ([k, v]) =>
            html`<div class="data-row">
              <dt>${k}</dt>
              <dd>${v}</dd>
            </div>`
        );
    }

    let metricsHtml = "";
    if (
      !isArtifactView &&
      event.metrics &&
      Object.keys(event.metrics).length > 0
    ) {
      metricsHtml = Object.entries(event.metrics)
        .filter(([k]) => !k.startsWith("_lens_"))
        .map(
          ([k, v]) =>
            html`<div class="data-row">
              <dt>${k.replace(/_/g, " ")}</dt>
              <dd>${v}</dd>
            </div>`
        );
    }

    let artifactHtml = "";
    if (
      !isArtifactView &&
      event.artifact &&
      event.artifact.name &&
      event.artifact.version
    ) {
      artifactHtml = html`
        <div class="data-row">
          <dt>Name</dt>
          <dd>${event.artifact.name}</dd>
        </div>
        <div class="data-row">
          <dt>Version</dt>
          <dd>${event.artifact.version}</dd>
        </div>
      `;
    }

    const noData =
      !customDataHtml && !tagsHtml && !metricsHtml && !artifactHtml;

    return html`
      <tr class="grid-row-details">
        <td colspan="${this.columns.length + 1}">
          <div class="details-pane">
            <div class="details-grid">
              ${artifactHtml
                ? html`<div class="details-group">
                    <h4>Artifact</h4>
                    <dl class="data-list">${artifactHtml}</dl>
                  </div>`
                : ""}
              ${metricsHtml
                ? html`<div class="details-group">
                    <h4>Metrics</h4>
                    <dl class="data-list">${metricsHtml}</dl>
                  </div>`
                : ""}
              ${customDataHtml
                ? html`<div class="details-group">
                    <h4>Custom Data</h4>
                    <dl class="data-list">${customDataHtml}</dl>
                  </div>`
                : ""}
              ${tagsHtml
                ? html`<div class="details-group">
                    <h4>Tags</h4>
                    <dl class="data-list">${tagsHtml}</dl>
                  </div>`
                : ""}
              ${noData
                ? html`<div class="details-group">
                    <p style="color: var(--text-secondary);">
                      No additional metadata available.
                    </p>
                  </div>`
                : ""}
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  render() {
    return html`
      <div
        class="history-controls-wrapper"
        role="search"
        style="display: flex; gap: var(--space-4); align-items: center; margin-bottom: var(--space-4);"
      >
        <div class="search-container" style="flex: 1">
          <input
            type="text"
            id="history-search"
            class="lens-input lens-input-md"
            placeholder="Search ID, repository, commit, tags, or custom data..."
            aria-label="Search History"
            autocomplete="off"
            .value=${this.historySearchQuery}
            @input=${(e) => {
              if (this._searchTimeout) clearTimeout(this._searchTimeout);
              const val = e.target.value.toLowerCase();
              this._searchTimeout = setTimeout(() => {
                state.historySearchQuery = val;
                state.currentPage = 1;
              }, 300);
            }}
          />
        </div>
        <div
          id="pagination-controls"
          class="pagination-controls"
          role="navigation"
          aria-label="Pagination"
          style="margin: 0"
        >
          <div
            style="display: flex; gap: var(--space-4); align-items: center; justify-content: center; padding: var(--space-4);"
          >
            <button
              type="button"
              class="icon-btn"
              aria-label="Previous Page"
              ?disabled=${this.currentPage === 1}
              @click=${() => {
                if (this.currentPage > 1) {
                  state.currentPage = this.currentPage - 1;
                }
              }}
            >
              &larr; Prev
            </button>
            <span
              style="color: var(--text-secondary); font-size: 0.875rem;"
              aria-live="polite"
            >
              Page ${this.currentPage}
            </span>
            <button
              type="button"
              class="icon-btn"
              aria-label="Next Page"
              ?disabled=${!this.hasNextPage}
              @click=${() => {
                if (this.hasNextPage) {
                  state.currentPage = this.currentPage + 1;
                }
              }}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
      <div class="table-scroll-wrapper">
        <table id="data-table" class="data-table">
          <thead id="data-table-head">
            <tr>
              <th style="width: 30px;"></th>
              ${this.columns.map(
                (col) => html`<th>${col.replace(/_/g, " ")}</th>`
              )}
            </tr>
          </thead>
          <tbody id="data-table-body">
            ${!this.events || this.events.length === 0
              ? html`<tr>
                  <td
                    colspan="${this.columns.length + 1}"
                    style="text-align: center; padding: 2rem;"
                  >
                    No events found
                  </td>
                </tr>`
              : this.events.map((event, index) => {
                  const isExpanded = this.expandedRowIndex === index;
                  return html`
                    <tr
                      class="grid-row-master"
                      tabindex="0"
                      role="button"
                      aria-expanded="${isExpanded}"
                      @click=${() => this.toggleRow(index)}
                      @keydown=${(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          this.toggleRow(index);
                        }
                      }}
                    >
                      <td style="text-align: center;">
                        <span class="row-chevron"></span>
                      </td>
                      ${this.columns.map((col) => {
                        let val = event[col] ?? "-";
                        if (
                          col === "commit_sha" &&
                          typeof val === "string" &&
                          val.length > 7
                        ) {
                          val = val.substring(0, 7);
                        } else if (col === "timestamp") {
                          val = formatDate(val);
                        } else if (
                          col === "workflow_name" &&
                          typeof val === "string"
                        ) {
                          val = val.replace(/_/g, " ");
                        }

                        let cellContent = val;
                        if (col === "commit_sha" && val !== "-") {
                          cellContent = html`<span class="commit-pill"
                            >${val}</span
                          >`;
                        } else if (col === "workflow_name") {
                          cellContent = html`<span class="tag-pill"
                            >${val}</span
                          >`;
                        } else if (col === "artifact" && val && val !== "-") {
                          cellContent = html`<span style="font-weight: 600;"
                              >${val.name}</span
                            >
                            <span class="tag-pill">${val.version}</span>`;
                        }

                        if (col === "repository") {
                          const displayVal =
                            val !== "-" ? val.split("/").pop() : "-";
                          cellContent = displayVal;
                        }

                        return html`<td>${cellContent}</td>`;
                      })}
                    </tr>
                    ${isExpanded ? this.renderEventDetails(event) : ""}
                  `;
                })}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define("lens-history-table", LensHistoryTable);
