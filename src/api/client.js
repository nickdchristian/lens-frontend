import { logger } from "../utils/logger.js";

let currentAbortController = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchEvents(repository = "lens") {
  // Cancel any pending request if a new one comes in
  if (currentAbortController) {
    currentAbortController.abort();
  }

  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  let attempt = 0;
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];

  while (attempt < maxAttempts) {
    try {
      const apiHost = localStorage.getItem("apiHost") || "";
      const baseUrl = apiHost ? apiHost.replace(/\/$/, "") : "";

      const url = repository
        ? `${baseUrl}/api/v1/events/${repository}?limit=1000&t=` + Date.now()
        : `${baseUrl}/api/v1/events?limit=3000&t=` + Date.now();

      const response = await fetch(url, { signal });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        logger.info("API request aborted", { repository });
        return { status: "aborted", events: [] };
      }

      logger.warn(`API fetch attempt ${attempt + 1} failed`, {
        error: error.message,
        repository,
      });

      attempt++;
      if (attempt >= maxAttempts) {
        logger.error("API fetch failed after max retries", {
          error: error.message,
          repository,
        });
        return { status: "error", events: [] };
      }

      await sleep(delays[attempt - 1]);
    }
  }
}

export async function fetchAggregatedMetrics(repository, metricKey, timePeriod, isSum) {
  try {
    const apiHost = localStorage.getItem("apiHost") || "";
    const baseUrl = apiHost ? apiHost.replace(/\/$/, "") : "";
    const url = `${baseUrl}/api/v1/events/${repository}/metrics/aggregated?metric_key=${metricKey}&time_period=${timePeriod}&is_sum=${isSum}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data.data || [];
  } catch (error) {
    logger.error("Error fetching aggregated metrics:", {
      error: error.message,
    });
    return [];
  }
}
