import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaBell,
  FaBookmark,
  FaCalendarAlt,
  FaCamera,
  FaClock,
  FaCog,
  FaHeart,
  FaHistory,
  FaMapMarkedAlt,
  FaQuoteLeft,
  FaRoute,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaTimes,
  FaTrash,
  FaTrophy,
  FaUserCircle,
} from "react-icons/fa";
import type { AppLanguage, ThemeMode, UserProfile, UserSettings } from "../App";
import { getLanguageKey, profileText } from "../i18n/domain";
import "./UserProfilePage.css";

type ProfilePlace = {
  id: number;
  name: string;
  years: string;
  category: string;
  categoryLabel: string;
  image: string;
  shortDescription: string;
  position: [number, number];
};

export type VisitedPlaceRecord = {
  placeId: number;
  visitedAt: string;
};

export type WantVisitRecord = {
  placeId: number;
  plannedAt: string;
};

type PlannedWalkRecord = {
  id: string;
  date: string;
  time: string;
  walkType: string;
  notes: string;
  notify: boolean;
  createdAt: string;
};

type SavedRouteRecord = {
  id: string;
  name: string;
  pointCount: number;
  distance: number;
  time: number;
  savedAt: string;
  mode: string;
  routeKind?: "category" | "single";
  categoryId?: string;
  categoryLabel?: string;
  start?: {
    label: string;
    position: [number, number];
    source: "gate" | "user";
  };
  end?: {
    label: string;
    position: [number, number] | null;
  };
  places?: Array<{
    id: number;
    name: string;
    years: string;
    category: string;
    categoryLabel: string;
    position: [number, number];
    image: string;
    shortDescription: string;
  }>;
  waypoints?: [number, number][];
  summarySource?: "online" | "offline";
  savedOnDevice?: boolean;
};

type WalkHistoryRecord = {
  id: string;
  routeName: string;
  pointCount: number;
  distance: number;
  duration: number;
  startedAt: string;
};

type QuizResultRecord = {
  id: string;
  routeName: string;
  score: number;
  total: number;
  completedAt: string;
};

type UserProfilePageProps = {
  currentUser: UserProfile | null;
  favoriteIds: number[];
  language: AppLanguage;
  places: ProfilePlace[];
  plannedWalksKey: string;
  quizResultsKey: string;
  savedRoutesKey: string;
  theme: ThemeMode;
  timeSpentKey: string;
  userSettings: UserSettings;
  visitedCount: number;
  walkHistoryKey: string;
  onLanguageChange: (language: AppLanguage) => void;
  onOpenSavedRoute: (route: SavedRouteRecord) => void;
  onResetUserData: () => void;
  onSaveCurrentRoute: () => boolean;
  onShowPlace: (placeId: number) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onToggleFavorite: (placeId: number) => void;
  onUserChange: (profile: UserProfile) => void;
};

