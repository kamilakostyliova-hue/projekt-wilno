import { useEffect, useMemo, useState } from "react";
import {
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaDatabase,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaMapMarkerAlt,
  FaMinus,
  FaPlus,
  FaSave,
  FaShieldAlt,
  FaSignOutAlt,
  FaTasks,
  FaUserCog,
  FaUsers,
} from "react-icons/fa";
import type { AppLanguage, UserProfile, UserRole } from "../App";
import {
  fetchCaretakerAssignments,
  fetchCaretakerUpdates,
  fetchCareReports,
  saveCaretakerAssignments,
  updateCareReportStatus,
  type CaretakerAdminUpdate,
} from "../services/caretakerData";
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
  onShowPlace: (placeId: number) => void;
};

type AdminTab = "overview" | "people" | "reports" | "users" | "statistics";
type AdminReportFilter = "all" | CareReport["status"];

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

type CaretakerStatus = "active" | "needs_contact" | "new";

type AdminCaretakerRecord = {
  id: string;
  user: LocalAuthUser;
  status: CaretakerStatus;
  specialization: string;
  assignedPlaceIds: number[];
  completedActions: number;
  lastActive: string;
  activity: string[];
};

const reportsStorageKey = "rossa-care-reports";
const localUsersKey = "rossa-local-auth-users";
const adminDraftsKey = "rossa-admin-place-drafts";
const reviewStorageKey = "rossa-care-place-review";
const adminCaretakerNotesKey = "rossa-admin-caretaker-notes";
const adminCaretakerAssignmentsKey = "rossa-admin-caretaker-assignments";
const caretakerAdminUpdatesKey = "rossa-caretaker-admin-updates";

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

const readStringStorageRecord = (key: string): Record<string, string> => {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
};

const readNumberArrayStorageRecord = (key: string): Record<string, number[]> => {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, number[]>)
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

const writeCaretakerNotes = (notes: Record<string, string>) => {
  window.localStorage.setItem(adminCaretakerNotesKey, JSON.stringify(notes));
};

