import { LitElement, html } from "lit";
import { state, StoreController } from "../../state/store.js";
import { applyTheme } from "../theme.js";
import { generateHighLevelReportHTML } from "../../utils/report-generator.js";
import { showToast } from "../toast.js";
import { logout } from "../../api/client.js";

export class LensSettings extends LitElement {
  static get properties() {
    return {
      activeGroup: { type: String },
      theme: { type: String },
      apiHost: { type: String },
      timeRange: { type: String },
      reportTimeRange: { type: String },
    };
  }

  constructor() {
    super();
    this.storeController = new StoreController(this);
    this.theme = localStorage.getItem("theme") || "system";
    this.apiHost = localStorage.getItem("apiHost") || "";
    this.timeRange = localStorage.getItem("defaultTimePeriod") || "month";
    this.reportTimeRange = localStorage.getItem("reportTimePeriod") || "month";
  }

  get activeGroup() {
    return state.settingsGroup;
  }

  createRenderRoot() {
    return this;
  }

  handleThemeChange(e) {
    this.theme = e.target.value;

    // Live preview
    let isDark;
    if (this.theme === "dark") {
      isDark = true;
    } else if (this.theme === "light") {
      isDark = false;
    } else {
      isDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    state.isDarkMode = isDark;
    applyTheme(isDark);
  }

  saveSettings() {
    // 1. Save theme
    localStorage.setItem("theme", this.theme);

    // 2. Save API host
    const host = this.apiHost.trim();
    if (host) {
      localStorage.setItem("apiHost", host);
    } else {
      localStorage.removeItem("apiHost");
    }

    // 3. Save default time range
    localStorage.setItem("defaultTimePeriod", this.timeRange);
    state.timePeriod = this.timeRange;

    // Save report time range
    localStorage.setItem("reportTimePeriod", this.reportTimeRange);

    // 4. Reload if API host changed, else go back to overview
    const currentHost = window.lensApiHost || "";
    if (currentHost !== host) {
      window.location.reload();
    } else {
      state.appMode = "repositories";
    }
  }

  generateReport() {
    if (!state.globalEvents || state.globalEvents.length === 0) {
      showToast("No data available to generate report", "error");
      return;
    }

    try {
      const htmlString = generateHighLevelReportHTML(
        state.globalEvents,
        state.availableMetrics,
        this.reportTimeRange
      );

      const reportWindow = window.open("", "_blank");
      if (reportWindow) {
        reportWindow.document.write(htmlString);
        reportWindow.document.close();
      } else {
        showToast(
          "Popup blocked. Please allow popups to view the report.",
          "error"
        );
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to generate report", "error");
    }
  }

  render() {
    return html`
      <div class="settings-header">
        <div class="content-header-title">
          <h2 id="settings-title" class="settings-title">Settings</h2>
        </div>
      </div>

      <div class="settings-container">
        <!-- Appearance Group -->
        <div
          class="settings-group"
          style="${this.activeGroup === "appearance" ? "" : "display: none;"}"
        >
          <h3>Appearance</h3>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <h4>Theme</h4>
                <p>Switch the user interface color scheme.</p>
              </div>
              <div class="setting-control">
                <select
                  id="theme-select"
                  class="lens-input setting-input"
                  @change=${this.handleThemeChange}
                  .value=${this.theme}
                >
                  <option value="system">System Default</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- System Group -->
        <div
          class="settings-group"
          style="${this.activeGroup === "system" ? "" : "display: none;"}"
        >
          <h3>System</h3>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <h4>API Host</h4>
                <p>Configure the backend API URL. Leave blank for default.</p>
              </div>
              <div class="setting-control">
                <input
                  type="text"
                  id="api-host-input"
                  class="lens-input setting-input"
                  placeholder="http://localhost:8000"
                  .value=${this.apiHost}
                  @input=${(e) => (this.apiHost = e.target.value)}
                />
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <h4>Default Time Range</h4>
                <p>Select the default time window for dashboard charts.</p>
              </div>
              <div class="setting-control">
                <select
                  id="time-range-select"
                  class="lens-input setting-input"
                  .value=${this.timeRange}
                  @change=${(e) => (this.timeRange = e.target.value)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Reports Group -->
        <div
          class="settings-group"
          style="${this.activeGroup === "reports" ? "" : "display: none;"}"
        >
          <h3>Reports & Export</h3>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <h4>Lens Summary Time Frame</h4>
                <p>
                  Select the time window for the generated Lens Summary report.
                </p>
              </div>
              <div class="setting-control">
                <select
                  id="report-time-range-select"
                  class="lens-input setting-input"
                  .value=${this.reportTimeRange}
                  @change=${(e) => (this.reportTimeRange = e.target.value)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h4>Lens Summary</h4>
                <p>
                  Generate a printable HTML Lens Summary of DORA metrics,
                  operational activity, and system abnormalities.
                </p>
              </div>
              <div class="setting-control">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click=${this.generateReport}
                  style="width: 100%;"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Account Group -->
        <div
          class="settings-group"
          style="${this.activeGroup === "account" ? "" : "display: none;"}"
        >
          <h3>Account</h3>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <h4>Logged In As</h4>
                <p>
                  ${state.currentUser
                    ? state.currentUser.name || state.currentUser.user
                    : "Not logged in"}
                </p>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h4>Session</h4>
                <p>Sign out of Lens telemetry.</p>
              </div>
              <div class="setting-control">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click=${async () => {
                    await logout();
                    window.location.reload();
                  }}
                  style="border-color: var(--danger-color, #dc2626); color: var(--danger-color, #dc2626); width: 100%;"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="action-bar">
          <button
            type="button"
            id="save-settings"
            class="btn btn-primary save-button"
            @click=${this.saveSettings}
          >
            Save Changes
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define("lens-settings", LensSettings);
