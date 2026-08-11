function reportClientError(errorName: string) {
  navigator.sendBeacon('/api/events', JSON.stringify({
    type: 'client-error',
    error_name: errorName.slice(0, 80),
    path: window.location.pathname,
  }));
}

window.addEventListener('error', (event) => {
  reportClientError(event.error?.name || 'Error');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  reportClientError(reason?.constructor?.name || 'UnhandledRejection');
});
