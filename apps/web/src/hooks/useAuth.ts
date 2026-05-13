import { useSyncExternalStore } from "react";
import { getToken, isAuthenticated } from "../lib/auth";

type AuthSnapshot = {
  token: string | null;
  isAuthenticated: boolean;
};

function subscribe(callback: () => void): () => void {
  window.addEventListener("pulseops-auth-changed", callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("pulseops-auth-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): AuthSnapshot {
  return {
    token: getToken(),
    isAuthenticated: isAuthenticated()
  };
}

export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
