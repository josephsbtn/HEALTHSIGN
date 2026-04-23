const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_BACKEND_PORT = "8000";
const COMMON_FRONTEND_PORTS = new Set(["5173", "4173", "3000"]);

function trimTrailingSlash(pathname: string): string {
  if (pathname === "/") return "";
  return pathname.replace(/\/+$/, "");
}

export function normalizeWsUrl(rawUrl: string): string {
  const input = rawUrl.trim();
  if (!input) return input;

  try {
    const url = new URL(input);

    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol === "https:") url.protocol = "wss:";

    if (url.pathname === "/" || !url.pathname) {
      url.pathname = "/ws";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    const withWsProtocol = input
      .replace(/^http:/i, "ws:")
      .replace(/^https:/i, "wss:");

    const withoutTrailing = withWsProtocol.replace(/\/+$/, "");
    return /\/ws(\?|$)/.test(withoutTrailing)
      ? withoutTrailing
      : `${withoutTrailing}/ws`;
  }
}

export function wsToHttpBaseUrl(wsUrl: string): string {
  const normalizedWs = normalizeWsUrl(wsUrl);
  if (!normalizedWs) return normalizedWs;

  try {
    const url = new URL(normalizedWs);
    url.protocol = url.protocol === "wss:" ? "https:" : "http:";

    if (url.pathname.endsWith("/ws")) {
      const nextPath = trimTrailingSlash(url.pathname.slice(0, -3));
      url.pathname = nextPath || "/";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return normalizedWs
      .replace(/^wss:/i, "https:")
      .replace(/^ws:/i, "http:")
      .replace(/\/ws(\?|$)/, "$1")
      .replace(/\/$/, "");
  }
}

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
    return "ws://localhost:8000/ws";
  }

  const { hostname, host, protocol, port } = window.location;
  if (isLocalHost(hostname)) {
    return "ws://localhost:8000/ws";
  }

  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";

  if (COMMON_FRONTEND_PORTS.has(port)) {
    return normalizeWsUrl(`${wsProtocol}//${hostname}:${DEFAULT_BACKEND_PORT}`);
  }

  return normalizeWsUrl(`${wsProtocol}//${host}`);
}