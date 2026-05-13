import { useCallback, useState } from "react";
import { ApiError, apiRequest } from "../lib/api";

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiRequest<T>(path, init);
      setData(result);
      return result;
    } catch (caughtError) {
      const message =
        caughtError instanceof ApiError ? caughtError.message : "Request failed.";
      setError(message);
      throw caughtError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    error,
    loading,
    request
  };
}
