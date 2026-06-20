
export function groupEventsByRepository(events) {
  const uniqueReposMap = {};
  events.forEach((e) => {
    if (!uniqueReposMap[e.repository]) uniqueReposMap[e.repository] = [];
    uniqueReposMap[e.repository].push(e);
  });
  return uniqueReposMap;
}

export function getTopRepositoriesForMetric(uniqueReposMap, metricKey, isGlobalView, limit = 5) {
  let reposForKey = Object.keys(uniqueReposMap).filter((repo) => {
    return uniqueReposMap[repo].some(
      (e) => e.metrics?.[metricKey] !== undefined && e.metrics?.[metricKey] !== null
    );
  });

  if (isGlobalView && reposForKey.length > limit) {
    reposForKey = reposForKey
      .sort((a, b) => {
        const aCount = uniqueReposMap[a].filter(
          (e) => e.metrics?.[metricKey] !== undefined && e.metrics?.[metricKey] !== null
        ).length;
        const bCount = uniqueReposMap[b].filter(
          (e) => e.metrics?.[metricKey] !== undefined && e.metrics?.[metricKey] !== null
        ).length;
        return bCount - aCount;
      })
      .slice(0, limit);
  }
  return reposForKey;
}

