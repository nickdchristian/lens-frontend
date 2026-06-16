import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/v1/events/lens", () => {
    return HttpResponse.json([
      {
        repository: "forgejo/lens-test-repo",
        timestamp: new Date().toISOString(),
        workflow_name: "test_build",
        artifact_version: "v1.0.0",
        tags: { env: "production", region: "us-east" },
        custom_data: { lifecycle_stage: "build" },
        metrics: { build_time_seconds: 45, bundle_size_mb: 2.4 },
      },
      {
        repository: "forgejo/lens-test-repo",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        workflow_name: "test_build",
        artifact_version: "v0.9.0",
        tags: { env: "staging", region: "us-east" },
        custom_data: { lifecycle_stage: "deploy" },
        metrics: { build_time_seconds: 42, bundle_size_mb: 2.3 },
      },
    ]);
  }),
];
