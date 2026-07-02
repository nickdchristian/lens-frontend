export function showToast(message, type = "error") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");

  const span = document.createElement("span");
  span.textContent = message;
  toast.appendChild(span);

  container.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.classList.add("toast-hiding");
    toast.addEventListener("animationend", () => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    });
  }, 5000);
}
