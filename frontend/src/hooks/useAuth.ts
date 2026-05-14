import { useCallback, useEffect, useState } from "react";
import type { AppLanguage, ThemeMode, UserProfile, UserSettings } from "../App";

type ApiUser = {
  id: number;
  username: string;
  email: string;
  created_at: string;
};

type AuthResponse = {
  message: string;
  user: ApiUser;
};

type AuthResult = {
  ok: boolean;
  message: string;
  user?: UserProfile;
};

const userStorageKey = "rossa-user";
const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const apiUrl = (endpoint: "/login" | "/register") => `${apiBaseUrl}${endpoint}`;

const createDefaultSettings = (
  language: AppLanguage,
  theme: ThemeMode
): UserSettings => ({
  audioEnabled: true,
  darkMode: theme === "night",
  language,
  textSize: "normal",
});

const createAvatar = (name: string) => {
  const initial = name.trim().charAt(0).toUpperCase() || "R";
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    initial
  )}&backgroundColor=1d4ed8,0c1730&textColor=ffffff`;
};

const apiUserToProfile = (
  user: ApiUser,
  language: AppLanguage,
  theme: ThemeMode
): UserProfile => ({
  id: user.id,
  name: user.username,
  email: user.email,
  avatar: createAvatar(user.username),
  provider: "local",
  createdAt: user.created_at,
  language,
  settings: createDefaultSettings(language, theme),
});

export const getSavedAuthUser = (): UserProfile | null => {
  if (typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(userStorageKey);
    if (!saved) return null;

    const user = JSON.parse(saved) as UserProfile;
    return {
      ...user,
      provider: "local",
    };
  } catch {
    return null;
  }
};

const requestAuth = async (
  endpoint: "/login" | "/register",
  payload: Record<string, string>,
  language: AppLanguage,
  theme: ThemeMode
): Promise<AuthResult> => {
  try {
    const response = await fetch(apiUrl(endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as Partial<AuthResponse> & {
      detail?: string;
    };

    if (!response.ok || !data.user) {
      return {
        ok: false,
        message: data.detail ?? "Nie udalo sie polaczyc z backendem FastAPI.",
      };
    }

    return {
      ok: true,
      message: data.message ?? "Zalogowano.",
      user: apiUserToProfile(data.user, language, theme),
    };
  } catch {
    return {
      ok: false,
      message: apiBaseUrl
        ? "Publiczny backend FastAPI nie odpowiada. Sprawdz VITE_API_URL w ustawieniach Vercel."
        : "Backend FastAPI nie odpowiada. Lokalnie uruchom backend albo ustaw VITE_API_URL dla Vercel.",
    };
  }
};

export const useAuth = (language: AppLanguage, theme: ThemeMode) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(
    getSavedAuthUser
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(userStorageKey, JSON.stringify(currentUser));
    } else {
      window.localStorage.removeItem(userStorageKey);
    }
  }, [currentUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      const result = await requestAuth(
        "/login",
        { email, password },
        language,
        theme
      );
      if (result.ok && result.user) setCurrentUser(result.user);
      setLoading(false);
      return result;
    },
    [language, theme]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setLoading(true);
      const result = await requestAuth(
        "/register",
        { username, email, password },
        language,
        theme
      );
      if (result.ok && result.user) setCurrentUser(result.user);
      setLoading(false);
      return result;
    },
    [language, theme]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  return {
    currentUser,
    loading,
    login,
    logout,
    register,
    setCurrentUser,
  };
};
