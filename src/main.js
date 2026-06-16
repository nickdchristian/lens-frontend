import "./styles/main.css";
import { api } from "./api/client.js";
import { renderEvents, renderError, renderLoading } from "./ui/render.js";

const REPOSITORY_NAME = "lens"; // Hardcoded for now, could be dynamic later
const eventContainer = document.getElementById("event-container");
const connectionStatus = document.getElementById("connection-status");

async function init() {
  // Check health status
  const isHealthy = await api.checkHealth();
  if (isHealthy) {
    connectionStatus.textContent = "Connected";
    connectionStatus.style.color = "var(--status-success)";
  } else {
    connectionStatus.textContent = "Offline";
    connectionStatus.style.color = "var(--status-error)";
  }

  // Load events
  renderLoading(eventContainer);
  try {
    const response = await api.getEvents(REPOSITORY_NAME);
    // The backend EventListResponse returns { status: "success", events: [...] }
    if (response && response.events) {
      renderEvents(eventContainer, response.events);
    } else {
      renderEvents(eventContainer, []);
    }
  } catch (error) {
    renderError(eventContainer, error.message);
  }
}

// Start the application
init();
