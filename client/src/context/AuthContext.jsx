import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "scholarhub_token";
const USER_KEY = "scholarhub_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const persist = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    if (nextUser && nextToken) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      localStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        persist(data.user, token);
      } catch {
        persist(null, null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (email, password, role) => {
    const { data } = await api.post("/auth/login", { email, password, role });
    persist(data.user, data.token);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    persist(data.user, data.token);
    return data;
  };

  const logout = () => persist(null, null);

  const updateSavedResource = (resourceId, saved) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const currentSaved = currentUser.savedResources || [];
      const matchesResource = (item) => String(item?._id || item) === String(resourceId);
      const savedResources = saved
        ? currentSaved.some(matchesResource) ? currentSaved : [...currentSaved, resourceId]
        : currentSaved.filter((item) => !matchesResource(item));
      const nextUser = { ...currentUser, savedResources };
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      isReviewer: ["teacher", "admin"].includes(user?.role?.toLowerCase()?.trim()),
      login,
      register,
      logout,
      updateSavedResource,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
