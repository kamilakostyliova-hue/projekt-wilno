import { useEffect, useMemo, useState } from "react";
import i18n from "./i18n";
import "./App.css";
import AuthModal from "./components/auth/AuthModal";
import Layout from "./components/Layout";
import Navbar from "./components/Navbar";
import { getSavedAuthUser, useAuth } from "./hooks/useAuth";
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
  id?: number;
  name: string;
  email: string;
  avatar: string;
  provider: "local";
  createdAt: string;
  language: AppLanguage;
  settings: UserSettings;
};

type AuthMode = "login" | "register";

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
  const [activeView, setActiveView] = useState<ViewId>(() =>
    getViewFromUrl()
  );
  const [personSlug, setPersonSlug] = useState<string | null>(() => getPersonSlugFromPath());
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const savedAuthUser = getSavedAuthUser();
  const [language, setLanguage] = useState<AppLanguage>(() => savedAuthUser?.settings.language ?? detectAppLanguage());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [onlineMode, setOnlineMode] = useState(true);
  const [networkOnline, setNetworkOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const {
    currentUser,
    loading: authLoading,
    login,
    logout,
    register,
    setCurrentUser,
  } = useAuth(language, theme);

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

  const handleUserChange = (profile: UserProfile) => {
    const previousEmail = currentUser?.email ?? profile.email;
    moveScopedStorage(previousEmail, profile.email);
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
    }
  };

  const handleAuthSubmit = async (
    mode: AuthMode,
    username: string,
    emailValue: string,
    passwordValue: string
  ) => {
    const email = emailValue.trim().toLowerCase();
    const password = passwordValue.trim();
    const name = username.trim();

    if (!email || !password || (mode === "register" && !name)) {
      setAuthMessage("Uzupelnij wszystkie pola.");
      return;
    }

    const result =
      mode === "register"
        ? await register(name, email, password)
        : await login(email, password);

    setAuthMessage(result.message);
    if (result.ok && result.user) {
      setLanguage(result.user.settings.language);
      setTheme(result.user.settings.darkMode ? "night" : "day");
      closeAuth();
    }
  };


  const openAuth = () => {
    setAuthOpen(true);
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
        onLogout={logout}
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
        <AuthModal
          loading={authLoading}
          message={authMessage}
          onClearMessage={() => setAuthMessage("")}
          onClose={closeAuth}
          onSubmit={handleAuthSubmit}
        />
      )}
    </>
  );
}

export default App;
