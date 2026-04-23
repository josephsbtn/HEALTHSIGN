const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_BACKEND_PORT = "8000";
const COMMON_FRONTEND_PORTS = new Set(["5173", "4173", "3000"]);

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

  const { hostname, host, protocol, port } = window.location;
  if (isLocalHost(hostname)) {
    return "http://localhost:8000";
  }

  if (COMMON_FRONTEND_PORTS.has(port)) {
    return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
  }

  return `${protocol}//${host}`;
}

export function getDefaultBackendWsUrl() {
  if (!isBrowser()) {
    return "ws://localhost:8000";
  }

  const { hostname, host, protocol, port } = window.location;
  if (isLocalHost(hostname)) {
    return "ws://localhost:8000";
  }

  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";

  if (COMMON_FRONTEND_PORTS.has(port)) {
    return `${wsProtocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
  }

  return `${wsProtocol}//${host}`;
}