const writeCaretakerAssignments = (assignments: Record<string, number[]>) => {
  window.localStorage.setItem(adminCaretakerAssignmentsKey, JSON.stringify(assignments));
  window.dispatchEvent(new Event("rossa-admin-assignments-changed"));
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
  onShowPlace,
}: AdminPanelProps) {
  const isEnglish = language === "en";
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [reportFilter, setReportFilter] = useState<AdminReportFilter>("all");
  const [reports, setReports] = useState<CareReport[]>(() => readStorageArray<CareReport>(reportsStorageKey));
  const [users, setUsers] = useState<LocalAuthUser[]>(() => readStorageArray<LocalAuthUser>(localUsersKey));
  const [drafts, setDrafts] = useState<Record<number, AdminPlaceDraft>>(() => readStorageRecord<AdminPlaceDraft>(adminDraftsKey));
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(places[0]?.id ?? null);
  const [editDescription, setEditDescription] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [selectedCaretakerEmail, setSelectedCaretakerEmail] = useState("opiekun@na-rossie.local");
  const [caretakerNotes, setCaretakerNotes] = useState<Record<string, string>>(() => readStringStorageRecord(adminCaretakerNotesKey));
  const [caretakerAssignments, setCaretakerAssignments] = useState<Record<string, number[]>>(() =>
    readNumberArrayStorageRecord(adminCaretakerAssignmentsKey)
  );
  const [caretakerUpdates, setCaretakerUpdates] = useState<CaretakerAdminUpdate[]>(() =>
    readStorageArray<CaretakerAdminUpdate>(caretakerAdminUpdatesKey)
  );
  const [caretakerNoteDraft, setCaretakerNoteDraft] = useState("");
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

  const caretakerUsers = useMemo(() => {
    const roleUsers = allUsers.filter((user) => user.role === "caretaker");
    if (roleUsers.length > 0) return roleUsers;
    return allUsers.filter((user) => user.email === "opiekun@na-rossie.local");
  }, [allUsers]);

  const caretakerRecords = useMemo<AdminCaretakerRecord[]>(
    () =>
      caretakerUsers.map((user, index) => {
        const knownMainCaretaker = user.email === "opiekun@na-rossie.local";
        const defaultAssignedPlaceIds = knownMainCaretaker
          ? [1, 4, 10]
          : places
              .filter((_, placeIndex) => placeIndex % Math.max(1, caretakerUsers.length) === index)
              .slice(0, 4)
              .map((place) => place.id);
        const assignedPlaceIds = Array.isArray(caretakerAssignments[user.email])
          ? caretakerAssignments[user.email]
          : defaultAssignedPlaceIds;

        return {
          id: user.email,
          user,
          status: knownMainCaretaker ? "active" : index % 2 === 0 ? "active" : "needs_contact",
          specialization: knownMainCaretaker
            ? isEnglish
              ? "Historical graves, reports and field verification"
              : "Groby historyczne, zgloszenia i kontrola terenowa"
            : isEnglish
              ? "Assigned sector and photo verification"
              : "Przypisany sektor i weryfikacja zdjec",
          assignedPlaceIds,
          completedActions: knownMainCaretaker ? 18 : 6 + index * 3,
          lastActive: new Date(Date.now() - 1000 * 60 * (knownMainCaretaker ? 35 : 240 + index * 80)).toISOString(),
          activity: knownMainCaretaker
            ? isEnglish
              ? ["Closed two reports", "Approved grave photo", "Checked condition after winter"]
              : ["Zamknieto dwa zgloszenia", "Zatwierdzono zdjecie grobu", "Sprawdzono stan po zimie"]
            : isEnglish
              ? ["Updated assigned sector", "Added internal note", "Needs next field check"]
              : ["Zaktualizowano przypisany sektor", "Dodano notatke wewnetrzna", "Wymaga kolejnej kontroli"],
        };
      }),
    [caretakerAssignments, caretakerUsers, isEnglish, places]
  );

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
  const reportCounts: Record<AdminReportFilter, number> = {
    all: reports.length,
    new: reports.filter((report) => report.status === "new").length,
    review: reports.filter((report) => report.status === "review").length,
    resolved: reports.filter((report) => report.status === "resolved").length,
  };
  const filteredReports =
    reportFilter === "all"
      ? reports
      : reports.filter((report) => report.status === reportFilter);
  const hiddenPlacesCount = managedPlaces.filter((place) => place.isHidden).length;
  const draftCount = Object.keys(drafts).length;
  const reviewStates = readStorageRecord<{ status?: string }>(reviewStorageKey);
  const needsCareCount = Object.values(reviewStates).filter((item) =>
    ["check", "needs_care", "missing_photo", "missing_data"].includes(item.status ?? "")
  ).length;
  const selectedCaretaker = caretakerRecords.find((caretaker) => caretaker.id === selectedCaretakerEmail) ?? caretakerRecords[0] ?? null;
  const selectedCaretakerPlaceIds = new Set(selectedCaretaker?.assignedPlaceIds ?? []);
  const selectedCaretakerPlaces = managedPlaces.filter((place) => selectedCaretakerPlaceIds.has(place.id));
  const selectedCaretakerReports = unresolvedReports.filter(
    (report) => report.placeId !== null && selectedCaretakerPlaceIds.has(report.placeId)
  );
  const selectedCaretakerAttention = selectedCaretakerPlaces.filter((place) =>
    ["check", "needs_care", "missing_photo", "missing_data"].includes(reviewStates[place.id]?.status ?? "")
  );
  const selectedCaretakerUpdates = selectedCaretaker
    ? caretakerUpdates.filter((update) => update.caretakerEmail === selectedCaretaker.user.email)
    : [];
  const getCaretakersForPlace = (placeId: number) =>
    caretakerRecords.filter((caretaker) => caretaker.assignedPlaceIds.includes(placeId));
  const getCaretakerLabelForPlace = (placeId: number) => {
    const owners = getCaretakersForPlace(placeId);
    if (owners.length === 0) return isEnglish ? "No caretaker assigned" : "Brak opiekuna";
    return owners.map((owner) => owner.user.username).join(", ");
  };
  const getCaretakerLabelForCategory = (categoryLabel: string) => {
    const placeIds = managedPlaces
      .filter((place) => place.categoryLabel === categoryLabel)
      .map((place) => place.id);
    const owners = caretakerRecords.filter((caretaker) =>
      caretaker.assignedPlaceIds.some((placeId) => placeIds.includes(placeId))
    );
    if (owners.length === 0) return isEnglish ? "No caretaker assigned" : "Brak opiekuna";
    return Array.from(new Set(owners.map((owner) => owner.user.username))).join(", ");
  };
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
        noReportsInFilter: "No reports in this status.",
        allReports: "All",
        newReports: "New",
        reviewReports: "In review",
        resolvedReports: "Resolved",
        markReview: "Take into review",
        reopen: "Reopen",
        statusNew: "New",
        statusReview: "In review",
        statusResolved: "Resolved",
        resolve: "Resolve",
        role: "Role",
        created: "Created",
        promote: "Make caretaker",
        makeAdmin: "Make admin",
        caretakersTitle: "Caretakers and responsibilities",
        caretakersLead: "Admin can see who cares for each place, open reports and recent activity.",
        assignedPlaces: "assigned places",
        openReports: "open reports",
        attention: "need attention",
        completed: "completed actions",
        lastActive: "Last active",
        adminCaretakerNote: "Admin note about this caretaker",
        saveCaretakerNote: "Save caretaker note",
        recentActivity: "Recent activity",
        reviewPlace: "Review",
        manageAssignments: "Manage assigned places",
        assignmentHint: "Add or remove graves assigned to this caretaker.",
        assign: "Assign",
        removeAssignment: "Remove",
        assigned: "Assigned",
        unassigned: "Not assigned",
        caretakerOwner: "Caretaker",
        caretakerReports: "Caretaker reports",
        noCaretakerReports: "This caretaker has not sent a report yet.",
      }
    : {
        accessTitle: "Dostep administratora",
        accessLead: "Zaloguj sie jako Administrator, zeby zarzadzac projektem, uzytkownikami i trescia.",
        login: "Otworz logowanie",
        heroEyebrow: "Administrator systemu",
        heroTitle: "Centrum administracji",
        heroLead: "Pelny widok kontroli katalogu, zgloszen, uzytkownikow, moderacji i statystyk projektu.",
        logout: "Wyloguj",
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
        noReportsInFilter: "Brak zgloszen w tym statusie.",
        allReports: "Wszystkie",
        newReports: "Nowe",
        reviewReports: "W trakcie",
        resolvedReports: "Rozwiazane",
        markReview: "Przyjmij do pracy",
        reopen: "Otworz ponownie",
        statusNew: "Nowe",
        statusReview: "W trakcie",
        statusResolved: "Rozwiazane",
        resolve: "Rozwiaz",
        role: "Rola",
        created: "Utworzono",
        promote: "Nadaj opiekuna",
        makeAdmin: "Nadaj admina",
        caretakersTitle: "Opiekunowie i odpowiedzialnosc",
        caretakersLead: "Administrator widzi, kto opiekuje sie miejscami, jakie sa zgloszenia i ostatnie dzialania.",
        assignedPlaces: "przypisane miejsca",
        openReports: "otwarte zgloszenia",
        attention: "wymaga uwagi",
        completed: "wykonane dzialania",
        lastActive: "Ostatnia aktywnosc",
        adminCaretakerNote: "Notatka administratora o opiekunie",
        saveCaretakerNote: "Zapisz notatke opiekuna",
        recentActivity: "Ostatnia aktywnosc",
        reviewPlace: "Kontrola",
        manageAssignments: "Zarzadzaj przypisanymi miejscami",
        assignmentHint: "Dodaj albo usun groby przypisane temu opiekunowi.",
        assign: "Przypisz",
        removeAssignment: "Usun",
        assigned: "Przypisane",
        unassigned: "Nieprzypisane",
        caretakerOwner: "Opiekun",
        caretakerReports: "Raporty opiekuna",
        noCaretakerReports: "Ten opiekun nie wyslal jeszcze raportu.",
      };

  const reportFilterOptions: Array<{ id: AdminReportFilter; label: string }> = [
    { id: "all", label: copy.allReports },
    { id: "new", label: copy.newReports },
    { id: "review", label: copy.reviewReports },
    { id: "resolved", label: copy.resolvedReports },
  ];

  const reportStatusLabels: Record<CareReport["status"], string> = {
    new: copy.statusNew,
    review: copy.statusReview,
    resolved: copy.statusResolved,
  };

  useEffect(() => {
    const refreshAdminStorage = () => {
      setReports(readStorageArray<CareReport>(reportsStorageKey));
      setUsers(readStorageArray<LocalAuthUser>(localUsersKey));
      setDrafts(readStorageRecord<AdminPlaceDraft>(adminDraftsKey));
      setCaretakerNotes(readStringStorageRecord(adminCaretakerNotesKey));
      setCaretakerAssignments(readNumberArrayStorageRecord(adminCaretakerAssignmentsKey));
      setCaretakerUpdates(readStorageArray<CaretakerAdminUpdate>(caretakerAdminUpdatesKey));
    };

    window.addEventListener("storage", refreshAdminStorage);
    window.addEventListener("rossa-care-reports-changed", refreshAdminStorage);
    window.addEventListener("rossa-admin-assignments-changed", refreshAdminStorage);
    window.addEventListener("rossa-admin-notes-changed", refreshAdminStorage);
    window.addEventListener("rossa-caretaker-updates-changed", refreshAdminStorage);
    return () => {
      window.removeEventListener("storage", refreshAdminStorage);
      window.removeEventListener("rossa-care-reports-changed", refreshAdminStorage);
      window.removeEventListener("rossa-admin-assignments-changed", refreshAdminStorage);
      window.removeEventListener("rossa-admin-notes-changed", refreshAdminStorage);
      window.removeEventListener("rossa-caretaker-updates-changed", refreshAdminStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncCaretakerData = async () => {
      const [remoteAssignments, remoteUpdates, remoteReports] = await Promise.all([
        fetchCaretakerAssignments(),
        fetchCaretakerUpdates(),
        fetchCareReports(),
      ]);
      if (cancelled) return;

      if (remoteAssignments) {
        setCaretakerAssignments(remoteAssignments);
        writeCaretakerAssignments(remoteAssignments);
      }
      if (remoteUpdates) {
        setCaretakerUpdates(remoteUpdates);
        window.localStorage.setItem(
          caretakerAdminUpdatesKey,
          JSON.stringify(remoteUpdates)
        );
      }
      if (remoteReports) {
        setReports(remoteReports as CareReport[]);
        writeReports(remoteReports as CareReport[]);
      }
    };

    void syncCaretakerData();
    return () => {
      cancelled = true;
    };
  }, []);

  const openEditor = (placeId: number) => {
    const place = managedPlaces.find((item) => item.id === placeId);
    if (!place) return;

    setSelectedPlaceId(placeId);
    setEditDescription(place.adminDescription);
    setEditCategory(place.adminCategory);
    setEditNote(place.adminDraft?.note ?? "");
    setActiveTab("people");
  };

  useEffect(() => {
    if (!selectedCaretaker) return;
    setCaretakerNoteDraft(caretakerNotes[selectedCaretaker.id] ?? "");
  }, [caretakerNotes, selectedCaretaker]);

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

  const setReportStatus = async (reportId: string, status: CareReport["status"]) => {
    await updateCareReportStatus(reportId, status);
    const nextReports = reports.map((report) =>
      report.id === reportId ? { ...report, status } : report
    );
    setReports(nextReports);
    writeReports(nextReports);
  };

  const resolveReport = (reportId: string) => {
    void setReportStatus(reportId, "resolved");
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

  const saveCaretakerNote = () => {
    if (!selectedCaretaker) return;

    const nextNotes = {
      ...caretakerNotes,
      [selectedCaretaker.id]: caretakerNoteDraft,
    };
    setCaretakerNotes(nextNotes);
    writeCaretakerNotes(nextNotes);
  };

  const toggleCaretakerAssignment = (placeId: number) => {
    if (!selectedCaretaker) return;

    const nextAssignedIds = new Set(selectedCaretaker.assignedPlaceIds);
    if (nextAssignedIds.has(placeId)) {
      nextAssignedIds.delete(placeId);
    } else {
      nextAssignedIds.add(placeId);
    }

    const nextAssignments = {
      ...caretakerAssignments,
      [selectedCaretaker.id]: Array.from(nextAssignedIds),
    };
    setCaretakerAssignments(nextAssignments);
    writeCaretakerAssignments(nextAssignments);
    void saveCaretakerAssignments(
      selectedCaretaker.id,
      nextAssignments[selectedCaretaker.id],
      currentUser?.email
    );
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
                    <small className="admin-owner-line">
                      {copy.caretakerOwner}: {getCaretakerLabelForPlace(place.id)}
                    </small>
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
                <small className="admin-owner-line">
                  {copy.caretakerOwner}: {getCaretakerLabelForPlace(selectedPlace.id)}
                </small>
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
          <div className="report-dashboard-head">
            <div className="report-filter-tabs" aria-label={isEnglish ? "Report status filter" : "Filtr statusu zgloszen"}>
              {reportFilterOptions.map((filter) => (
                <button
                  className={reportFilter === filter.id ? "active" : ""}
                  key={filter.id}
                  onClick={() => setReportFilter(filter.id)}
                  type="button"
                >
                  <span>{filter.label}</span>
                  <strong>{reportCounts[filter.id]}</strong>
                </button>
              ))}
            </div>
          </div>
          <div className="admin-report-grid">
            {filteredReports.length === 0 && <p className="admin-empty-state">{copy.noReportsInFilter}</p>}
            {filteredReports.map((report) => (
              <article className={`admin-report-card status-${report.status}`} key={report.id}>
                <span>{reportLabels[report.type][language]}</span>
                <h3>{report.placeName}</h3>
                <p>{report.note}</p>
                <div className="report-card-meta">
                  <small>{formatDate(report.createdAt, language)}</small>
                  <small className={`report-status-chip status-${report.status}`}>
                    {reportStatusLabels[report.status]}
                  </small>
                </div>
                {report.placeId && (
                  <small className="admin-owner-line">
                    {copy.caretakerOwner}: {getCaretakerLabelForPlace(report.placeId)}
                  </small>
                )}
                <div>
                  {report.placeId && (
                    <button onClick={() => onShowPlace(report.placeId as number)} type="button">
                      <FaMapMarkerAlt /> {copy.map}
                    </button>
                  )}
                  {report.status !== "review" && report.status !== "resolved" && (
                    <button onClick={() => void setReportStatus(report.id, "review")} type="button">
                      <FaClipboardList /> {copy.markReview}
                    </button>
                  )}
                  {report.status !== "resolved" ? (
                    <button onClick={() => resolveReport(report.id)} type="button">
                      <FaCheckCircle /> {copy.resolve}
                    </button>
                  ) : (
                    <button onClick={() => void setReportStatus(report.id, "new")} type="button">
                      <FaEdit /> {copy.reopen}
                    </button>
                  )}
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

          {selectedCaretaker && (
            <div className="admin-caretaker-section">
              <header>
                <FaUserCog />
                <span>
                  <h2>{copy.caretakersTitle}</h2>
                  <p>{copy.caretakersLead}</p>
                </span>
              </header>

              <div className="admin-caretaker-layout">
                <div className="admin-caretaker-list">
                  {caretakerRecords.map((caretaker) => {
                    const assignedIds = new Set(caretaker.assignedPlaceIds);
                    const reportCount = unresolvedReports.filter(
                      (report) => report.placeId !== null && assignedIds.has(report.placeId)
                    ).length;
                    const attentionCount = managedPlaces.filter((place) =>
                      assignedIds.has(place.id) &&
                      ["check", "needs_care", "missing_photo", "missing_data"].includes(reviewStates[place.id]?.status ?? "")
                    ).length;

                    return (
                      <button
                        className={`admin-caretaker-card ${selectedCaretaker.id === caretaker.id ? "active" : ""}`}
                        key={caretaker.id}
                        onClick={() => setSelectedCaretakerEmail(caretaker.id)}
                        type="button"
                      >
                        <span className={`caretaker-status-dot status-${caretaker.status}`} />
                        <strong>{caretaker.user.username}</strong>
                        <small>{caretaker.specialization}</small>
                        <b>{caretaker.assignedPlaceIds.length} {copy.assignedPlaces}</b>
                        <em>{reportCount} {copy.openReports} - {attentionCount} {copy.attention}</em>
                      </button>
                    );
                  })}
                </div>

                <article className="admin-caretaker-detail">
                  <div className="admin-caretaker-head">
                    <div>
                      <span className={`caretaker-status-pill status-${selectedCaretaker.status}`}>
                        {selectedCaretaker.status === "active"
                          ? isEnglish ? "Active" : "Aktywny"
                          : selectedCaretaker.status === "needs_contact"
                            ? isEnglish ? "Needs contact" : "Do kontaktu"
                            : isEnglish ? "New caretaker" : "Nowy opiekun"}
                      </span>
                      <h3>{selectedCaretaker.user.username}</h3>
                      <p>{selectedCaretaker.specialization}</p>
                    </div>
                    <div className="admin-caretaker-contact">
                      <span>{selectedCaretaker.user.email}</span>
                      <small>{copy.lastActive}: {formatDate(selectedCaretaker.lastActive, language)}</small>
                    </div>
                  </div>

                  <div className="admin-caretaker-stats">
                    <span><strong>{selectedCaretakerPlaces.length}</strong>{copy.assignedPlaces}</span>
                    <span><strong>{selectedCaretakerReports.length}</strong>{copy.openReports}</span>
                    <span><strong>{selectedCaretakerAttention.length}</strong>{copy.attention}</span>
                    <span><strong>{selectedCaretaker.completedActions}</strong>{copy.completed}</span>
                  </div>

                  <div className="admin-assigned-list">
                    {selectedCaretakerPlaces.map((place) => {
                      const state = reviewStates[place.id]?.status ?? "good";

                      return (
                        <article className={`admin-assigned-place state-${state}`} key={place.id}>
                          <img alt={place.name} src={place.image} />
                          <span>
                            <strong>{place.name}</strong>
                            <small>{place.categoryLabel} - {place.years}</small>
                            <small>{copy.caretakerOwner}: {selectedCaretaker.user.username}</small>
                            <em>{state === "good" ? (isEnglish ? "Good" : "Zadbany") : state}</em>
                          </span>
                          <button onClick={() => openEditor(place.id)} type="button">
                            <FaTasks /> {copy.reviewPlace}
                          </button>
                          <button onClick={() => onShowPlace(place.id)} type="button">
                            <FaMapMarkerAlt /> {copy.map}
                          </button>
                        </article>
                      );
                    })}
                  </div>

                  <div className="admin-assignment-manager">
                    <div>
                      <strong>{copy.manageAssignments}</strong>
                      <p>{copy.assignmentHint}</p>
                    </div>

                    <div className="admin-assignment-list">
                      {managedPlaces.map((place) => {
                        const isAssigned = selectedCaretakerPlaceIds.has(place.id);

                        return (
                          <article className={isAssigned ? "is-assigned" : ""} key={place.id}>
                            <img alt={place.name} src={place.image} />
                            <span>
                              <strong>{place.name}</strong>
                              <small>{place.categoryLabel}</small>
                              <em>{isAssigned ? copy.assigned : copy.unassigned}</em>
                            </span>
                            <button onClick={() => toggleCaretakerAssignment(place.id)} type="button">
                              {isAssigned ? <FaMinus /> : <FaPlus />}
                              {isAssigned ? copy.removeAssignment : copy.assign}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </div>

                  <div className="admin-caretaker-bottom">
                    <label>
                      {copy.adminCaretakerNote}
                      <textarea
                        onChange={(event) => setCaretakerNoteDraft(event.target.value)}
                        placeholder={isEnglish ? "Example: reliable, checks winter reports first..." : "Np. aktywny, sprawdza najpierw zgloszenia po zimie..."}
                        value={caretakerNoteDraft}
                      />
                      <button onClick={saveCaretakerNote} type="button">
                        <FaSave /> {copy.saveCaretakerNote}
                      </button>
                    </label>

                    <div className="admin-caretaker-activity">
                      <strong>{copy.recentActivity}</strong>
                      {selectedCaretaker.activity.map((activity) => (
                        <span key={activity}>
                          <FaCheckCircle /> {activity}
                        </span>
                      ))}

                      <div className="admin-caretaker-updates">
                        <strong>{copy.caretakerReports}</strong>
                        {selectedCaretakerUpdates.length === 0 ? (
                          <p>{copy.noCaretakerReports}</p>
                        ) : (
                          selectedCaretakerUpdates.slice(0, 4).map((update) => (
                            <article key={update.id}>
                              <small>{formatDate(update.createdAt, language)}</small>
                              <p>{update.note}</p>
                              <em>
                                {update.assignedCount} {copy.assignedPlaces} - {update.openTasksCount} {isEnglish ? "open tasks" : "otwartych zadan"}
                              </em>
                            </article>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          )}
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
                <small className="admin-owner-line">
                  {copy.caretakerOwner}: {getCaretakerLabelForCategory(category)}
                </small>
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
  return <FaShieldAlt />;
}

export default AdminPanel;
