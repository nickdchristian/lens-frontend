import { LitElement, html } from "lit";

export class LensMetadataPanel extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      metadata: { type: Object },
      isLoading: { type: Boolean },
    };
  }

  render() {
    if (!this.metadata) return html``;

    const tags = this.metadata.tags || {};
    const customData = this.metadata.custom_data || {};

    const tagsList = Object.entries(tags)
      .filter(([k]) => !k.startsWith("_lens_"))
      .map(
        ([k, v]) =>
          html`<li>
            <span class="key">${k}</span>: <span class="val">${v}</span>
          </li>`
      );

    const dataList = Object.entries(customData)
      .filter(([k]) => !k.startsWith("_lens_"))
      .map(
        ([k, v]) =>
          html`<li>
            <span class="key">${k}</span>:
            <span class="val">${JSON.stringify(v)}</span>
          </li>`
      );

    if (tagsList.length === 0 && dataList.length === 0) {
      return html``;
    }

    return html`
      <div
        class="metadata-grid"
        style="${this.isLoading
          ? "opacity: 0.5; pointer-events: none; transition: opacity 0.2s ease-in-out;"
          : "opacity: 1; transition: opacity 0.2s ease-in-out;"}"
      >
        ${tagsList.length > 0
          ? html`
              <div class="metadata-card">
                <h3>Tags</h3>
                <ul class="metadata-list">
                  ${tagsList}
                </ul>
              </div>
            `
          : ""}
        ${dataList.length > 0
          ? html`
              <div class="metadata-card">
                <h3>Data</h3>
                <ul class="metadata-list">
                  ${dataList}
                </ul>
              </div>
            `
          : ""}
      </div>
    `;
  }
}

customElements.define("lens-metadata-panel", LensMetadataPanel);
