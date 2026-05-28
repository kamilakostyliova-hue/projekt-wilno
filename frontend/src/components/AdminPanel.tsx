import { useMemo, useState } from "react";
import {
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaDatabase,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaMapMarkerAlt,
  FaSave,
  FaShieldAlt,
  FaSignOutAlt,
  FaTools,
  FaUserCog,
  FaUsers,
} from "react-icons/fa";
import type { AppLanguage, UserProfile, UserRole } from "../App";
import type { CareReport, ReportType } from "./CaretakerPanel";
import "./AdminPanel.css";

type AdminPlace = {
  id: number;
  name: string;
  years: string;
  category: string;
  categoryLabel: string;
  image: string;
  description: string;
  shortDescription: string;
  source: string;
  position: [number, number];
};

type AdminPanelProps = {
  currentUser: UserProfile | null;
  language: AppLanguage;
  places: AdminPlace[];
  onLoginClick: () => void;
  onLogout: () => void;
  onOpenCaretaker: () => void;
  onShowPlace: (placeId: number) => void;
};

type AdminTab = "overview" | "people" | "reports" | "users" | "statistics";

type LocalAuthUser = {
  id: number;
  username: string;
  email: string;
  role?: UserRole;
  created_at: string;
  passwordHash?: string;
};

type AdminPlaceDraft = {
  description?: string;
  category?: string;
  hidden?: boolean;
  note?: string;
  updatedAt?: string;
};

const reportsStorageKey = "rossa-care-reports";
const localUsersKey = "rossa-local-auth-users";
const adminDraftsKey = "rossa-admin-place-drafts";
const reviewStorageKey = "rossa-care-place-review";

const reportLabels: Record<ReportType, { pl: string; en: string }> = {
  missing_photo: { pl: "Brakuje zdjecia", en: "Missing photo" },
  wrong_description: { pl: "Zly opis", en: "Wrong description" },
  needs_care: { pl: "Grob wymaga opieki", en: "Grave needs care" },
  wrong_location: { pl: "Nieprawidlowa lokalizacja", en: "Wrong location" },
  missing_person: { pl: "Brakujaca postac", en: "Missing person" },
  other: { pl: "Inna uwaga", en: "Other note" },
};

const adminTabs: Array<{ id: AdminTab; pl: string; en: string }> = [
  { id: "overview", pl: "Pulpit", en: "Overview" },
  { id: "people", pl: "Osoby", en: "People" },
  { id: "reports", pl: "Zgloszenia", en: "Reports" },
  { id: "users", pl: "Uzytkownicy", en: "Users" },
  { id: "statistics", pl: "Statystyki", en: "Statistics" },
];

