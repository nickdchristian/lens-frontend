export const DOM = {
  sidebarList: null,
  groupControl: null,
  optionsContainer: null,
  searchInput: null,
  historySearch: null,
  themeToggle: null,
  apiKeyInput: null,
  viewTitle: null,
  viewSubtitle: null,
  overviewBtn: null,
  editModal: null,
  traceTimeline: null,
  traceDetails: null,
  panelTitle: null,
  panelBody: null,

  // Dashboard & Navigation
  tabOverview: null,
  tabHistory: null,
  tabArtifact: null,
  tabSettings: null,
  viewHeader: null,

  // Settings
  settingsBtn: null,
  saveSettings: null,
  themeSelect: null,
  apiHostInput: null,

  // Table
  dataTableHead: null,
  dataTableBody: null,
  paginationControls: null,

  // Sidebar navigation sections
  sidebarNavRepo: null,
  sidebarNavArtifacts: null,
  sidebarNavSettings: null,
  sidebarSectionTitle: null,
};

export function initDOM() {
  DOM.sidebarList = document.getElementById("sidebar-list");
  DOM.groupControl = document.getElementById("sidebar-group-control");
  DOM.optionsContainer = document.getElementById("group-options-container");
  DOM.searchInput = document.getElementById("search-input");
  DOM.historySearch = document.getElementById("history-search");
  DOM.themeToggle = document.getElementById("theme-toggle");
  DOM.apiKeyInput = document.getElementById("api-key-input");
  DOM.viewTitle = document.getElementById("view-title");
  DOM.viewSubtitle = document.getElementById("view-subtitle");
  DOM.overviewBtn = document.querySelector('.tab-btn[data-tab="overview"]');
  DOM.editModal = document.getElementById("edit-modal");
  DOM.traceTimeline = document.getElementById("artifact-trace-timeline");
  DOM.traceDetails = document.getElementById("trace-details-panel");
  DOM.panelTitle = document.getElementById("panel-title");
  DOM.panelBody = document.getElementById("panel-body");

  DOM.tabOverview = document.getElementById("tab-overview");
  DOM.tabHistory = document.getElementById("tab-history");
  DOM.tabArtifact = document.getElementById("tab-artifact-trace");
  DOM.tabSettings = document.getElementById("tab-settings");
  DOM.viewHeader = document.querySelector(".content-header");

  DOM.settingsBtn = document.getElementById("settings-btn");
  DOM.saveSettings = document.getElementById("save-settings");
  DOM.themeSelect = document.getElementById("theme-select");
  DOM.apiHostInput = document.getElementById("api-host-input");
  DOM.timeRangeSelect = document.getElementById("time-range-select");

  DOM.dataTableHead = document.getElementById("data-table-head");
  DOM.dataTableBody = document.getElementById("data-table-body");
  DOM.paginationControls = document.getElementById("pagination-controls");

  DOM.chartModal = document.getElementById("chart-modal");
  DOM.closeChartModalBtn = document.getElementById("close-chart-modal-btn");
  DOM.modalChartTitle = document.getElementById("modal-chart-title");
  DOM.expandedChartCanvas = document.getElementById("expanded-chart-canvas");

  DOM.sidebarNavRepo = document.getElementById("sidebar-nav-dashboard");
  DOM.sidebarNavArtifacts = document.getElementById("sidebar-nav-artifacts");
  DOM.sidebarNavSettings = document.getElementById("sidebar-nav-settings");
  DOM.sidebarSectionTitle = document.getElementById("sidebar-section-title");
}
