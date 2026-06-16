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
    console.error("API error:", error);
    return { status: "error", events: [] };
  }
}
