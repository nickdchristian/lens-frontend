import { state, subscribe } from "./store.js";

let isUpdatingHash = false;

export function updateHashFromState() {
  if (isUpdatingHash) return;
  isUpdatingHash = true;

  let hash = `#/${state.appMode}`;

  if (state.appMode === "artifacts") {
    if (state.currentArtifact) {
      hash += `/${encodeURIComponent(state.currentArtifact.name)}/${encodeURIComponent(state.currentArtifact.version)}`;
    }
  } else if (state.appMode === "repositories") {
    if (state.currentGroupKey && state.currentGroupVal) {
      hash += `/group/${encodeURIComponent(state.currentGroupKey)}/${encodeURIComponent(state.currentGroupVal)}`;
    }
    if (state.currentRepo) {
      hash += `/${encodeURIComponent(state.currentRepo)}`;
    }
  }

  if (window.location.hash !== hash) {
    // Use replaceState to avoid cluttering history when just clicking around normally?
    // Actually, pushState is better for back/forward support. But setting hash directly adds to history.
    window.location.hash = hash;
  }
  
  setTimeout(() => { isUpdatingHash = false; }, 0);
}

export function parseHashAndSetState() {
  if (isUpdatingHash) return;
  
  const hash = window.location.hash.slice(2); // remove "#/"
  if (!hash) {
    state.appMode = "repositories";
    return;
  }
  
  const parts = hash.split("/").map(decodeURIComponent);
  const mode = parts[0];
  
  if (mode === "artifacts" || mode === "repositories" || mode === "settings") {
    isUpdatingHash = true;

    state.appMode = mode;
    state.currentRepo = null;
    state.currentGroupVal = null;
    state.currentArtifact = null;
    
    if (mode === "artifacts") {
      if (parts.length >= 3) {
        state.currentArtifact = {
          name: parts[1],
          version: parts[2]
        };
      }
    } else if (mode === "repositories") {
      if (parts[1] === "group" && parts.length >= 4) {
        state.currentGroupKey = parts[2];
        state.currentGroupVal = parts[3];
        if (parts.length >= 5) {
          state.currentRepo = parts.slice(4).join("/");
        }
      } else if (parts.length >= 2) {
        state.currentRepo = parts.slice(1).join("/");
      }
    }

    // After setting state, manually ensure correct nav button is active
    const topNavBtns = document.querySelectorAll(".top-nav-btn");
    topNavBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    setTimeout(() => { isUpdatingHash = false; }, 0);
  }
}

export function initRouter() {
  window.addEventListener("hashchange", () => {
    parseHashAndSetState();
  });
  
  // Parse immediately
  parseHashAndSetState();
  
  // Listen to state changes to update URL
  subscribe(() => {
    updateHashFromState();
  });
}
