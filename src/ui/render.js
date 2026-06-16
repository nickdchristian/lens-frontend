function timeAgo(dateString) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export function createEventCard(event, index = 0) {
  // Determine badge color based on workflow name or status if available
  let badgeClass = "badge-success";
  if (
    event.workflow_name?.toLowerCase().includes("fail") ||
    event.workflow_name?.toLowerCase().includes("error")
  ) {
    badgeClass = "badge-error";
  } else if (
    event.workflow_name?.toLowerCase().includes("warn") ||
    event.workflow_name?.toLowerCase().includes("pending")
  ) {
    badgeClass = "badge-warning";
  }

  // Format timestamp relative to now
  const timestamp = timeAgo(event.timestamp);

  // Calculate staggered animation delay
  const animationDelay = Math.min(index * 0.05, 0.5);

  // Build the raw HTML string
  const html = `
    <div class="card flex justify-between items-center animate-slide-up" style="animation-delay: ${animationDelay}s" id="event-${event.id}">
      <div class="flex flex-col gap-sm">
        <div class="flex items-center gap-md">
          <span class="text-base font-semibold">${event.repository}</span>
          <span class="badge ${badgeClass}">${event.workflow_name || "Workflow"}</span>
        </div>
        <p class="text-sm font-mono text-tertiary">Commit: ${event.commit_sha ? event.commit_sha.substring(0, 7) : "Unknown"}</p>
      </div>
      <div class="text-sm text-secondary">
        ${timestamp}
      </div>
    </div>
  `;

  // Convert to DOM element safely
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

export function renderEvents(container, events) {
  container.innerHTML = ""; // Clear existing

  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="card flex justify-center items-center" style="opacity: 0.5;">
        <p class="text-sm text-secondary">No events found for this repository.</p>
      </div>
    `;
    return;
  }

  events.forEach((event, index) => {
    const cardNode = createEventCard(event, index);
    container.appendChild(cardNode);
  });
}

export function renderError(container, message) {
  container.innerHTML = `
    <div class="card flex flex-col gap-sm" style="border-color: var(--status-error);">
      <p class="text-base font-semibold text-error" style="color: var(--status-error);">Failed to load events</p>
      <p class="text-sm text-secondary">${message}</p>
    </div>
  `;
}

export function renderLoading(container) {
  container.innerHTML = `
    <div class="card flex justify-center items-center" style="opacity: 0.5;">
      <p class="text-sm text-secondary">Loading events...</p>
    </div>
  `;
}
