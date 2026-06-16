export const state = {
  repositories: {},
  groups: [],
  activeChartInstances: [],
  searchQuery: "",
  historySearchQuery: "",
  isDarkMode: localStorage.getItem("theme") === "dark",
  isLoggedIn: false,
  username: null,
  appMode: "repositories",
  allEvents: [],
};
