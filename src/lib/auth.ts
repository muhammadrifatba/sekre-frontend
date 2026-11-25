const TOKEN_KEY = "sekre_jwt_token";
const OWNER_KEY = "sekre_jwt_owner";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export interface AuthOwner {
  owner_id: string;
  name: string;
  role: string;
  permissions: string[];
  visible_categories: string[];
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredOwner(): AuthOwner | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(OWNER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthOwner;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, owner: AuthOwner): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(OWNER_KEY, JSON.stringify(owner));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(OWNER_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginWithPassword(
  identifier: string,
  password: string
): Promise<{ token: string; owner: AuthOwner }> {
  const resp = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await resp.json();
  if (!resp.ok || !data?.access_token) {
    throw new Error(data?.detail || data?.error || "Login gagal");
  }
  saveAuth(data.access_token, data.owner);
  return { token: data.access_token, owner: data.owner };
}

export async function fetchCurrentOwner(): Promise<AuthOwner | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const resp = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!resp.ok) {
      clearAuth();
      return null;
    }
    const data = await resp.json();
    if (data?.owner) {
      saveAuth(token, data.owner);
      return data.owner as AuthOwner;
    }
    return null;
  } catch {
    return getStoredOwner();
  }
}

export async function logoutOwner(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  clearAuth();
}
