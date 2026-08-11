export function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routeType?: string; routePath?: string },
) {
  console.error(JSON.stringify({
    event: 'server-request-error',
    error_name: error instanceof Error ? error.name : 'UnknownError',
    method: request.method,
    path: context.routePath || request.path,
    route_type: context.routeType,
    timestamp: new Date().toISOString(),
  }));
}