const fallbackAvatar = (name: string) => {
  const initial = name.trim().charAt(0).toUpperCase() || "R";
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(initial)}&backgroundColor=1d4ed8,0c1730&textColor=ffffff`;
};

const readArray = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const formatDistance = (meters: number) =>
  meters >= 1000 ? (meters / 1000).toFixed(1) + " km" : meters + " m";

const formatDuration = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return minutes + " min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? hours + " h " + rest + " min" : hours + " h";
};

const routeModeLabel = (mode: string, language: "pl" | "en") => {
  const labels = {
    pl: { walk: "Pieszo", bike: "Rower", car: "Samochod" },
    en: { walk: "Walking", bike: "Bike", car: "Car" },
  };

  return labels[language][mode as "walk" | "bike" | "car"] ?? mode;
};

const formatCoordinates = (position?: [number, number] | null) =>
  position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : "";

const initialsFor = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "R";

function UserProfilePage({
  currentUser,
  favoriteIds,
  language,
  places,
  plannedWalksKey,
  quizResultsKey,
  savedRoutesKey,
  theme,
  timeSpentKey,
  userSettings,
  visitedCount,
  walkHistoryKey,
  onLanguageChange,
  onOpenSavedRoute,
  onResetUserData,
  onSaveCurrentRoute,
  onShowPlace,
  onThemeChange,
  onToggleFavorite,
  onUserChange,
}: UserProfilePageProps) {
  const { i18n, t } = useTranslation();
  const languageKey = getLanguageKey(language);
  const copy = profileText[languageKey];
  const [favoriteSearch, setFavoriteSearch] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [myPlacesFilter, setMyPlacesFilter] = useState<"all" | "favorites">("all");
  const [plannerDate, setPlannerDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [plannerTime, setPlannerTime] = useState("10:00");
  const [plannerType, setPlannerType] = useState("historyczny");
  const [plannerNotes, setPlannerNotes] = useState("");
  const [plannerNotify, setPlannerNotify] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteRecord[]>(() => readArray(savedRoutesKey));
  const [plannedWalks, setPlannedWalks] = useState<PlannedWalkRecord[]>(() => readArray(plannedWalksKey));
  const [walkHistory, setWalkHistory] = useState<WalkHistoryRecord[]>(() => readArray(walkHistoryKey));
  const [quizResults, setQuizResults] = useState<QuizResultRecord[]>(() => readArray(quizResultsKey));
  const [timeSpent, setTimeSpent] = useState(() =>
    typeof window === "undefined" ? 0 : Number(window.localStorage.getItem(timeSpentKey) ?? "0")
  );
  const [notice, setNotice] = useState("");
  const profile = currentUser ?? {
    name: copy.guestName,
    email: "guest@na-rossie.local",
    avatar: fallbackAvatar(copy.guestName),
    provider: "local" as const,
    createdAt: new Date().toISOString(),
    language,
    settings: userSettings,
  };
  const [draftName, setDraftName] = useState(profile.name);
  const [draftEmail, setDraftEmail] = useState(profile.email);
  const [draftAvatar, setDraftAvatar] = useState(profile.avatar);
  const [draftLanguage, setDraftLanguage] = useState<AppLanguage>(profile.settings.language);

  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "pl-PL";

  useEffect(() => {
    setDraftName(profile.name);
    setDraftEmail(profile.email);
    setDraftAvatar(profile.avatar);
    setDraftLanguage(profile.settings.language);
  }, [profile.avatar, profile.email, profile.name, profile.settings.language]);

  useEffect(() => {
    const refresh = () => {
      setSavedRoutes(readArray(savedRoutesKey));
      setPlannedWalks(readArray(plannedWalksKey));
      setWalkHistory(readArray(walkHistoryKey));
      setQuizResults(readArray(quizResultsKey));
      setTimeSpent(Number(window.localStorage.getItem(timeSpentKey) ?? "0"));
    };

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("rossa-profile-data-changed", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("rossa-profile-data-changed", refresh);
    };
  }, [plannedWalksKey, quizResultsKey, savedRoutesKey, timeSpentKey, walkHistoryKey]);

  const favoritePlaces = useMemo(
    () => places.filter((place) => favoriteIds.includes(place.id)),
    [favoriteIds, places]
  );
  const myPlaces = useMemo(() => {
    const rows = places
      .map((place) => ({
        place,
        isFavorite: favoriteIds.includes(place.id),
      }))
      .filter((row) => row.isFavorite);

    return rows.filter((row) =>
      myPlacesFilter === "all" ||
      (myPlacesFilter === "favorites" && row.isFavorite)
    );
  }, [favoriteIds, myPlacesFilter, places]);
  const categories = useMemo(
    () => Array.from(new Set(favoritePlaces.map((place) => place.categoryLabel))),
    [favoritePlaces]
  );
  const filteredFavorites = useMemo(() => {
    const query = favoriteSearch.trim().toLowerCase();

    return favoritePlaces.filter((place) => {
      const matchesQuery =
        query.length === 0 ||
        `${place.name} ${place.categoryLabel} ${place.shortDescription}`.toLowerCase().includes(query);
      const matchesFilter = favoriteFilter === "all" || place.categoryLabel === favoriteFilter;
      return matchesQuery && matchesFilter;
    });
  }, [favoriteFilter, favoritePlaces, favoriteSearch]);
  const totalWalkDistance = walkHistory.reduce((total, walk) => total + walk.distance, 0);
  const totalWalkTime = walkHistory.reduce((total, walk) => total + walk.duration, 0);
  const quote = useMemo(() => {
    const quotes = copy.quotes;
    return quotes[new Date().getDate() % quotes.length];
  }, [copy.quotes]);
  const achievements = [
    { label: copy.achievements.collector, unlocked: favoriteIds.length >= 3 },
    { label: copy.achievements.planner, unlocked: plannedWalks.length > 0 },
    {
      label: languageKey === "en" ? "First visit" : "Pierwsza wizyta",
      unlocked: visitedCount > 0,
    },
    {
      label: languageKey === "en" ? "Quiz master" : "Mistrz quizu",
      unlocked: quizResults.some((result) => result.total > 0 && result.score === result.total),
    },
  ];

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
  };

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraftAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const timers = plannedWalks
      .filter((walk) => walk.notify)
      .map((walk) => {
        const reminderAt = new Date(`${walk.date}T${walk.time}:00`).getTime();
        const delay = reminderAt - Date.now();

        if (delay <= 0 || delay > 2_147_483_647) return null;

        return window.setTimeout(() => {
          const message = copy.reminderMessage(walk.walkType, walk.time);
          setNotice(message);

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Na Rossie", {
              body: message,
            });
          }
        }, delay);
      })
      .filter((timer): timer is number => timer !== null);

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [plannedWalks]);

  const saveProfile = () => {
    if (!currentUser) {
      setNotice(t("profile.savedProfile"));
      return;
    }

    const nextProfile: UserProfile = {
      ...currentUser,
      avatar: draftAvatar || fallbackAvatar(draftName),
      email: draftEmail.trim().toLowerCase() || currentUser.email,
      language: draftLanguage,
      name: draftName.trim() || currentUser.name,
      settings: {
        ...currentUser.settings,
        language: draftLanguage,
      },
    };

    onUserChange(nextProfile);
    onLanguageChange(draftLanguage);
    setNotice(t("profile.savedProfile"));
  };

  const updateSettings = (nextSettings: Partial<UserSettings>) => {
    const mergedSettings = { ...profile.settings, ...nextSettings };
    if (nextSettings.language) {
      onLanguageChange(nextSettings.language);
      setDraftLanguage(nextSettings.language);
    }
    if (typeof nextSettings.darkMode === "boolean") {
      onThemeChange(nextSettings.darkMode ? "night" : "day");
    }

    if (currentUser) {
      onUserChange({
        ...currentUser,
        language: mergedSettings.language,
        settings: mergedSettings,
      });
    }
  };

  const saveCurrentRoute = () => {
    const saved = onSaveCurrentRoute();
    setNotice(saved ? t("profile.routeSaved") : t("profile.routeMissing"));
  };

  const openSavedRoute = (route: SavedRouteRecord) => {
    onOpenSavedRoute(route);
    setNotice(languageKey === "en" ? "Saved route opened from this device." : "Otworzono trase zapisana na tym urzadzeniu.");
  };

  const removeSavedRoute = (routeId: string) => {
    const nextRoutes = savedRoutes.filter((route) => route.id !== routeId);
    setSavedRoutes(nextRoutes);
    window.localStorage.setItem(savedRoutesKey, JSON.stringify(nextRoutes));
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
  };

  const savePlannedWalk = () => {
    const planned: PlannedWalkRecord = {
      id: `planned-${Date.now()}`,
      date: plannerDate,
      time: plannerTime,
      walkType: plannerType,
      notes: plannerNotes.trim(),
      notify: plannerNotify,
      createdAt: new Date().toISOString(),
    };
    const nextWalks = [planned, ...plannedWalks].slice(0, 20);
    setPlannedWalks(nextWalks);
    window.localStorage.setItem(plannedWalksKey, JSON.stringify(nextWalks));
    setPlannerNotes("");
    setNotice(copy.walkSaved);

    if (plannerNotify && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  };

  const removePlannedWalk = (id: string) => {
    const nextWalks = plannedWalks.filter((walk) => walk.id !== id);
    setPlannedWalks(nextWalks);
    window.localStorage.setItem(plannedWalksKey, JSON.stringify(nextWalks));
  };

  const resetData = () => {
    onResetUserData();
    setSavedRoutes([]);
    setPlannedWalks([]);
    setWalkHistory([]);
    setTimeSpent(0);
    setNotice(t("profile.resetDone"));
  };

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar-xl">
            {draftAvatar ? <img alt={profile.name} src={draftAvatar} /> : <span>{initialsFor(profile.name)}</span>}
          </div>
          <div>
            <span className="eyebrow">{currentUser ? t("profile.title") : t("profile.guestTitle")}</span>
            <h1>{profile.name}</h1>
            <p>{currentUser ? t("profile.subtitle") : t("profile.guestSubtitle")}</p>
            <div className="profile-badges">
              <span><FaShieldAlt /> {profile.provider}</span>
              <span><FaClock /> {t("profile.created")}: {formatDate(profile.createdAt)}</span>
            </div>
          </div>
        </div>
        <button className="profile-save-route" onClick={saveCurrentRoute} type="button">
          <FaSave /> {t("profile.saveCurrentRoute")}
        </button>
      </section>

      {notice && <div className="profile-notice">{notice}</div>}

      <section className="profile-premium-strip">
        <article className="progress-card">
          <FaHeart />
          <span>
            <strong>{favoriteIds.length}</strong>
            <small>{copy.favoriteCounter}</small>
          </span>
          <div className="profile-progress-track"><i style={{ width: `${Math.min(100, favoriteIds.length * 10)}%` }} /></div>
        </article>
        <article className="quote-card">
          <FaQuoteLeft />
          <p>{quote}</p>
        </article>
      </section>

      <section className="profile-achievements">
        {achievements.map((achievement) => (
          <article className={achievement.unlocked ? "unlocked" : ""} key={achievement.label}>
            <FaTrophy />
            <span>{achievement.label}</span>
          </article>
        ))}
      </section>

      <section className="profile-stats">
        <article>
          <FaRoute />
          <strong>{walkHistory.length}</strong>
          <span>{t("profile.completedWalks")}</span>
        </article>
        <article>
          <FaMapMarkedAlt />
          <strong>{visitedCount}</strong>
          <span>{languageKey === "en" ? "visited places" : "odwiedzone miejsca"}</span>
        </article>
        <article>
          <FaMapMarkedAlt />
          <strong>{formatDistance(totalWalkDistance)}</strong>
          <span>{t("profile.totalDistance")}</span>
        </article>
        <article>
          <FaClock />
          <strong>{formatDuration(Math.max(totalWalkTime, timeSpent * 60))}</strong>
          <span>{t("profile.timeSpent")}</span>
        </article>
        <article>
          <FaTrophy />
          <strong>{quizResults.length}</strong>
          <span>{languageKey === "en" ? "completed quizzes" : "ukończone quizy"}</span>
        </article>
      </section>

      <section className="profile-grid">
        <article className="profile-panel edit-panel">
          <header>
            <FaUserCircle />
            <h2>{t("profile.editTitle")}</h2>
          </header>
          <div className="avatar-edit-row">
            <div className="profile-avatar-md">
              {draftAvatar ? <img alt={profile.name} src={draftAvatar} /> : <span>{initialsFor(profile.name)}</span>}
            </div>
            <label className="avatar-upload">
              <FaCamera /> {t("profile.uploadAvatar")}
              <input accept="image/*" onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)} type="file" />
            </label>
          </div>
          <label>
            {t("profile.name")}
            <input onChange={(event) => setDraftName(event.target.value)} value={draftName} />
          </label>
          <label>
            {t("profile.email")}
            <input onChange={(event) => setDraftEmail(event.target.value)} type="email" value={draftEmail} />
          </label>
          <label>
            {t("profile.appLanguage")}
            <select onChange={(event) => setDraftLanguage(event.target.value as AppLanguage)} value={draftLanguage}>
              <option value="pl">🇵🇱 Polski</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </label>
          <button className="profile-primary" onClick={saveProfile} type="button">
            <FaSave /> {t("profile.saveProfile")}
          </button>
        </article>

        <article className="profile-panel settings-panel">
          <header>
            <FaCog />
            <h2>{t("profile.settings")}</h2>
          </header>
          <label className="setting-row">
            <span>{t("profile.darkMode")}</span>
            <input checked={theme === "night"} onChange={(event) => updateSettings({ darkMode: event.target.checked })} type="checkbox" />
          </label>
          <label>
            {t("profile.appLanguage")}
            <select onChange={(event) => updateSettings({ language: event.target.value as AppLanguage })} value={language}>
              <option value="pl">🇵🇱 Polski</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </label>
          <label>
            {t("profile.textSize")}
            <select onChange={(event) => updateSettings({ textSize: event.target.value as UserSettings["textSize"] })} value={userSettings.textSize}>
              <option value="compact">{t("profile.compact")}</option>
              <option value="normal">{t("profile.normal")}</option>
              <option value="large">{t("profile.large")}</option>
            </select>
          </label>
          <label className="setting-row">
            <span>{t("profile.audioEnabled")}</span>
            <input checked={userSettings.audioEnabled} onChange={(event) => updateSettings({ audioEnabled: event.target.checked })} type="checkbox" />
          </label>
          <div className="reset-box">
            <p>{t("profile.resetHint")}</p>
            <button onClick={resetData} type="button">
              <FaTrash /> {t("profile.resetData")}
            </button>
          </div>
        </article>
      </section>

      <section className="profile-panel wide-panel my-places-panel">
        <header>
          <FaBookmark />
          <h2>{copy.myPlaces}</h2>
        </header>
        <div className="my-places-filters">
          {([
            ["all", copy.all],
            ["favorites", copy.favorites],
          ] as Array<["all" | "favorites", string]>).map(([filter, label]) => (
            <button
              className={myPlacesFilter === filter ? "active" : ""}
              key={filter}
              onClick={() => setMyPlacesFilter(filter)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {myPlaces.length === 0 ? (
          <div className="profile-empty">{copy.emptyMyPlaces}</div>
        ) : (
          <div className="profile-place-grid">
            {myPlaces.map(({ place, isFavorite }) => (
              <article className="profile-place-card" key={place.id}>
                <img alt={place.name} src={place.image} />
                <div>
                  <span>{place.categoryLabel}</span>
                  <h3>{place.name}</h3>
                  <p>{place.shortDescription}</p>
                  {isFavorite && (
                    <div className="profile-status-row">
                      <b><FaHeart /> {copy.favoriteBadge}</b>
                    </div>
                  )}
                </div>
                <div className="profile-card-actions">
                  <button onClick={() => onShowPlace(place.id)} type="button">{t("profile.viewPlace")}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="profile-panel wide-panel">
        <header>
          <FaHeart />
          <h2>{t("profile.favorites")}</h2>
        </header>
        <div className="profile-toolbar">
          <label className="profile-search">
            <FaSearch />
            <input onChange={(event) => setFavoriteSearch(event.target.value)} placeholder={t("profile.searchFavorites")} value={favoriteSearch} />
          </label>
          <select onChange={(event) => setFavoriteFilter(event.target.value)} value={favoriteFilter}>
            <option value="all">{t("profile.allCategories")}</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        {filteredFavorites.length === 0 ? (
          <div className="profile-empty">{t("profile.noFavorites")}</div>
        ) : (
          <div className="profile-place-grid">
            {filteredFavorites.map((place) => (
              <article className="profile-place-card" key={place.id}>
                <img alt={place.name} src={place.image} />
                <div>
                  <span>{place.categoryLabel}</span>
                  <h3>{place.name}</h3>
                  <p>{place.shortDescription}</p>
                </div>
                <div className="profile-card-actions">
                  <button onClick={() => onShowPlace(place.id)} type="button">{t("profile.viewPlace")}</button>
                  <button onClick={() => onToggleFavorite(place.id)} type="button">{t("profile.removeFavorite")}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="profile-panel wide-panel planner-panel">
        <header>
          <FaCalendarAlt />
          <h2>{copy.plannerTitle}</h2>
        </header>
        <div className="planner-form">
          <label>{copy.date}<input onChange={(event) => setPlannerDate(event.target.value)} type="date" value={plannerDate} /></label>
          <label>{copy.time}<input onChange={(event) => setPlannerTime(event.target.value)} type="time" value={plannerTime} /></label>
          <label>{copy.walkType}
            <select onChange={(event) => setPlannerType(event.target.value)} value={plannerType}>
              <option value="historyczny">{copy.historic}</option>
              <option value="architektura">{copy.architecture}</option>
              <option value="szybki spacer">{copy.quickWalk}</option>
              <option value="pełna trasa">{copy.fullRoute}</option>
            </select>
          </label>
          <label>{copy.notes}<textarea onChange={(event) => setPlannerNotes(event.target.value)} value={plannerNotes} /></label>
          <label className="setting-row"><span><FaBell /> {copy.reminder}</span><input checked={plannerNotify} onChange={(event) => setPlannerNotify(event.target.checked)} type="checkbox" /></label>
          <button className="profile-primary" onClick={savePlannedWalk} type="button"><FaSave /> {copy.saveWalk}</button>
        </div>
        {plannedWalks.length > 0 && (
          <div className="planned-walk-list">
            {plannedWalks.map((walk) => (
              <article key={walk.id}>
                <span><strong>{walk.walkType}</strong><small>{walk.date} • {walk.time}</small></span>
                <p>{walk.notes || copy.noNotes}</p>
                <button onClick={() => removePlannedWalk(walk.id)} type="button"><FaTimes /></button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="profile-split">
        <article className="profile-panel">
          <header>
            <FaRoute />
            <h2>{t("profile.savedRoutes")}</h2>
          </header>
          {savedRoutes.length === 0 ? (
            <div className="profile-empty">{t("profile.noRoutes")}</div>
          ) : (
            <div className="route-list-profile">
              {savedRoutes.map((route) => (
                <article key={route.id}>
                  <div className="saved-route-head">
                    <span>
                      <strong>{route.name}</strong>
                      <small>{t("profile.savedAt")}: {formatDate(route.savedAt)}</small>
                    </span>
                    <b className="route-device-badge">
                      {route.savedOnDevice
                        ? languageKey === "en"
                          ? "On this device"
                          : "Na tym urzadzeniu"
                        : languageKey === "en"
                          ? "Old save"
                          : "Stary zapis"}
                    </b>
                  </div>

                  <div className="saved-route-meta">
                    <span>{t("profile.points", { count: route.pointCount })}</span>
                    <span>{formatDistance(route.distance)}</span>
                    <span>{formatDuration(route.time)}</span>
                    <span>{routeModeLabel(route.mode, languageKey)}</span>
                  </div>

                  {(route.start || route.end) && (
                    <div className="saved-route-endpoints">
                      <p>
                        <b>{languageKey === "en" ? "Start" : "Start"}:</b>{" "}
                        {route.start?.label ?? "Brama cmentarza"}
                        {route.start?.position && <small>{formatCoordinates(route.start.position)}</small>}
                      </p>
                      <p>
                        <b>{languageKey === "en" ? "Destination" : "Cel"}:</b>{" "}
                        {route.end?.label ?? route.name}
                        {route.end?.position && <small>{formatCoordinates(route.end.position)}</small>}
                      </p>
                    </div>
                  )}

                  {route.places && route.places.length > 0 && (
                    <ol className="saved-route-points">
                      {route.places.map((place, index) => (
                        <li key={`${route.id}-${place.id}`}>
                          <span>{index + 1}</span>
                          <div>
                            <strong>{place.name}</strong>
                            <small>{place.categoryLabel} - {place.years}</small>
                            <p>{place.shortDescription}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}

                  <div className="route-card-actions">
                    <button onClick={() => openSavedRoute(route)} type="button">
                      <FaRoute /> {languageKey === "en" ? "Show route" : "Pokaz trase"}
                    </button>
                    <button onClick={() => removeSavedRoute(route.id)} type="button">
                      <FaTrash /> {languageKey === "en" ? "Remove" : "Usun"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="profile-panel wide-panel">
        <header>
          <FaHistory />
          <h2>{t("profile.walkHistory")}</h2>
        </header>
        {walkHistory.length === 0 ? (
          <div className="profile-empty">{t("profile.noHistory")}</div>
        ) : (
          <div className="profile-timeline">
            {walkHistory.map((walk) => (
              <article key={walk.id}>
                <span />
                <div>
                  <strong>{walk.routeName}</strong>
                  <p>{formatDistance(walk.distance)} • {formatDuration(walk.duration)} • {t("profile.points", { count: walk.pointCount })}</p>
                  <small>{t("profile.startedAt")}: {formatDate(walk.startedAt)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default UserProfilePage;
