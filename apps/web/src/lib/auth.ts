const TOKEN_KEY = "pulseops_token";

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event("pulseops-auth-changed"));
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("pulseops-auth-changed"));
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
