import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaHistory,
  FaMapMarkerAlt,
  FaMinus,
  FaPlus,
  FaSignOutAlt,
  FaTasks,
  FaUserShield,
} from "react-icons/fa";
import type { AppLanguage, UserProfile } from "../App";
import type { CareReport } from "./CaretakerPanel";
import "./VolunteerPanel.css";

type VolunteerPlace = {
  id: number;
  name: string;
  years: string;
  categoryLabel: string;
  image: string;
  shortDescription: string;
};

type VolunteerPanelProps = {
  currentUser: UserProfile | null;
  language: AppLanguage;
  places: VolunteerPlace[];
  onLoginClick: () => void;
  onLogout: () => void;
  onShowPlace: (placeId: number) => void;
};

type GraveStatus = "good" | "check" | "needs_care" | "missing_photo" | "missing_data";
type VolunteerAction = "adopt" | "release" | "inspect" | "photo";

type PlaceReviewState = {
  status?: GraveStatus;
};

type VolunteerLog = {
  id: string;
  placeId: number;
  placeName: string;
  action: VolunteerAction;
  note: string;
  createdAt: string;
};

type VolunteerState = {
  adoptedPlaceIds: number[];
  logs: VolunteerLog[];
};

type VolunteerTask = {
  place: VolunteerPlace;
  priority: "high" | "medium" | "low";
  status: GraveStatus;
  reportCount: number;
  reason: string;
};

const reportsStorageKey = "rossa-care-reports";
const reviewStorageKey = "rossa-care-place-review";

const emptyState: VolunteerState = {
  adoptedPlaceIds: [],
  logs: [],
};

const statusLabels: Record<GraveStatus, { pl: string; en: string }> = {
  good: { pl: "Zadbany", en: "Good" },
  check: { pl: "Do sprawdzenia", en: "Needs check" },
  needs_care: { pl: "Potrzebuje opieki", en: "Needs care" },
  missing_photo: { pl: "Brak zdjecia", en: "Missing photo" },
  missing_data: { pl: "Brak danych", en: "Missing data" },
};

const actionLabels: Record<VolunteerAction, { pl: string; en: string }> = {
  adopt: { pl: "Przyjeto miejsce pod opieke", en: "Place adopted" },
  release: { pl: "Zakonczono opieke nad miejscem", en: "Place released" },
  inspect: { pl: "Potwierdzono kontrole", en: "Inspection confirmed" },
  photo: { pl: "Zgloszono nowe zdjecie", en: "New photo noted" },
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

const readRecord = <T,>(key: string): Record<number, T> => {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<number, T>)
      : {};
  } catch {
    return {};
  }
};

const volunteerKeyFor = (email?: string | null) =>
  `rossa-volunteer-state-${email ?? "guest"}`;

