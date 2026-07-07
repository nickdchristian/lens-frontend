# Lens Frontend

This is the web UI for the Lens application. It provides a beautiful, highly-responsive dashboard for visualizing your CI/CD telemetry, DORA metrics, deployment history, and artifact traces.

## Tech Stack

- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI Framework**: [Lit](https://lit.dev/) (Native Web Components)
- **Styling**: Vanilla CSS with custom design tokens for dynamic theming (Dark/Light mode).
- **Unit Testing**: [Vitest](https://vitest.dev/)
- **End-to-End Testing**: [Playwright](https://playwright.dev/)
- **Mocking**: [MSW (Mock Service Worker)](https://mswjs.io/) for simulating API responses during local development and testing.

## Core Features

- **Dashboard View (`<lens-dashboard>`)**: Visualize DORA metrics (Lead Time, Deployment Count, Change Failure Rate) across your organization or filtered by specific repositories, environments, and custom tags.
- **Artifact Trace (`<lens-artifact-trace>`)**: Track the lifecycle of an artifact (e.g., a Docker image or npm package) as it moves through various pipelines and environments.
- **Secure Authentication (`<lens-login>`)**: Seamless session-based OAuth2 login flow communicating with the Lens backend.
- **Dynamic Theming (`theme.js`)**: Real-time CSS variable interpolation for a premium, responsive aesthetic.

## Configuration

The frontend relies on the Lens backend API. During local development, Vite is configured to proxy `/api` requests to `http://localhost:8000` (the default FastAPI port).

In a production build, the application will default to making relative `/api` requests. If the frontend is hosted separately from the backend (e.g., on a CDN or distinct domain), you must provide the backend's absolute URL at build time:

```bash
VITE_API_HOST=https://api.lens.myorg.com npm run build
```

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   *Note: If the backend is not running, the frontend will fall back to using MSW to serve mock data so you can continue building UI components!*

3. **Run unit tests**:
   ```bash
   npm run test
   ```

4. **Run End-to-End (E2E) tests**:
   ```bash
   npx playwright install --with-deps  # First time setup
   npm run test:e2e
   ```

5. **Linting and Formatting**:
   ```bash
   npm run lint
   npm run format
   ```

## Production Build

To bundle the application for production deployment:

```bash
npm run build
```

The compiled assets will be placed in the `dist/` directory, ready to be served by any static file host (e.g., Nginx, Vercel, Cloudflare Pages).