const readStorageArray = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const readStorageRecord = <T,>(key: string): Record<number, T> => {
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

const writeReports = (reports: CareReport[]) => {
  window.localStorage.setItem(reportsStorageKey, JSON.stringify(reports));
  window.dispatchEvent(new Event("rossa-care-reports-changed"));
};

const writeUsers = (users: LocalAuthUser[]) => {
  window.localStorage.setItem(localUsersKey, JSON.stringify(users));
};

const writeDrafts = (drafts: Record<number, AdminPlaceDraft>) => {
  window.localStorage.setItem(adminDraftsKey, JSON.stringify(drafts));
};

const formatDate = (value: string, language: AppLanguage) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function AdminPanel({
  currentUser,
  language,
  places,
  onLoginClick,
  onLogout,
  onOpenCaretaker,
  onShowPlace,
}: AdminPanelProps) {
  const isEnglish = language === "en";
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [reports, setReports] = useState<CareReport[]>(() => readStorageArray<CareReport>(reportsStorageKey));
  const [users, setUsers] = useState<LocalAuthUser[]>(() => readStorageArray<LocalAuthUser>(localUsersKey));
  const [drafts, setDrafts] = useState<Record<number, AdminPlaceDraft>>(() => readStorageRecord<AdminPlaceDraft>(adminDraftsKey));
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(places[0]?.id ?? null);
  const [editDescription, setEditDescription] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const hasAccess = currentUser?.role === "admin";

  const demoUsers = useMemo<LocalAuthUser[]>(
    () => [
      {
        id: 9002,
        username: "Administrator Rossy",
        email: "admin@na-rossie.local",
        role: "admin",
        created_at: new Date().toISOString(),
      },
      {
        id: 9001,
        username: "Opiekun Rossy",
        email: "opiekun@na-rossie.local",
        role: "caretaker",
        created_at: new Date().toISOString(),
      },
    ],
    []
  );

  const allUsers = useMemo(() => {
    const seen = new Set(users.map((user) => user.email));
    return [...users, ...demoUsers.filter((user) => !seen.has(user.email))];
  }, [demoUsers, users]);

  const managedPlaces = useMemo(
    () =>
      places.map((place) => ({
        ...place,
        adminDraft: drafts[place.id],
        isHidden: Boolean(drafts[place.id]?.hidden),
        adminDescription: drafts[place.id]?.description ?? place.description,
        adminCategory: drafts[place.id]?.category ?? place.categoryLabel,
      })),
    [drafts, places]
  );
  const selectedPlace = managedPlaces.find((place) => place.id === selectedPlaceId) ?? managedPlaces[0] ?? null;
  const unresolvedReports = reports.filter((report) => report.status !== "resolved");
  const hiddenPlacesCount = managedPlaces.filter((place) => place.isHidden).length;
  const draftCount = Object.keys(drafts).length;
  const reviewStates = readStorageRecord<{ status?: string }>(reviewStorageKey);
  const needsCareCount = Object.values(reviewStates).filter((item) =>
    ["check", "needs_care", "missing_photo", "missing_data"].includes(item.status ?? "")
  ).length;
  const categoryCounts = managedPlaces.reduce<Record<string, number>>((acc, place) => {
    acc[place.categoryLabel] = (acc[place.categoryLabel] ?? 0) + 1;
    return acc;
  }, {});

  const copy = isEnglish
    ? {
        accessTitle: "Administrator access",
        accessLead: "Log in as Administrator to manage the project, users and content.",
        login: "Open login",
        heroEyebrow: "System administrator",
        heroTitle: "Administration center",
        heroLead: "Full control view for catalog entries, reports, users, moderation and project statistics.",
        logout: "Log out",
        caretaker: "Caretaker panel",
        places: "catalog entries",
        reports: "open reports",
        drafts: "draft changes",
        needsCare: "attention states",
        edit: "Edit",
        map: "Map",
        hide: "Hide",
        show: "Show",
        saveDraft: "Save draft",
        publish: "Approve changes",
        description: "Description",
        category: "Category",
        adminNote: "Admin note",
        noReports: "No open reports.",
        resolve: "Resolve",
        role: "Role",
        created: "Created",
        promote: "Make caretaker",
        makeAdmin: "Make admin",
      }
    : {
        accessTitle: "Dostep administratora",
        accessLead: "Zaloguj sie jako Administrator, zeby zarzadzac projektem, uzytkownikami i trescia.",
        login: "Otworz logowanie",
        heroEyebrow: "Administrator systemu",
        heroTitle: "Centrum administracji",
        heroLead: "Pelny widok kontroli katalogu, zgloszen, uzytkownikow, moderacji i statystyk projektu.",
        logout: "Wyloguj",
        caretaker: "Panel opiekuna",
        places: "wpisow w katalogu",
        reports: "otwartych zgloszen",
        drafts: "zmian roboczych",
        needsCare: "stanow uwagi",
        edit: "Edytuj",
        map: "Mapa",
        hide: "Ukryj",
        show: "Pokaz",
        saveDraft: "Zapisz szkic",
        publish: "Zatwierdz zmiany",
        description: "Opis",
        category: "Kategoria",
        adminNote: "Notatka administratora",
        noReports: "Brak otwartych zgloszen.",
        resolve: "Rozwiaz",
        role: "Rola",
        created: "Utworzono",
        promote: "Nadaj opiekuna",
        makeAdmin: "Nadaj admina",
      };

  const openEditor = (placeId: number) => {
    const place = managedPlaces.find((item) => item.id === placeId);
    if (!place) return;

    setSelectedPlaceId(placeId);
    setEditDescription(place.adminDescription);
    setEditCategory(place.adminCategory);
    setEditNote(place.adminDraft?.note ?? "");
    setActiveTab("people");
  };

  const savePlaceDraft = () => {
    if (!selectedPlace) return;

    const nextDrafts = {
      ...drafts,
      [selectedPlace.id]: {
        ...drafts[selectedPlace.id],
        description: editDescription || selectedPlace.description,
        category: editCategory || selectedPlace.categoryLabel,
        note: editNote,
        updatedAt: new Date().toISOString(),
      },
    };
    setDrafts(nextDrafts);
    writeDrafts(nextDrafts);
  };

  const approvePlaceChanges = () => {
    if (!selectedPlace) return;

    const nextDrafts = {
      ...drafts,
      [selectedPlace.id]: {
        ...drafts[selectedPlace.id],
        description: editDescription || selectedPlace.description,
        category: editCategory || selectedPlace.categoryLabel,
        note: editNote || (isEnglish ? "Approved by administrator." : "Zatwierdzone przez administratora."),
        updatedAt: new Date().toISOString(),
      },
    };
    setDrafts(nextDrafts);
    writeDrafts(nextDrafts);
  };

  const togglePlaceHidden = (placeId: number) => {
    const nextDrafts = {
      ...drafts,
      [placeId]: {
        ...drafts[placeId],
        hidden: !drafts[placeId]?.hidden,
        updatedAt: new Date().toISOString(),
      },
    };
    setDrafts(nextDrafts);
    writeDrafts(nextDrafts);
  };

  const resolveReport = (reportId: string) => {
    const nextReports = reports.map((report) =>
      report.id === reportId ? { ...report, status: "resolved" as const } : report
    );
    setReports(nextReports);
    writeReports(nextReports);
  };

  const updateUserRole = (email: string, role: UserRole) => {
    const existing = allUsers.find((user) => user.email === email);
    if (!existing) return;

    const nextUsers = [
      ...users.filter((user) => user.email !== email),
      {
        ...existing,
        role,
      },
    ];
    setUsers(nextUsers);
    writeUsers(nextUsers);
  };

  if (!hasAccess) {
    return (
      <main className="admin-page">
        <section className="admin-access-card">
          <FaShieldAlt />
          <span className="eyebrow">{copy.accessTitle}</span>
          <h1>{copy.accessTitle}</h1>
          <p>{copy.accessLead}</p>
          <button onClick={onLoginClick} type="button">
            <FaUserCog /> {copy.login}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <span className="eyebrow">{copy.heroEyebrow}</span>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroLead}</p>
        </div>
        <div className="admin-user-card">
          <FaUserCog />
          <span>
            <strong>{currentUser?.name}</strong>
            <small>{currentUser?.email}</small>
          </span>
          <button onClick={onOpenCaretaker} type="button">
            <FaTools /> {copy.caretaker}
          </button>
          <button onClick={onLogout} type="button">
            <FaSignOutAlt /> {copy.logout}
          </button>
        </div>
      </section>

      <section className="admin-tabs" aria-label="Admin navigation">
        {adminTabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {isEnglish ? tab.en : tab.pl}
          </button>
        ))}
      </section>

      {activeTab === "overview" && (
        <section className="admin-overview">
          <article>
            <FaDatabase />
            <strong>{managedPlaces.length}</strong>
            <span>{copy.places}</span>
          </article>
          <article>
            <FaClipboardList />
            <strong>{unresolvedReports.length}</strong>
            <span>{copy.reports}</span>
          </article>
          <article>
            <FaEdit />
            <strong>{draftCount}</strong>
            <span>{copy.drafts}</span>
          </article>
          <article>
            <FaExclamationIcon />
            <strong>{needsCareCount}</strong>
            <span>{copy.needsCare}</span>
          </article>
        </section>
      )}

      {activeTab === "people" && (
        <section className="admin-split-page">
          <article className="admin-panel">
            <header>
              <FaDatabase />
              <h2>{isEnglish ? "Catalog management" : "Zarzadzanie katalogiem"}</h2>
            </header>
            <div className="admin-place-list">
              {managedPlaces.map((place) => (
                <div className={`admin-place-row ${selectedPlace?.id === place.id ? "active" : ""}`} key={place.id}>
                  <img alt={place.name} src={place.image} />
                  <span>
                    <strong>{place.name}</strong>
                    <small>{place.adminCategory} - {place.years}</small>
                    {place.isHidden && <em>{isEnglish ? "Hidden from public catalog" : "Ukryte w katalogu publicznym"}</em>}
                  </span>
                  <button onClick={() => openEditor(place.id)} type="button">
                    <FaEdit /> {copy.edit}
                  </button>
                  <button onClick={() => onShowPlace(place.id)} type="button">
                    <FaMapMarkerAlt /> {copy.map}
                  </button>
                  <button onClick={() => togglePlaceHidden(place.id)} type="button">
                    {place.isHidden ? <FaEye /> : <FaEyeSlash />} {place.isHidden ? copy.show : copy.hide}
                  </button>
                </div>
              ))}
            </div>
          </article>

          {selectedPlace && (
            <article className="admin-editor">
              <img alt={selectedPlace.name} src={selectedPlace.image} />
              <div>
                <span className="eyebrow">{isEnglish ? "Edit entry" : "Edycja wpisu"}</span>
                <h2>{selectedPlace.name}</h2>
                <small>{selectedPlace.years}</small>
              </div>
              <label>
                {copy.category}
                <input onChange={(event) => setEditCategory(event.target.value)} value={editCategory || selectedPlace.adminCategory} />
              </label>
              <label>
                {copy.description}
                <textarea
                  onChange={(event) => setEditDescription(event.target.value)}
                  value={editDescription || selectedPlace.adminDescription}
                />
              </label>
              <label>
                {copy.adminNote}
                <textarea
                  onChange={(event) => setEditNote(event.target.value)}
                  value={editNote}
                />
              </label>
              <div className="admin-editor-actions">
                <button onClick={savePlaceDraft} type="button">
                  <FaSave /> {copy.saveDraft}
                </button>
                <button onClick={approvePlaceChanges} type="button">
                  <FaCheckCircle /> {copy.publish}
                </button>
              </div>
            </article>
          )}
        </section>
      )}

      {activeTab === "reports" && (
        <section className="admin-panel admin-full-page">
          <header>
            <FaClipboardList />
            <h2>{isEnglish ? "Report moderation" : "Moderacja zgloszen"}</h2>
          </header>
          <div className="admin-report-grid">
            {unresolvedReports.length === 0 && <p>{copy.noReports}</p>}
            {unresolvedReports.map((report) => (
              <article className={`admin-report-card status-${report.status}`} key={report.id}>
                <span>{reportLabels[report.type][language]}</span>
                <h3>{report.placeName}</h3>
                <p>{report.note}</p>
                <small>{formatDate(report.createdAt, language)}</small>
                <div>
                  {report.placeId && (
                    <button onClick={() => onShowPlace(report.placeId as number)} type="button">
                      <FaMapMarkerAlt /> {copy.map}
                    </button>
                  )}
                  <button onClick={() => resolveReport(report.id)} type="button">
                    <FaCheckCircle /> {copy.resolve}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "users" && (
        <section className="admin-panel admin-full-page">
          <header>
            <FaUsers />
            <h2>{isEnglish ? "Users and permissions" : "Uzytkownicy i uprawnienia"}</h2>
          </header>
          <div className="admin-users-table">
            {allUsers.map((user) => (
              <article key={user.email}>
                <span className={`role-chip role-${user.role ?? "user"}`}>{user.role ?? "user"}</span>
                <strong>{user.username}</strong>
                <small>{user.email}</small>
                <small>{copy.created}: {formatDate(user.created_at, language)}</small>
                <div>
                  <button onClick={() => updateUserRole(user.email, "caretaker")} type="button">
                    {copy.promote}
                  </button>
                  <button onClick={() => updateUserRole(user.email, "admin")} type="button">
                    {copy.makeAdmin}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "statistics" && (
        <section className="admin-panel admin-full-page">
          <header>
            <FaChartLine />
            <h2>{isEnglish ? "Project statistics" : "Statystyki projektu"}</h2>
          </header>
          <div className="admin-stats-grid">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <article key={category}>
                <span>
                  <strong>{category}</strong>
                  <small>{count}</small>
                </span>
                <div>
                  <i style={{ width: `${Math.max(8, (count / managedPlaces.length) * 100)}%` }} />
                </div>
              </article>
            ))}
            <article>
              <span>
                <strong>{isEnglish ? "Hidden entries" : "Ukryte wpisy"}</strong>
                <small>{hiddenPlacesCount}</small>
              </span>
              <div>
                <i style={{ width: `${Math.max(8, (hiddenPlacesCount / Math.max(1, managedPlaces.length)) * 100)}%` }} />
              </div>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}

function FaExclamationIcon() {
  return <FaTools />;
}

export default AdminPanel;