const readVolunteerState = (email?: string | null): VolunteerState => {
  if (typeof window === "undefined") return emptyState;

  try {
    const saved = window.localStorage.getItem(volunteerKeyFor(email));
    const parsed = saved ? JSON.parse(saved) : emptyState;
    return {
      adoptedPlaceIds: Array.isArray(parsed.adoptedPlaceIds) ? parsed.adoptedPlaceIds : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return emptyState;
  }
};

const formatDate = (value: string, language: AppLanguage) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function VolunteerPanel({
  currentUser,
  language,
  onLoginClick,
  onLogout,
  onShowPlace,
  places,
}: VolunteerPanelProps) {
  const isEnglish = language === "en";
  const hasAccess = currentUser?.role === "volunteer" || currentUser?.role === "admin";
  const [state, setState] = useState<VolunteerState>(() => readVolunteerState(currentUser?.email));
  const [reports, setReports] = useState<CareReport[]>(() => readArray<CareReport>(reportsStorageKey));
  const [reviewStates, setReviewStates] = useState<Record<number, PlaceReviewState>>(() =>
    readRecord<PlaceReviewState>(reviewStorageKey)
  );
  const storageKey = volunteerKeyFor(currentUser?.email);

  useEffect(() => {
    setState(readVolunteerState(currentUser?.email));
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.email) return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [currentUser?.email, state, storageKey]);

  useEffect(() => {
    const refresh = () => {
      setReports(readArray<CareReport>(reportsStorageKey));
      setReviewStates(readRecord<PlaceReviewState>(reviewStorageKey));
    };

    window.addEventListener("storage", refresh);
    window.addEventListener("rossa-care-reports-changed", refresh);
    window.addEventListener("rossa-care-review-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("rossa-care-reports-changed", refresh);
      window.removeEventListener("rossa-care-review-changed", refresh);
    };
  }, []);

  const openReports = useMemo(
    () => reports.filter((report) => report.status !== "resolved"),
    [reports]
  );

  const tasks = useMemo<VolunteerTask[]>(() => {
    const reportsByPlace = new Map<number, CareReport[]>();
    openReports.forEach((report) => {
      if (report.placeId === null) return;
      reportsByPlace.set(report.placeId, [...(reportsByPlace.get(report.placeId) ?? []), report]);
    });

    const priorityRank: Record<VolunteerTask["priority"], number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    return places
      .map<VolunteerTask | null>((place) => {
        const placeReports = reportsByPlace.get(place.id) ?? [];
        const status = reviewStates[place.id]?.status ?? "good";
        const hasCareReport = placeReports.some((report) => report.type === "needs_care");
        const hasPhotoReport = placeReports.some((report) => report.type === "missing_photo");
        const needsHelp = status !== "good" || placeReports.length > 0;
        if (!needsHelp) return null;

        const priority: VolunteerTask["priority"] =
          status === "needs_care" || hasCareReport
            ? "high"
            : status === "missing_photo" || hasPhotoReport || status === "missing_data"
              ? "medium"
              : "low";
        const reason =
          placeReports.length > 0
            ? isEnglish
              ? `${placeReports.length} open report${placeReports.length > 1 ? "s" : ""}`
              : `${placeReports.length} otwarte zgloszen${placeReports.length === 1 ? "ie" : ""}`
            : statusLabels[status][language];

        return {
          place,
          priority,
          status,
          reportCount: placeReports.length,
          reason,
        };
      })
      .filter((task): task is VolunteerTask => task !== null)
      .sort((first, second) => {
        const priorityDiff = priorityRank[second.priority] - priorityRank[first.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return first.place.name.localeCompare(second.place.name);
      });
  }, [isEnglish, language, openReports, places, reviewStates]);

  const adoptedPlaces = useMemo(
    () => places.filter((place) => state.adoptedPlaceIds.includes(place.id)),
    [places, state.adoptedPlaceIds]
  );

  const addLog = (place: VolunteerPlace, action: VolunteerAction) => {
    const note = actionLabels[action][language];
    const log: VolunteerLog = {
      id: `volunteer-log-${Date.now()}-${place.id}`,
      placeId: place.id,
      placeName: place.name,
      action,
      note,
      createdAt: new Date().toISOString(),
    };
    setState((current) => ({
      ...current,
      logs: [log, ...current.logs].slice(0, 80),
    }));
  };

  const toggleAdoption = (place: VolunteerPlace) => {
    const adopted = state.adoptedPlaceIds.includes(place.id);
    setState((current) => ({
      ...current,
      adoptedPlaceIds: adopted
        ? current.adoptedPlaceIds.filter((id) => id !== place.id)
        : [place.id, ...current.adoptedPlaceIds],
    }));
    addLog(place, adopted ? "release" : "adopt");
  };

  const recordAction = (place: VolunteerPlace, action: VolunteerAction) => {
    if (!state.adoptedPlaceIds.includes(place.id)) {
      setState((current) => ({
        ...current,
        adoptedPlaceIds: [place.id, ...current.adoptedPlaceIds],
      }));
    }
    addLog(place, action);
  };

  if (!hasAccess) {
    return (
      <main className="volunteer-page">
        <section className="volunteer-access-card">
          <FaUserShield />
          <span className="eyebrow">{isEnglish ? "Volunteer access" : "Dostep wolontariusza"}</span>
          <h1>{isEnglish ? "Volunteer mode" : "Tryb wolontariusza"}</h1>
          <p>
            {isEnglish
              ? "This area is for people who help with field checks, photos and symbolic care tasks."
              : "Ta czesc jest dla osob, ktore pomagaja w kontroli terenowej, zdjeciach i symbolicznej opiece nad miejscami."}
          </p>
          <button onClick={onLoginClick} type="button">
            <FaUserShield /> {isEnglish ? "Log in as volunteer" : "Zaloguj jako wolontariusz"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="volunteer-page">
      <section className="volunteer-hero">
        <div>
          <span className="eyebrow">{isEnglish ? "Volunteer workspace" : "Przestrzen wolontariusza"}</span>
          <h1>{isEnglish ? "Care tasks for Rasos" : "Zadania wolontariusza Rossy"}</h1>
          <p>
            {isEnglish
              ? "Adopt places for a field check, confirm visits, add photo tasks and help caretakers keep the catalog alive."
              : "Przyjmuj miejsca do sprawdzenia, potwierdzaj kontrole, zglaszaj zdjecia i pomagaj opiekunom utrzymac katalog aktualny."}
          </p>
        </div>
        <div className="volunteer-user-card">
          <FaUserShield />
          <span>
            <strong>{currentUser?.name}</strong>
            <small>{currentUser?.role}</small>
          </span>
          <button onClick={onLogout} type="button">
            <FaSignOutAlt /> {isEnglish ? "Log out" : "Wyloguj"}
          </button>
        </div>
      </section>

      <section className="volunteer-stats">
        <article>
          <FaMapMarkerAlt />
          <strong>{adoptedPlaces.length}</strong>
          <span>{isEnglish ? "adopted places" : "miejsc pod opieka"}</span>
        </article>
        <article>
          <FaExclamationTriangle />
          <strong>{tasks.length}</strong>
          <span>{isEnglish ? "tasks available" : "zadań do wyboru"}</span>
        </article>
        <article>
          <FaClipboardList />
          <strong>{openReports.length}</strong>
          <span>{isEnglish ? "open reports" : "otwartych zgłoszeń"}</span>
        </article>
        <article>
          <FaCheckCircle />
          <strong>{state.logs.length}</strong>
          <span>{isEnglish ? "volunteer actions" : "działań wolontariusza"}</span>
        </article>
      </section>

      <section className="volunteer-grid">
        <article className="volunteer-panel">
          <header>
            <FaTasks />
            <span>
              <h2>{isEnglish ? "Places that need help" : "Miejsca do wsparcia"}</h2>
              <p>
                {isEnglish
                  ? "A regular visitor can only report a problem. A volunteer can take responsibility for checking it."
                  : "Zwykły użytkownik tylko zgłasza problem. Wolontariusz może przyjąć miejsce do sprawdzenia."}
              </p>
            </span>
          </header>

          <div className="volunteer-task-list">
            {tasks.length === 0 ? (
              <div className="volunteer-empty">
                {isEnglish ? "No volunteer tasks right now." : "Na razie nie ma zadań dla wolontariuszy."}
              </div>
            ) : (
              tasks.map(({ place, priority, reason, status }) => {
                const adopted = state.adoptedPlaceIds.includes(place.id);

                return (
                  <article className={`volunteer-task-card priority-${priority}`} key={place.id}>
                    <img alt={place.name} src={place.image} />
                    <div>
                      <span className={`volunteer-status status-${status}`}>
                        {statusLabels[status][language]}
                      </span>
                      <h3>{place.name}</h3>
                      <small>{place.categoryLabel} - {place.years}</small>
                      <p>{place.shortDescription}</p>
                      <b>{reason}</b>
                    </div>
                    <div className="volunteer-actions">
                      <button onClick={() => toggleAdoption(place)} type="button">
                        {adopted ? <FaMinus /> : <FaPlus />}
                        {adopted
                          ? isEnglish
                            ? "Release"
                            : "Zrezygnuj"
                          : isEnglish
                            ? "Adopt"
                            : "Opiekuj się"}
                      </button>
                      <button onClick={() => recordAction(place, "inspect")} type="button">
                        <FaCheckCircle /> {isEnglish ? "Checked" : "Sprawdzono"}
                      </button>
                      <button onClick={() => recordAction(place, "photo")} type="button">
                        <FaClipboardList /> {isEnglish ? "Photo task" : "Zdjęcie"}
                      </button>
                      <button onClick={() => onShowPlace(place.id)} type="button">
                        <FaMapMarkerAlt /> {isEnglish ? "Map" : "Mapa"}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </article>

        <aside className="volunteer-panel volunteer-side">
          <section>
            <header>
              <FaMapMarkerAlt />
              <span>
                <h2>{isEnglish ? "My adopted places" : "Moje miejsca"}</h2>
                <p>{isEnglish ? "These tasks are assigned to you on this device." : "Te zadania są przypisane do Ciebie na tym urządzeniu."}</p>
              </span>
            </header>
            {adoptedPlaces.length === 0 ? (
              <div className="volunteer-empty">
                {isEnglish ? "No place adopted yet." : "Nie przyjęto jeszcze żadnego miejsca."}
              </div>
            ) : (
              <div className="volunteer-adopted-list">
                {adoptedPlaces.map((place) => (
                  <button key={place.id} onClick={() => onShowPlace(place.id)} type="button">
                    <img alt={place.name} src={place.image} />
                    <span>
                      <strong>{place.name}</strong>
                      <small>{place.categoryLabel}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <header>
              <FaHistory />
              <span>
                <h2>{isEnglish ? "Volunteer history" : "Historia działań"}</h2>
                <p>{isEnglish ? "Recent confirmations and adoption changes." : "Ostatnie potwierdzenia i zmiany opieki."}</p>
              </span>
            </header>
            {state.logs.length === 0 ? (
              <div className="volunteer-empty">
                {isEnglish ? "No volunteer activity yet." : "Nie ma jeszcze działań wolontariusza."}
              </div>
            ) : (
              <div className="volunteer-log-list">
                {state.logs.slice(0, 8).map((log) => (
                  <article key={log.id}>
                    <strong>{log.placeName}</strong>
                    <p>{log.note}</p>
                    <small>{formatDate(log.createdAt, language)}</small>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

export default VolunteerPanel;
