export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || "http://127.0.0.1:8000";
  }

  async getEvents(repository, limit = 100) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/events/${repository}?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch events:", error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === "ok";
    } catch {
      return false;
    }
  }
}

// Export a singleton instance using the Vite env variable (or fallback to local)
export const api = new ApiClient(import.meta.env.VITE_API_BASE_URL);
