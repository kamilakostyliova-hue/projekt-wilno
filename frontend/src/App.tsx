import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaGoogle } from "react-icons/fa";
import i18n from "./i18n";
import "./App.css";
import Layout from "./components/Layout";
import Navbar from "./components/Navbar";
import { syncBackendOfflineBundle } from "./services/offlineBundle";

export type ViewId = "home" | "map" | "walk" | "list" | "favorites" | "categories" | "profile" | "project" | "person";
export type ThemeMode = "day" | "night";
export type AppLanguage = "pl" | "en";
export type TextSize = "compact" | "normal" | "large";
export type UserSettings = {
  audioEnabled: boolean;
  darkMode: boolean;
  language: AppLanguage;
  textSize: TextSize;
};
export type UserProfile = {
  name: string;
  email: string;
  avatar: string;
  provider: "local" | "google";
  createdAt: string;
  language: AppLanguage;
  settings: UserSettings;
};

type StoredUser = UserProfile & {
  password?: string;
};

const viewIds: ViewId[] = [
  "home",
  "map",
  "walk",
  "list",
  "favorites",
  "categories",
  "profile",
  "project",
];

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "day";
  }

  const savedTheme = window.localStorage.getItem("rossa-theme");
  return savedTheme === "night" ? "night" : "day";
};

const getPersonSlugFromPath = () => {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/^\/person\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
};

const getViewFromUrl = (): ViewId => {
  if (typeof window === "undefined") return "home";
  if (getPersonSlugFromPath()) return "person";

  const view = new URLSearchParams(window.location.search).get("view");
  return viewIds.includes(view as ViewId) ? (view as ViewId) : "home";
};

const detectAppLanguage = (): AppLanguage => {
  if (typeof window !== "undefined") {
    const savedLanguage = window.localStorage.getItem("rossa-language");
    if (savedLanguage === "en" || savedLanguage === "pl") return savedLanguage;
  }

  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en")) {
    return "en";
  }

  return "pl";
};

const createDefaultSettings = (language: AppLanguage = detectAppLanguage()): UserSettings => ({
  audioEnabled: true,
  darkMode: getInitialTheme() === "night",
  language,
  textSize: "normal",
});

