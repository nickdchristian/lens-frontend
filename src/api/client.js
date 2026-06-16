import { logger } from "../utils/logger.js";

export async function fetchEvents(repository = "lens") {
  try {
    const response = await fetch(
      `/api/v1/events/${repository}?limit=100&t=` + Date.now()
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    logger.error("API fetch error", { error: error.message, repository });
    return { status: "error", events: [] };
  }
}
