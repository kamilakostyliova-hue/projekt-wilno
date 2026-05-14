import { useCallback, useEffect, useState } from "react";
import type { AppLanguage, ThemeMode, UserProfile, UserSettings } from "../App";

type ApiUser = {
  id: number;
  username: string;
  email: string;
  created_at: string;
};

type LocalAuthUser = ApiUser & {
  passwordHash: string;
};

type AuthEndpoint = "/login" | "/register";

type AuthPayload = {
  username?: string;
  email: string;
  password: string;
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

type BackendAuthResult = AuthResult & {
  backendUnavailable?: boolean;
};

const userStorageKey = "rossa-user";
const localAuthUsersKey = "rossa-local-auth-users";
const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const apiUrl = (endpoint: AuthEndpoint) => `${apiBaseUrl}${endpoint}`;

const isLocalOrigin = () => {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
};

const shouldUseBackend = () => Boolean(apiBaseUrl) || isLocalOrigin();

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

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getLocalAuthUsers = (): LocalAuthUser[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(localAuthUsersKey);
    return saved ? (JSON.parse(saved) as LocalAuthUser[]) : [];
  } catch {
    return [];
  }
};

const saveLocalAuthUsers = (users: LocalAuthUser[]) => {
  window.localStorage.setItem(localAuthUsersKey, JSON.stringify(users));
};

const hashPassword = async (email: string, password: string) => {
  const value = `na-rossie:${normalizeEmail(email)}:${password}`;

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return btoa(unescape(encodeURIComponent(value)));
};

const requestLocalAuth = async (
  endpoint: AuthEndpoint,
  payload: AuthPayload,
  language: AppLanguage,
  theme: ThemeMode,
  prefix = ""
): Promise<AuthResult> => {
  const email = normalizeEmail(payload.email);
  const password = payload.password.trim();
  const users = getLocalAuthUsers();
  const existingUser = users.find((user) => user.email === email);

  if (endpoint === "/register") {
    const username = payload.username?.trim() || email.split("@")[0] || "Gosc";

    if (existingUser) {
      return {
        ok: false,
        message: `${prefix}Konto lokalne dla tego emaila juz istnieje. Przejdz do logowania.`,
      };
    }

    const user: LocalAuthUser = {
      id: Date.now(),
      username,
      email,
      created_at: new Date().toISOString(),
      passwordHash: await hashPassword(email, password),
    };

    saveLocalAuthUsers([...users, user]);

    return {
      ok: true,
      message: `${prefix}Konto zapisane lokalnie na tym urzadzeniu.`,
      user: apiUserToProfile(user, language, theme),
    };
  }

  if (!existingUser) {
    return {
      ok: false,
      message: `${prefix}Na tym telefonie nie ma jeszcze konta lokalnego. Uzyj rejestracji albo ustaw publiczny VITE_API_URL.`,
    };
  }

  const passwordHash = await hashPassword(email, password);
  if (existingUser.passwordHash !== passwordHash) {
    return {
      ok: false,
      message: `${prefix}Nieprawidlowy email albo haslo.`,
    };
  }

  return {
    ok: true,
    message: `${prefix}Zalogowano lokalnie na tym urzadzeniu.`,
    user: apiUserToProfile(existingUser, language, theme),
  };
};

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

const requestBackendAuth = async (
  endpoint: AuthEndpoint,
  payload: AuthPayload,
  language: AppLanguage,
  theme: ThemeMode
): Promise<BackendAuthResult> => {
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
      backendUnavailable: true,
      message: apiBaseUrl
        ? "Publiczny backend FastAPI nie odpowiada. Uzywam lokalnego trybu telefonu. "
        : "Backend lokalny nie odpowiada. Uzywam lokalnego trybu przegladarki. ",
    };
  }
};

const requestAuth = async (
  endpoint: AuthEndpoint,
  payload: AuthPayload,
  language: AppLanguage,
  theme: ThemeMode
): Promise<AuthResult> => {
  if (!shouldUseBackend()) {
    return requestLocalAuth(endpoint, payload, language, theme);
  }

  const backendResult = await requestBackendAuth(endpoint, payload, language, theme);
  if (backendResult.ok || !backendResult.backendUnavailable) {
    return backendResult;
  }

  return requestLocalAuth(
    endpoint,
    payload,
    language,
    theme,
    backendResult.message
  );
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
