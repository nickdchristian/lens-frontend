import { logger } from "../utils/logger.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let currentAbortController = null;

function getSafeBaseUrl() {
  const apiHost = localStorage.getItem("apiHost") || import.meta.env.VITE_API_BASE_URL || "";
  if (!apiHost) return "";

  if (apiHost.startsWith("http://") || apiHost.startsWith("https://")) {
    try {
      const parsed = new URL(apiHost);
      // Enforce HTTPS in production
      if (import.meta.env.PROD && parsed.protocol === "http:") {
        logger.error("HTTP protocol is forbidden in production API requests");
        return "";
      }
      return apiHost.replace(/\/$/, "");
    } catch {
      logger.warn("Invalid API Host URL structure");
      return "";
    }
  }

  if (apiHost.startsWith("/")) {
    return apiHost.replace(/\/$/, "");
  }

  logger.warn(
    "Invalid API Host (must be absolute http/https or relative path)"
  );
  return "";
}

/**
 * @typedef {Object} LensEvent
 * @property {string} repository
 * @property {string} commit_sha
 * @property {string} workflow_name
 * @property {string} timestamp
 * @property {Object} [tags]
 * @property {Object} [custom_data]
 * @property {Object} [metrics]
 */

/**
 * @typedef {Object} FetchEventsResponse
 * @property {string} [status]
 * @property {LensEvent[]} events
 */

/**
 * Fetches the latest events for a given repository or globally.
 * @param {string|null} [repository="lens"] - The repository to fetch events for. If null, fetches globally.
 * @param {number} [limit=25] - The number of events to fetch.
 * @param {number} [skip=0] - The number of events to skip.
 * @param {string|null} [search=null] - Search query.
 * @param {string|null} [groupKey=null] - Group key.
 * @param {string|null} [groupVal=null] - Group value.
 * @returns {Promise<FetchEventsResponse|LensEvent[]>} The API response containing events or just the events array.
 */
/**
 * Fetches the list of all unique repositories.
 * @returns {Promise<string[]>}
 */
export async function fetchRepositories() {
  let attempt = 0;
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];

  while (attempt < maxAttempts) {
    try {
      const baseUrl = getSafeBaseUrl();
      const url = `${baseUrl}/api/v1/events/repositories`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Failed to fetch: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) return [];
      await sleep(delays[attempt - 1]);
    }
  }
  return [];
}

/**
 * Fetches the list of all available numeric metrics.
 * @param {string|null} repository - Optional repository filter
 * @returns {Promise<string[]>}
 */
export async function fetchAvailableMetrics(repository = null) {
  let attempt = 0;
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];

  while (attempt < maxAttempts) {
    try {
      const baseUrl = getSafeBaseUrl();
      let url = `${baseUrl}/api/v1/events/metrics`;
      if (repository && repository !== "All") {
        url += `?repository=${encodeURIComponent(repository)}`;
      }
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Failed to fetch: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) return [];
      await sleep(delays[attempt - 1]);
    }
  }
  return [];
}

export async function fetchEvents(
  repository = "lens",
  limit = 25,
  skip = 0,
  search = null,
  groupKey = null,
  groupVal = null
) {
  let attempt = 0;
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];

  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  while (attempt < maxAttempts) {
    try {
      const baseUrl = getSafeBaseUrl();
      let queryParams = `?limit=${limit}&skip=${skip}&t=${Date.now()}`;
      if (search) {
        queryParams += `&search=${encodeURIComponent(search)}`;
      }
      if (groupKey && groupVal) {
        queryParams += `&group_key=${encodeURIComponent(groupKey)}&group_val=${encodeURIComponent(groupVal)}`;
      }

      const url =
        repository && repository !== "All"
          ? `${baseUrl}/api/v1/events/${encodeURIComponent(repository)}${queryParams}`
          : `${baseUrl}/api/v1/events${queryParams}`;

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

/**
 * Fetches a specific artifact event by its ID.
 * @param {string} id - The artifact event ID.
 * @returns {Promise<LensEvent|null>} The artifact event or null if not found.
 */
export async function fetchArtifact(id) {
  let attempt = 0;
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];

  while (attempt < maxAttempts) {
    try {
      const baseUrl = getSafeBaseUrl();
      const url = `${baseUrl}/api/v1/events/artifact/${encodeURIComponent(id)}`;

      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      return await res.json();
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        logger.error("Error fetching artifact after max retries:", {
          error: error.message,
          id,
        });
        return null;
      }
      logger.warn(`Artifact fetch attempt ${attempt} failed`, {
        error: error.message,
        id,
      });
      await sleep(delays[attempt - 1]);
    }
  }
  return null;
}

/**
 * @typedef {Object} AggregatedMetric
 * @property {number} x - The timestamp in milliseconds.
 * @property {number} y - The metric value.
 */

/**
 * Fetches aggregated time-series metrics for a repository.
 * @param {string} repository - The repository name.
 * @param {string} metricKey - The key of the metric to fetch.
 * @param {string} timePeriod - The time aggregation period (e.g., 'day', 'week', 'month').
 * @param {boolean} isSum - Whether the metric should be summed (true) or averaged (false).
 * @returns {Promise<AggregatedMetric[]>} The array of aggregated data points.
 */
const inflightAggregationRequests = new Map();

export async function fetchAggregatedMetrics(
  repository,
  metricKey,
  timePeriod,
  isSum
) {
  const requestKey = `${repository}-${metricKey}-${timePeriod}-${isSum}`;
  if (inflightAggregationRequests.has(requestKey)) {
    return inflightAggregationRequests.get(requestKey);
  }

  const fetchPromise = (async () => {
    let attempt = 0;
    const maxAttempts = 3;
    const delays = [1000, 2000, 4000];

    while (attempt < maxAttempts) {
      try {
        const baseUrl = getSafeBaseUrl();
        const url = `${baseUrl}/api/v1/events/${encodeURIComponent(repository)}/metrics/aggregated?metric_key=${encodeURIComponent(metricKey)}&time_period=${encodeURIComponent(timePeriod)}&is_sum=${isSum}`;

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        return data.data || [];
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          logger.error("Error fetching aggregated metrics after max retries:", {
            error: error.message,
            repository,
            metricKey,
          });
          return [];
        }
        logger.warn(`Aggregated metrics fetch attempt ${attempt} failed`, {
          error: error.message,
          repository,
        });
        await sleep(delays[attempt - 1]);
      }
    }
    return [];
  })();

  inflightAggregationRequests.set(requestKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inflightAggregationRequests.delete(requestKey);
  }
}
