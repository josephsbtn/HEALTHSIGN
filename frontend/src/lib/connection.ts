const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname);
}

export function getDefaultBackendHttpUrl() {
  if (!isBrowser()) {
    return "http://localhost:8000";
  }

  const { hostname, host, protocol } = window.location;
  if (isLocalHost(hostname)) {
    return "http://localhost:8000";
  }

  return `${protocol}//${host}`;
}

export function getDefaultBackendWsUrl() {
  if (!isBrowser()) {
    return "ws://localhost:8000";
  }

  const { hostname, host, protocol } = window.location;
  if (isLocalHost(hostname)) {
    return "ws://localhost:8000";
  }

  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${host}`;
}