const subscribers = new Set();
export const subscribe = (cb) => {
  subscribers.add(cb);
  return () => unsubscribe(cb);
};
export const unsubscribe = (cb) => subscribers.delete(cb);

const notify = () => {
  subscribers.forEach((cb) => {
    try {
      cb(state);
    } catch (error) {
      console.error("Subscriber error:", error);
    }
  });
};

let renderScheduled = false;
const scheduleNotify = () => {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    try {
      notify();
    } finally {
      renderScheduled = false;
    }
  });
};

/**
 * @typedef {import('../api/client.js').LensEvent} LensEvent
 */

/**
 * @typedef {Object} AppState
 * @property {boolean} isDarkMode
 * @property {string} apiHost
 * @property {string} currentTab
 * @property {LensEvent[]} allEvents
 * @property {string} selectedRepository
 * @property {string} searchQuery
 * @property {string} groupBy
 * @property {string} historySearchQuery
 * @property {string} appMode
 * @property {string} settingsGroup
 * @property {string|null} currentRepo
 * @property {string|null} currentGroupKey
 * @property {string|null} currentGroupVal
 * @property {Object|null} currentArtifact
 * @property {number|null} activeTraceIndex
 * @property {Object[]} activeChartInstances
 * @property {number} currentPage
 * @property {number} eventsPerPage
 * @property {string} timePeriod
 * @property {boolean} isLoading
 * @property {boolean} isSidebarOpen
 */

let initialParams = null;
if (typeof window !== "undefined") {
  initialParams = new URLSearchParams(window.location.search);
}

/** @type {AppState} */
const initialState = {
  isDarkMode: (() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }
    return false;
  })(),
  apiHost:
    typeof window !== "undefined" ? localStorage.getItem("apiHost") || "" : "",
  currentTab: "overview",
  allEvents: [],
  globalEvents: [],
  selectedRepository: "",
  searchQuery: initialParams?.get("search") || "",
  groupBy: "none",
  historySearchQuery: initialParams?.get("hSearch") || "",
  appMode: initialParams?.get("mode") || "repositories",
  settingsGroup: "appearance",
  currentRepo: initialParams?.get("repo") || null,
  currentGroupKey: initialParams?.get("groupKey") || null,
  currentGroupVal: initialParams?.get("groupVal") || null,
  currentArtifact: initialParams?.get("artifactName") ? {
    name: initialParams.get("artifactName"),
    version: initialParams.get("artifactVersion") || null
  } : null,
  activeTraceIndex: null,
  activeChartInstances: [],
  currentPage: parseInt(initialParams?.get("page") || "1", 10),
  eventsPerPage: 25,
  isSidebarOpen: false,
  timePeriod: (() => {
    const fromUrl = initialParams?.get("time");
    if (fromUrl) return fromUrl;
    if (typeof window !== "undefined") {
      return localStorage.getItem("defaultTimePeriod") || "month";
    }
    return "month";
  })(),
  isLoading: false,
  hasFetchedGlobalEvents: false,
  repositories: [],
  availableMetrics: [],
};

export const syncStateToUrl = () => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  
  params.set("mode", state.appMode);
  if (state.currentRepo) params.set("repo", state.currentRepo);
  if (state.currentGroupKey) params.set("groupKey", state.currentGroupKey);
  if (state.currentGroupVal) params.set("groupVal", state.currentGroupVal);
  
  if (state.currentArtifact) {
    params.set("artifactName", state.currentArtifact.name);
    if (state.currentArtifact.version) {
      params.set("artifactVersion", state.currentArtifact.version);
    }
  }
  
  if (state.timePeriod && state.timePeriod !== "month") params.set("time", state.timePeriod);
  if (state.searchQuery) params.set("search", state.searchQuery);
  if (state.historySearchQuery) params.set("hSearch", state.historySearchQuery);
  if (state.currentPage > 1) params.set("page", state.currentPage.toString());
  
  const searchString = params.toString();
  const newUrl = window.location.pathname + (searchString ? `?${searchString}` : "");
  
  if (newUrl !== window.location.pathname + window.location.search) {
    window.history.replaceState(null, "", newUrl);
  }
};

export const syncUrlToState = () => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  
  state.appMode = params.get("mode") || "repositories";
  state.currentRepo = params.get("repo") || null;
  state.currentGroupKey = params.get("groupKey") || null;
  state.currentGroupVal = params.get("groupVal") || null;
  
  const artifactName = params.get("artifactName");
  if (artifactName) {
    state.currentArtifact = {
      name: artifactName,
      version: params.get("artifactVersion") || null
    };
  } else {
    state.currentArtifact = null;
  }
  
  state.timePeriod = params.get("time") || localStorage.getItem("defaultTimePeriod") || "month";
  state.searchQuery = params.get("search") || "";
  state.historySearchQuery = params.get("hSearch") || "";
  state.currentPage = parseInt(params.get("page") || "1", 10);
};

export const createUrl = (overrides = {}) => {
  if (typeof window === "undefined") return "?";
  const params = new URLSearchParams();
  
  const mode = overrides.mode !== undefined ? overrides.mode : state.appMode;
  params.set("mode", mode);
  
  // If we change mode to artifacts, clear repo/groups unless specified
  const repo = overrides.repo !== undefined ? overrides.repo : (mode === state.appMode ? state.currentRepo : null);
  if (repo) params.set("repo", repo);
  
  const groupKey = overrides.groupKey !== undefined ? overrides.groupKey : (mode === state.appMode ? state.currentGroupKey : null);
  if (groupKey) params.set("groupKey", groupKey);
  
  const groupVal = overrides.groupVal !== undefined ? overrides.groupVal : (mode === state.appMode ? state.currentGroupVal : null);
  if (groupVal) params.set("groupVal", groupVal);
  
  const artifactName = overrides.artifactName !== undefined ? overrides.artifactName : (mode === state.appMode ? state.currentArtifact?.name : null);
  if (artifactName) {
    params.set("artifactName", artifactName);
    const artifactVersion = overrides.artifactVersion !== undefined ? overrides.artifactVersion : (mode === state.appMode ? state.currentArtifact?.version : null);
    if (artifactVersion) params.set("artifactVersion", artifactVersion);
  }
  
  const time = overrides.time !== undefined ? overrides.time : state.timePeriod;
  if (time && time !== "month") params.set("time", time);
  
  const search = overrides.search !== undefined ? overrides.search : state.searchQuery;
  if (search) params.set("search", search);
  
  const hSearch = overrides.hSearch !== undefined ? overrides.hSearch : state.historySearchQuery;
  if (hSearch) params.set("hSearch", hSearch);
  
  const page = overrides.page !== undefined ? overrides.page : state.currentPage;
  if (page > 1) params.set("page", page.toString());
  
  const searchString = params.toString();
  return searchString ? `?${searchString}` : "?";
};

if (typeof window !== "undefined") {
  window.addEventListener("popstate", syncUrlToState);
}

export const state = new Proxy(initialState, {
  set(target, prop, value) {
    if (target[prop] !== value) {
      target[prop] = value;
      scheduleNotify();
      // Sync URL on next tick to batch changes
      setTimeout(syncStateToUrl, 0);
    }
    return true;
  },
});

export class StoreController {
  constructor(host) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    this.unsubscribe = subscribe(() => {
      this.host.requestUpdate();
    });
  }

  hostDisconnected() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
