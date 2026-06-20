const subscribers = new Set();
export const subscribe = (cb) => subscribers.add(cb);
export const unsubscribe = (cb) => subscribers.delete(cb);

const notify = () => {
  subscribers.forEach((cb) => cb(state));
};

let renderScheduled = false;
const scheduleNotify = () => {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    notify();
    renderScheduled = false;
  });
};

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
  currentTab: "dashboard",
  allEvents: [],
  selectedRepository: "All",
  searchQuery: "",
  groupBy: "None",
  historySearchQuery: "",
  appMode: "repositories",
  currentRepo: null,
  currentGroupKey: null,
  currentGroupVal: null,
  currentArtifact: null,
  activeTraceIndex: null,
  activeChartInstances: [],
  currentPage: 1,
  eventsPerPage: 25,
  timePeriod: (() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("defaultTimePeriod") || "month";
    }
    return "month";
  })(),
};

export const state = new Proxy(initialState, {
  set(target, prop, value) {
    if (target[prop] !== value) {
      target[prop] = value;
      scheduleNotify();
    }
    return true;
  },
});

export const actions = {
  setTimePeriod: (period) => { state.timePeriod = period; },
  setAppMode: (mode) => { state.appMode = mode; },
  setCurrentRepo: (repo) => { state.currentRepo = repo; },
  setCurrentArtifact: (artifact) => { state.currentArtifact = artifact; },
  setActiveTraceIndex: (index) => { state.activeTraceIndex = index; },
  setSearchQuery: (query) => { state.searchQuery = query; },
  setGroupBy: (group) => { state.groupBy = group; },
  setTheme: (isDark) => { state.isDarkMode = isDark; },
  setEvents: (events) => { state.allEvents = events; },
  setCurrentGroupVal: (val) => { state.currentGroupVal = val; },
  setCurrentGroupKey: (key) => { state.currentGroupKey = key; },
  setCurrentPage: (page) => { state.currentPage = page; }
};
