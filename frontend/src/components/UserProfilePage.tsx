import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaBell,
  FaCalendarAlt,
  FaCamera,
  FaClock,
  FaCog,
  FaDownload,
  FaHeart,
  FaHistory,
  FaMapMarkedAlt,
  FaMedal,
  FaQuoteLeft,
  FaRoute,
  FaSave,
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
  visitedItems: VisitedPlaceRecord[];
  walkHistoryKey: string;
  onLanguageChange: (language: AppLanguage) => void;
  onOpenSavedRoute: (route: SavedRouteRecord) => void;
  onResetUserData: () => void;
  onSaveCurrentRoute: () => boolean;
  onShowPlace: (placeId: number) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onToggleVisited: (placeId: number) => void;
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
    pl: { walk: "Pieszo", bike: "Rower", car: "Samochód" },
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

const safeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "spacer-na-rossie";

const loadCanvasImage = (src?: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
};

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
      return;
    }
    line = nextLine;
  });

  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((currentLine, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    context.fillText(currentLine + suffix, x, y + index * lineHeight);
  });

  return y + Math.min(lines.length, maxLines) * lineHeight;
};

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
  visitedItems,
  walkHistoryKey,
  onLanguageChange,
  onOpenSavedRoute,
  onResetUserData,
  onSaveCurrentRoute,
  onShowPlace,
  onThemeChange,
  onToggleVisited,
  onUserChange,
}: UserProfilePageProps) {
  const { i18n, t } = useTranslation();
  const languageKey = getLanguageKey(language);
  const copy = profileText[languageKey];
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
    role: "user" as const,
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

  const visitedPlaces = useMemo(
    () =>
      visitedItems
        .map((record) => {
          const place = places.find((item) => item.id === record.placeId);
          return place ? { place, record } : null;
        })
        .filter((item): item is { place: ProfilePlace; record: VisitedPlaceRecord } => item !== null),
    [places, visitedItems]
  );
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
  const profileRank = useMemo(() => {
    const score =
      visitedCount * 2 +
      savedRoutes.length * 3 +
      walkHistory.length * 2 +
      favoriteIds.length +
      quizResults.length * 2;

    if (score >= 28) {
      return {
        tier: "guardian",
        label: languageKey === "en" ? "Guardian of Memory" : "Strażniczka pamięci",
        hint: languageKey === "en" ? "Many walks, visits and saved routes." : "Dużo spacerów, wizyt i zapisanych tras.",
      };
    }

    if (savedRoutes.length >= 3 || walkHistory.length >= 4) {
      return {
        tier: "collector",
        label: languageKey === "en" ? "Walk Collector" : "Kolekcjonerka spacerów",
        hint: languageKey === "en" ? "Routes are becoming a personal archive." : "Trasy tworzą już osobiste archiwum.",
      };
    }

    if (visitedCount >= 4) {
      return {
        tier: "explorer",
        label: languageKey === "en" ? "Rasos Explorer" : "Odkrywczyni Rossy",
        hint: languageKey === "en" ? "Visited places start building a route." : "Odwiedzone miejsca zaczynają tworzyć szlak.",
      };
    }

    return {
      tier: "starter",
      label: languageKey === "en" ? "First Walk" : "Pierwszy spacer",
      hint: languageKey === "en" ? "Start collecting walks and places." : "Zacznij zbierać spacery i miejsca.",
    };
  }, [favoriteIds.length, languageKey, quizResults.length, savedRoutes.length, visitedCount, walkHistory.length]);

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
    setNotice(languageKey === "en" ? "Saved route opened from this device." : "Otworzono trasę zapisaną na tym urządzeniu.");
  };

  const removeSavedRoute = (routeId: string) => {
    const nextRoutes = savedRoutes.filter((route) => route.id !== routeId);
    setSavedRoutes(nextRoutes);
    window.localStorage.setItem(savedRoutesKey, JSON.stringify(nextRoutes));
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
  };

  const removeWalkHistory = (walkId: string) => {
    const nextHistory = walkHistory.filter((walk) => walk.id !== walkId);
    setWalkHistory(nextHistory);
    window.localStorage.setItem(walkHistoryKey, JSON.stringify(nextHistory));
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
    setNotice(languageKey === "en" ? "Walk history entry removed." : "Usunięto wpis z historii spacerów.");
  };

  const downloadRouteCard = async (route: SavedRouteRecord) => {
    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    const firstPlace = route.places?.[0];
    const previewImage = await loadCanvasImage(firstPlace?.image);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#f8fbff");
    gradient.addColorStop(0.52, "#eaf3ff");
    gradient.addColorStop(1, "#ffffff");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(29, 78, 216, 0.10)";
    context.beginPath();
    context.arc(910, 120, 260, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(12, 23, 48, 0.08)";
    context.beginPath();
    context.arc(120, 1180, 240, 0, Math.PI * 2);
    context.fill();

    drawRoundedRect(context, 62, 62, 956, 1226, 46);
    context.fillStyle = "rgba(255, 255, 255, 0.90)";
    context.fill();
    context.strokeStyle = "rgba(122, 167, 223, 0.45)";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#1d4ed8";
    context.font = "800 28px Georgia, serif";
    context.fillText(languageKey === "en" ? "RASOS WALK CARD" : "KARTA SPACERU NA ROSSIE", 104, 130);

    context.fillStyle = "#0c1730";
    context.font = "900 74px Georgia, serif";
    drawWrappedText(context, route.name, 104, 218, 620, 82, 2);

    context.font = "700 30px Inter, Arial, sans-serif";
    context.fillStyle = "#53647f";
    context.fillText(
      `${formatDistance(route.distance)}  •  ${formatDuration(route.time)}  •  ${routeModeLabel(route.mode, languageKey)}`,
      104,
      390
    );

    if (previewImage) {
      drawRoundedRect(context, 704, 116, 238, 238, 32);
      context.save();
      context.clip();
      context.drawImage(previewImage, 704, 116, 238, 238);
      context.restore();
    } else {
      drawRoundedRect(context, 704, 116, 238, 238, 32);
      context.fillStyle = "#dcecff";
      context.fill();
    }

    const statCards = [
      [languageKey === "en" ? "START" : "START", route.start?.label ?? "Brama cmentarza"],
      [languageKey === "en" ? "DESTINATION" : "CEL", route.end?.label ?? route.name],
      [languageKey === "en" ? "POINTS" : "PUNKTY", String(route.pointCount)],
    ];

    statCards.forEach(([label, value], index) => {
      const x = 104 + index * 292;
      drawRoundedRect(context, x, 450, 260, 116, 24);
      context.fillStyle = index === 1 ? "rgba(29, 78, 216, 0.10)" : "#ffffff";
      context.fill();
      context.strokeStyle = "rgba(122, 167, 223, 0.36)";
      context.stroke();
      context.fillStyle = "#1d4ed8";
      context.font = "800 20px Inter, Arial, sans-serif";
      context.fillText(label, x + 24, 494);
      context.fillStyle = "#0c1730";
      context.font = "900 28px Inter, Arial, sans-serif";
      drawWrappedText(context, value, x + 24, 532, 210, 30, 1);
    });

    context.fillStyle = "#0c1730";
    context.font = "900 34px Georgia, serif";
    context.fillText(languageKey === "en" ? "Route points" : "Punkty trasy", 104, 650);

    let y = 710;
    (route.places ?? []).slice(0, 5).forEach((place, index) => {
      context.fillStyle = "#1d4ed8";
      context.beginPath();
      context.arc(124, y - 10, 18, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#ffffff";
      context.font = "900 18px Inter, Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(String(index + 1), 124, y - 3);
      context.textAlign = "left";

      context.fillStyle = "#0c1730";
      context.font = "900 28px Inter, Arial, sans-serif";
      drawWrappedText(context, place.name, 164, y, 730, 32, 1);
      context.fillStyle = "#53647f";
      context.font = "700 22px Inter, Arial, sans-serif";
      context.fillText(`${place.categoryLabel}  •  ${place.years}`, 164, y + 42);
      context.font = "500 20px Inter, Arial, sans-serif";
      y = drawWrappedText(context, place.shortDescription, 164, y + 78, 720, 28, 2) + 22;
    });

    context.strokeStyle = "rgba(29, 78, 216, 0.18)";
    context.beginPath();
    context.moveTo(104, 1160);
    context.lineTo(942, 1160);
    context.stroke();

    context.fillStyle = "#53647f";
    context.font = "700 24px Inter, Arial, sans-serif";
    context.fillText(`${languageKey === "en" ? "Saved" : "Zapisano"}: ${formatDate(route.savedAt)}`, 104, 1216);
    context.fillStyle = "#1d4ed8";
    context.font = "900 24px Inter, Arial, sans-serif";
    context.fillText("Na Rossie • projekt-wilno.vercel.app", 104, 1254);

    const link = document.createElement("a");
    link.download = `${safeFileName(route.name)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setNotice(languageKey === "en" ? "Walk card downloaded as PNG." : "Karta spaceru pobrana jako PNG.");
  };

  const downloadWalkCard = async (walk: WalkHistoryRecord) => {
    const routeLike: SavedRouteRecord = {
      id: walk.id,
      name: walk.routeName,
      pointCount: walk.pointCount,
      distance: walk.distance,
      time: walk.duration,
      savedAt: walk.startedAt,
      mode: "walk",
      start: { label: "Brama cmentarza", position: [54.66842, 25.30236], source: "gate" },
      end: { label: walk.routeName, position: null },
      places: [],
      savedOnDevice: true,
    };

    await downloadRouteCard(routeLike);
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
          <div className={`profile-avatar-frame rank-${profileRank.tier}`}>
            <div className="profile-avatar-xl">
              {draftAvatar ? <img alt={profile.name} src={draftAvatar} /> : <span>{initialsFor(profile.name)}</span>}
            </div>
            <span className="profile-rank-medal"><FaMedal /></span>
          </div>
          <div>
            <span className="eyebrow">{currentUser ? t("profile.title") : t("profile.guestTitle")}</span>
            <h1>{profile.name}</h1>
            <p>{currentUser ? t("profile.subtitle") : t("profile.guestSubtitle")}</p>
            <div className="profile-badges">
              <span className={`profile-rank-chip rank-${profileRank.tier}`}><FaMedal /> {profileRank.label}</span>
              <span><FaShieldAlt /> {profile.provider}</span>
              <span><FaClock /> {t("profile.created")}: {formatDate(profile.createdAt)}</span>
            </div>
            <small className="profile-rank-hint">{profileRank.hint}</small>
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

      <section className="profile-panel wide-panel visited-panel">
        <header>
          <FaMapMarkedAlt />
          <h2>{languageKey === "en" ? "Visited places" : "Odwiedzone miejsca"}</h2>
        </header>
        {visitedPlaces.length === 0 ? (
          <div className="profile-empty">
            {languageKey === "en" ? "No visited places yet." : "Nie ma jeszcze odwiedzonych miejsc."}
          </div>
        ) : (
          <div className="visited-place-list">
            {visitedPlaces.map(({ place, record }) => (
              <article className="visited-place-card" key={place.id}>
                <img alt={place.name} src={place.image} />
                <div>
                  <span>{place.categoryLabel}</span>
                  <h3>{place.name}</h3>
                  <p>{place.shortDescription}</p>
                  <small>{languageKey === "en" ? "Visited" : "Odwiedzono"}: {formatDate(record.visitedAt)}</small>
                </div>
                <div className="profile-card-actions">
                  <button onClick={() => onShowPlace(place.id)} type="button">{t("profile.viewPlace")}</button>
                  <button onClick={() => onToggleVisited(place.id)} type="button">
                    <FaTimes /> {languageKey === "en" ? "Remove visit" : "Wykreśl"}
                  </button>
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

      <section className="profile-panel wide-panel route-history-panel">
        <article>
          <header>
            <FaRoute />
            <h2>{languageKey === "en" ? "Walk history cards" : "Historia spacerów"}</h2>
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
                          : "Na tym urządzeniu"
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
                      <FaRoute /> {languageKey === "en" ? "Show route" : "Pokaż trasę"}
                    </button>
                    <button onClick={() => void downloadRouteCard(route)} type="button">
                      <FaDownload /> PNG
                    </button>
                    <button onClick={() => removeSavedRoute(route.id)} type="button">
                      <FaTrash /> {languageKey === "en" ? "Remove" : "Usuń"}
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
          <h2>{languageKey === "en" ? "Recent walk activity" : "Ostatnia aktywność spacerów"}</h2>
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
                  <p>{formatDistance(walk.distance)} - {formatDuration(walk.duration)} - {t("profile.points", { count: walk.pointCount })}</p>
                  <small>{t("profile.startedAt")}: {formatDate(walk.startedAt)}</small>
                  <div className="timeline-actions">
                    <button className="timeline-download" onClick={() => void downloadWalkCard(walk)} type="button">
                      <FaDownload /> PNG
                    </button>
                    <button className="timeline-delete" onClick={() => removeWalkHistory(walk.id)} type="button">
                      <FaTrash /> {languageKey === "en" ? "Remove" : "Usuń"}
                    </button>
                  </div>
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