const createAvatar = (name: string) => {
  const initial = name.trim().charAt(0).toUpperCase() || "R";
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    initial
  )}&backgroundColor=1d4ed8,0c1730&textColor=ffffff`;
};

const normalizeUser = (user: Partial<UserProfile> | null): UserProfile | null => {
  if (!user?.email || !user.name) return null;

  const language = user.language === "en" || user.settings?.language === "en" ? "en" : "pl";
  const settings: UserSettings = {
    ...createDefaultSettings(language),
    ...user.settings,
    language,
    darkMode: user.settings?.darkMode ?? getInitialTheme() === "night",
  };

  return {
    name: user.name,
    email: user.email,
    avatar: user.avatar || createAvatar(user.name),
    provider: user.provider ?? "local",
    createdAt: user.createdAt ?? new Date().toISOString(),
    language,
    settings,
  };
};

const getInitialUser = (): UserProfile | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedUser = window.localStorage.getItem("rossa-user");
    return savedUser ? normalizeUser(JSON.parse(savedUser) as Partial<UserProfile>) : null;
  } catch {
    return null;
  }
};

const getStoredUsers = (): StoredUser[] => {
  try {
    const users = window.localStorage.getItem("rossa-users");
    if (!users) return [];
    return (JSON.parse(users) as StoredUser[]).reduce<StoredUser[]>((acc, user) => {
      const normalized = normalizeUser(user);
      if (!normalized) return acc;
      acc.push(user.password ? { ...normalized, password: user.password } : normalized);
      return acc;
    }, []);
  } catch {
    return [];
  }
};

const moveScopedStorage = (previousEmail: string, nextEmail: string) => {
  if (previousEmail === nextEmail) return;

  ["favorites", "visited", "want-visit", "saved-routes", "walk-history", "planned-walks", "time-spent", "quiz-results"].forEach((scope) => {
    const oldKey = `rossa-${scope}-${previousEmail}`;
    const nextKey = `rossa-${scope}-${nextEmail}`;
    const saved = window.localStorage.getItem(oldKey);

    if (saved && !window.localStorage.getItem(nextKey)) {
      window.localStorage.setItem(nextKey, saved);
    }
  });
};

function App() {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<ViewId>(() =>
    getViewFromUrl()
  );
  const [personSlug, setPersonSlug] = useState<string | null>(() => getPersonSlugFromPath());
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getInitialUser);
  const [language, setLanguage] = useState<AppLanguage>(() => currentUser?.settings.language ?? detectAppLanguage());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [onlineMode, setOnlineMode] = useState(true);
  const [networkOnline, setNetworkOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const currentUserId = currentUser?.email ?? null;
  const routedActiveView: ViewId = personSlug ? "person" : activeView;
  const effectiveSettings = useMemo(
    () => currentUser?.settings ?? createDefaultSettings(language),
    [currentUser, language]
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("rossa-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.textSize = effectiveSettings.textSize;
    window.localStorage.setItem("rossa-language", language);
    void i18n.changeLanguage(language);
  }, [effectiveSettings.textSize, language]);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem("rossa-user", JSON.stringify(currentUser));
    } else {
      window.localStorage.removeItem("rossa-user");
    }
  }, [currentUser]);

  useEffect(() => {
    const syncRoute = () => {
      const nextSlug = getPersonSlugFromPath();
      const nextView = getViewFromUrl();
      setPersonSlug(nextSlug);
      setActiveView(nextSlug ? "person" : nextView);
    };

    syncRoute();
    window.addEventListener("popstate", syncRoute);

    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    void syncBackendOfflineBundle();
  }, []);

  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const key = `rossa-time-spent-${currentUserId ?? "guest"}`;
    const timer = window.setInterval(() => {
      const current = Number(window.localStorage.getItem(key) ?? "0");
      window.localStorage.setItem(key, String(current + 1));
      window.dispatchEvent(new Event("rossa-profile-data-changed"));
    }, 60000);

    return () => window.clearInterval(timer);
  }, [currentUserId]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-animate], main section, .item, .card, .category-tile, .project-grid article, .profile-panel"));
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    targets.forEach((target) => target.classList.add("animate-on-scroll"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [routedActiveView]);

  const isOnline = onlineMode && networkOnline;

  const closeAuth = () => {
    setAuthOpen(false);
    setAuthMessage("");
  };

  const updateStoredProfile = (profile: UserProfile, previousEmail = profile.email) => {
    const users = getStoredUsers();
    const nextUsers = users.map((user) =>
      user.email === previousEmail ? { ...profile, password: user.password } : user
    );

    if (!nextUsers.some((user) => user.email === profile.email)) {
      nextUsers.push(profile);
    }

    window.localStorage.setItem("rossa-users", JSON.stringify(nextUsers));
  };

  const handleUserChange = (profile: UserProfile) => {
    const previousEmail = currentUser?.email ?? profile.email;
    moveScopedStorage(previousEmail, profile.email);
    updateStoredProfile(profile, previousEmail);
    setCurrentUser(profile);
    setLanguage(profile.settings.language);
    setTheme(profile.settings.darkMode ? "night" : "day");
  };

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);

    if (currentUser) {
      const updatedUser: UserProfile = {
        ...currentUser,
        language: nextLanguage,
        settings: {
          ...currentUser.settings,
          language: nextLanguage,
        },
      };
      setCurrentUser(updatedUser);
      updateStoredProfile(updatedUser);
    }
  };

  const handleThemeChange = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);

    if (currentUser) {
      const updatedUser: UserProfile = {
        ...currentUser,
        settings: {
          ...currentUser.settings,
          darkMode: nextTheme === "night",
        },
      };
      setCurrentUser(updatedUser);
      updateStoredProfile(updatedUser);
    }
  };

  const handleAuthSubmit = () => {
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();
    const name = authName.trim();

    if (!email || !password || (authMode === "register" && !name)) {
      setAuthMessage(t("auth.fillAll"));
      return;
    }

    const users = getStoredUsers();
    const existingUser = users.find((user) => user.email === email);

    if (authMode === "register") {
      if (existingUser) {
        setAuthMessage(t("auth.exists"));
        return;
      }

      const newProfile = normalizeUser({
        name,
        email,
        provider: "local",
        avatar: createAvatar(name),
        createdAt: new Date().toISOString(),
        language,
        settings: createDefaultSettings(language),
      });

      if (!newProfile) return;

      const newUser: StoredUser = {
        ...newProfile,
        password,
      };
      const { password: _newPassword, ...profile } = newUser;

      window.localStorage.setItem("rossa-users", JSON.stringify([...users, newUser]));
      void _newPassword;
      setCurrentUser(profile);
      closeAuth();
      return;
    }

    if (!existingUser || existingUser.password !== password) {
      setAuthMessage(t("auth.invalid"));
      return;
    }

    const { password: _existingPassword, ...existingProfile } = existingUser;
    void _existingPassword;
    setCurrentUser(existingProfile);
    setLanguage(existingProfile.settings.language);
    setTheme(existingProfile.settings.darkMode ? "night" : "day");
    closeAuth();
  };

  const handleGoogleLogin = () => {
    const profile = normalizeUser({
      name: "Gość Google",
      email: "google.user@na-rossie.app",
      provider: "google",
      avatar: createAvatar("Gość Google"),
      createdAt: new Date().toISOString(),
      language,
      settings: createDefaultSettings(language),
    });

    if (profile) {
      setCurrentUser(profile);
      updateStoredProfile(profile);
    }
    closeAuth();
  };

  const openAuth = () => {
    setAuthOpen(true);
    setAuthMode("login");
    setAuthMessage("");
  };

  const navigateToView = (view: ViewId) => {
    if (view !== "person") {
      setPersonSlug(null);
      if (typeof window !== "undefined") {
        const nextUrl = view === "home" ? "/" : `/?view=${view}`;
        const currentUrl = `${window.location.pathname}${window.location.search}`;

        if (currentUrl !== nextUrl) {
          window.history.pushState({ view }, "", nextUrl);
        }
      }
    }

    setActiveView(view === "person" ? "map" : view);
  };

  const openPersonPage = (slug: string) => {
    setPersonSlug(slug);
    setActiveView("person");

    if (typeof window !== "undefined") {
      window.history.pushState({ slug }, "", `/person/${encodeURIComponent(slug)}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <Navbar
        activeView={routedActiveView}
        currentUser={currentUser}
        favoriteCount={favoritesCount}
        language={language}
        networkOnline={networkOnline}
        onLanguageChange={handleLanguageChange}
        onLoginClick={openAuth}
        onLogout={() => setCurrentUser(null)}
        onOnlineModeToggle={() => setOnlineMode((current) => !current)}
        onSearchChange={(query) => {
          setSearchQuery(query);

          if (query.trim().length > 0 && activeView !== "map") {
            navigateToView("list");
          }
        }}
        onThemeToggle={() =>
          handleThemeChange(theme === "day" ? "night" : "day")
        }
        onViewChange={navigateToView}
        onlineMode={onlineMode}
        searchQuery={searchQuery}
        theme={theme}
      />
      <div className={`app-view app-view-${routedActiveView}`} key={routedActiveView}>
      <Layout
        activeView={routedActiveView}
        appLanguage={language}
        currentUser={currentUser}
        currentUserId={currentUserId}
        networkOnline={networkOnline}
        onFavoritesCountChange={setFavoritesCount}
        onLanguageChange={handleLanguageChange}
        onSearchChange={setSearchQuery}
        onThemeChange={handleThemeChange}
        onUserChange={handleUserChange}
        onViewChange={navigateToView}
        onPersonOpen={openPersonPage}
        personSlug={personSlug}
        onlineMode={isOnline}
        searchQuery={searchQuery}
        theme={theme}
        userSettings={effectiveSettings}
      />
      </div>
      {authOpen && (
        <div className="auth-shell" role="dialog" aria-modal="true">
          <button className="auth-backdrop" onClick={closeAuth} type="button" />
          <section className="auth-card">
            <button className="auth-close" onClick={closeAuth} type="button" aria-label={t("auth.close")}>
              ×
            </button>
            <span className="auth-eyebrow">{t("auth.eyebrow")}</span>
            <h2>{authMode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h2>
            <p>{t("auth.description")}</p>

            <div className="auth-tabs">
              <button
                className={authMode === "login" ? "active" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setAuthMessage("");
                }}
                type="button"
              >
                {t("auth.loginTab")}
              </button>
              <button
                className={authMode === "register" ? "active" : ""}
                onClick={() => {
                  setAuthMode("register");
                  setAuthMessage("");
                }}
                type="button"
              >
                {t("auth.registerTab")}
              </button>
            </div>

            {authMode === "register" && (
              <label>
                {t("auth.name")}
                <input
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                  value={authName}
                />
              </label>
            )}
            <label>
              {t("auth.email")}
              <input
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                type="email"
                value={authEmail}
              />
            </label>
            <label>
              {t("auth.password")}
              <input
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                type="password"
                value={authPassword}
              />
            </label>

            {authMessage && <strong className="auth-message">{authMessage}</strong>}

            <button className="auth-primary" onClick={handleAuthSubmit} type="button">
              {authMode === "login" ? t("auth.submitLogin") : t("auth.submitRegister")}
            </button>
            <button className="auth-google" onClick={handleGoogleLogin} type="button">
              <FaGoogle /> {t("auth.google")}
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default App;
