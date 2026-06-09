import { useCallback, useEffect, useState } from "react";
import type { AppLanguage, ThemeMode, UserProfile, UserRole, UserSettings } from "../App";

type ApiUser = {
  id: number;
  username: string;
  email: string;
  role?: UserRole;
  created_at: string;
};

type LocalAuthUser = ApiUser & {
  passwordHash: string;
};

type ActiveAuthUser = {
  email: string;
  username: string;
  role?: UserRole;
  loggedAt: string;
  lastSeenAt: string;
};

type AuthEndpoint = "/login" | "/register" | "/caretaker/login" | "/volunteer/login";

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
const activeAuthUsersKey = "rossa-active-auth-users";
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
  role: user.role ?? "user",
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

const getActiveAuthUsers = (): ActiveAuthUser[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(activeAuthUsersKey);
    return saved ? (JSON.parse(saved) as ActiveAuthUser[]) : [];
  } catch {
    return [];
  }
};

const saveActiveAuthUsers = (users: ActiveAuthUser[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(activeAuthUsersKey, JSON.stringify(users));
  window.dispatchEvent(new Event("rossa-active-auth-users-changed"));
};

const upsertActiveAuthUser = (user: Pick<ApiUser, "email" | "username" | "role">) => {
  const now = new Date().toISOString();
  const activeUsers = getActiveAuthUsers();
  const existing = activeUsers.find((item) => item.email === user.email);
  saveActiveAuthUsers([
    {
      email: user.email,
      username: user.username,
      role: user.role ?? "user",
      loggedAt: existing?.loggedAt ?? now,
      lastSeenAt: now,
    },
    ...activeUsers.filter((item) => item.email !== user.email),
  ]);
};

const removeActiveAuthUser = (email: string) => {
  saveActiveAuthUsers(getActiveAuthUsers().filter((item) => item.email !== email));
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

  if (endpoint === "/caretaker/login" || endpoint === "/volunteer/login") {
    const demoRoleUsers: Array<Pick<LocalAuthUser, "id" | "username" | "email" | "role" | "created_at"> & { password: string }> = [
      {
        id: 8901,
        username: "Wolontariusz Rossy",
        email: "wolontariusz@na-rossie.local",
        password: "wolontariusz123",
        role: "volunteer",
        created_at: new Date().toISOString(),
      },
      {
        id: 9001,
        username: "Opiekun Rossy",
        email: "opiekun@na-rossie.local",
        password: "opiekun123",
        role: "caretaker",
        created_at: new Date().toISOString(),
      },
      {
        id: 9002,
        username: "Administrator Rossy",
        email: "admin@na-rossie.local",
        password: "admin123",
        role: "admin",
        created_at: new Date().toISOString(),
      },
    ];
    const demoUser = demoRoleUsers.find((user) => {
      const roleMatches =
        endpoint === "/volunteer/login"
          ? user.role === "volunteer"
          : user.role === "caretaker" || user.role === "admin";
      return roleMatches && user.email === email && user.password === password;
    });

    if (demoUser) {
      const user: LocalAuthUser = {
        id: demoUser.id,
        username: demoUser.username,
        email: demoUser.email,
        role: demoUser.role,
        created_at: demoUser.created_at,
        passwordHash: await hashPassword(email, password),
      };
      saveLocalAuthUsers([user, ...users.filter((item) => item.email !== user.email)]);

      return {
        ok: true,
        message:
          endpoint === "/volunteer/login"
            ? `${prefix}Zalogowano do Panelu Wolontariusza Rossy.`
            : `${prefix}Zalogowano do Panelu Opiekuna Rossy.`,
        user: apiUserToProfile(user, language, theme),
      };
    }

    if (!existingUser) {
      return {
        ok: false,
        message:
          endpoint === "/volunteer/login"
            ? `${prefix}Nie znaleziono konta wolontariusza. Konto demo: wolontariusz@na-rossie.local / wolontariusz123.`
            : `${prefix}Nie znaleziono konta opiekuna. Konto demo: opiekun@na-rossie.local / opiekun123.`,
      };
    }
  }

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
      role: "user",
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

  if (endpoint === "/caretaker/login" && !["caretaker", "admin"].includes(existingUser.role ?? "user")) {
    return {
      ok: false,
      message: `${prefix}To konto nie ma dostepu do Panelu Opiekuna Rossy.`,
    };
  }

  if (endpoint === "/volunteer/login" && (existingUser.role ?? "user") !== "volunteer") {
    return {
      ok: false,
      message: `${prefix}To konto nie ma dostepu do Panelu Wolontariusza Rossy.`,
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
      role: user.role ?? "user",
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

    if (endpoint === "/volunteer/login" && response.status === 404) {
      return {
        ok: false,
        backendUnavailable: true,
        message: "Backend nie ma jeszcze endpointu wolontariusza. Uzywam lokalnego trybu telefonu. ",
      };
    }

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
      upsertActiveAuthUser({
        email: currentUser.email,
        username: currentUser.name,
        role: currentUser.role,
      });
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

  const caretakerLogin = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      const result = await requestAuth(
        "/caretaker/login",
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

  const volunteerLogin = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      const result = await requestAuth(
        "/volunteer/login",
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
    if (currentUser) {
      removeActiveAuthUser(currentUser.email);
    }
    setCurrentUser(null);
  }, [currentUser]);

  return {
    currentUser,
    caretakerLogin,
    loading,
    login,
    logout,
    register,
    setCurrentUser,
    volunteerLogin,
  };
};
