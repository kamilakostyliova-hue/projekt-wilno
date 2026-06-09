import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClipboardList,
  FaEdit,
  FaExclamationTriangle,
  FaImage,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaShieldAlt,
  FaSignOutAlt,
  FaTasks,
  FaTools,
  FaUsers,
  FaUserShield,
} from "react-icons/fa";
import type { AppLanguage, UserProfile } from "../App";
import {
  fetchCaretakerAssignments,
  fetchCaretakerUpdates,
  fetchCareReports,
  saveCaretakerUpdate,
  updateCareReportStatus,
  type CaretakerAdminUpdate,
} from "../services/caretakerData";
import "./CaretakerPanel.css";

type CaretakerPlace = {
  id: number;
  name: string;
  years: string;
  category: string;
  categoryLabel: string;
  image: string;
  description?: string;
  source?: string;
  shortDescription: string;
  position: [number, number];
};

type GraveStatus = "good" | "check" | "needs_care" | "missing_photo" | "missing_data";
type ReportStatus = "new" | "review" | "resolved";
type ReportFilter = "all" | ReportStatus;
type ReviewTaskKind = "danger" | "warning" | "info" | "done";
export type ReportType = "missing_photo" | "wrong_description" | "needs_care" | "wrong_location" | "missing_person" | "other";
type CareTaskPriority = "high" | "medium" | "low";
type CareTaskKind = "report" | "condition" | "photo" | "data";

type CaretakerStatus = "active" | "needs_contact" | "new";

type CaretakerRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CaretakerStatus;
  specialization: string;
  assignedPlaceIds: number[];
  completedActions: number;
  lastActive: string;
  activity: string[];
};

export type CareReport = {
  id: string;
  placeId: number | null;
  placeName: string;
  type: ReportType;
  note: string;
  status: ReportStatus;
  createdAt: string;
};

type CaretakerPanelProps = {
  currentUser: UserProfile | null;
  language: AppLanguage;
  places: CaretakerPlace[];
  onLoginClick: () => void;
  onLogout: () => void;
  onShowPlace: (placeId: number) => void;
};

const reportsStorageKey = "rossa-care-reports";
const reviewStorageKey = "rossa-care-place-review";
const adminNotesStorageKey = "rossa-admin-caretaker-notes";
const adminCaretakerAssignmentsKey = "rossa-admin-caretaker-assignments";
const caretakerAdminUpdatesKey = "rossa-caretaker-admin-updates";

type PlaceReviewState = {
  status?: GraveStatus;
  approvedDescription?: boolean;
  approvedLocation?: boolean;
  approvedPhoto?: boolean;
  note?: string;
  updatedAt?: string;
};

type ReviewTask = {
  id: "photo" | "description" | "location" | "condition" | "reports";
  label: string;
  detail: string;
  kind: ReviewTaskKind;
  done: boolean;
};

type CareTask = {
  id: string;
  placeId: number;
  title: string;
  subtitle: string;
  detail: string;
  priority: CareTaskPriority;
  kind: CareTaskKind;
  status: GraveStatus;
  reportIds: string[];
  reportCount: number;
};

const statusLabels: Record<GraveStatus, { pl: string; en: string }> = {
  good: { pl: "Zadbany", en: "Good" },
  check: { pl: "Do sprawdzenia", en: "Needs check" },
  needs_care: { pl: "Potrzebuje opieki", en: "Needs care" },
  missing_photo: { pl: "Brak zdjecia", en: "Missing photo" },
  missing_data: { pl: "Brak danych", en: "Missing data" },
};

const reportLabels: Record<ReportType, { pl: string; en: string }> = {
  missing_photo: { pl: "Brakuje zdjecia", en: "Missing photo" },
  wrong_description: { pl: "Zly opis", en: "Wrong description" },
  needs_care: { pl: "Grob wymaga opieki", en: "Grave needs care" },
  wrong_location: { pl: "Nieprawidlowa lokalizacja", en: "Wrong location" },
  missing_person: { pl: "Brakujaca postac", en: "Missing person" },
  other: { pl: "Inna uwaga", en: "Other note" },
};

const reportStatusLabels: Record<ReportStatus, { pl: string; en: string }> = {
  new: { pl: "Nowe", en: "New" },
  review: { pl: "W trakcie", en: "In review" },
  resolved: { pl: "Rozwiazane", en: "Resolved" },
};

const careTaskPriorityLabels: Record<CareTaskPriority, { pl: string; en: string }> = {
  high: { pl: "Pilne", en: "Urgent" },
  medium: { pl: "Wazne", en: "Important" },
  low: { pl: "Do uzupelnienia", en: "To update" },
};

const careTaskKindLabels: Record<CareTaskKind, { pl: string; en: string }> = {
  report: { pl: "Zgloszenie", en: "Report" },
  condition: { pl: "Stan grobu", en: "Grave condition" },
  photo: { pl: "Zdjecie", en: "Photo" },
  data: { pl: "Dane", en: "Data" },
};

const demoStatusByPlaceId: Record<number, GraveStatus> = {
  1: "good",
  2: "check",
  4: "needs_care",
  7: "missing_data",
  10: "missing_photo",
};

const caretakerStatusLabels: Record<CaretakerStatus, { pl: string; en: string }> = {
  active: { pl: "Aktywny", en: "Active" },
  needs_contact: { pl: "Do kontaktu", en: "Needs contact" },
  new: { pl: "Nowy opiekun", en: "New caretaker" },
};

const readReports = (): CareReport[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(reportsStorageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? (parsed as CareReport[]) : [];
  } catch {
    return [];
  }
};

const readReviewStates = (): Record<number, PlaceReviewState> => {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(reviewStorageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<number, PlaceReviewState>)
      : {};
  } catch {
    return {};
  }
};

const readAdminNotes = (): Record<string, string> => {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(adminNotesStorageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
};

const readNumberArrayRecord = (key: string): Record<string, number[]> => {
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

const readCaretakerUpdates = (): CaretakerAdminUpdate[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(caretakerAdminUpdatesKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? (parsed as CaretakerAdminUpdate[]) : [];
  } catch {
    return [];
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

function CaretakerPanel({
  currentUser,
  language,
  places,
  onLoginClick,
  onLogout,
  onShowPlace,
}: CaretakerPanelProps) {
  const [reports, setReports] = useState<CareReport[]>(() => readReports());
  const [reportFilter, setReportFilter] = useState<ReportFilter>("all");
  const [reviewStates, setReviewStates] = useState<Record<number, PlaceReviewState>>(() => readReviewStates());
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>(() => readAdminNotes());
  const [caretakerAssignments, setCaretakerAssignments] = useState<Record<string, number[]>>(() =>
    readNumberArrayRecord(adminCaretakerAssignmentsKey)
  );
  const [caretakerUpdates, setCaretakerUpdates] = useState<CaretakerAdminUpdate[]>(() => readCaretakerUpdates());
  const [caretakerUpdateDraft, setCaretakerUpdateDraft] = useState("");
  const [selectedCaretakerId, setSelectedCaretakerId] = useState("rossa-main");
  const [adminNoteDraft, setAdminNoteDraft] = useState("");
  const isEnglish = language === "en";
  const isAdmin = currentUser?.role === "admin";
  const hasAccess = currentUser?.role === "caretaker" || isAdmin;

  useEffect(() => {
    const refresh = () => {
      setReports(readReports());
      setReviewStates(readReviewStates());
      setAdminNotes(readAdminNotes());
      setCaretakerAssignments(readNumberArrayRecord(adminCaretakerAssignmentsKey));
      setCaretakerUpdates(readCaretakerUpdates());
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("rossa-care-reports-changed", refresh);
    window.addEventListener("rossa-care-review-changed", refresh);
    window.addEventListener("rossa-admin-notes-changed", refresh);
    window.addEventListener("rossa-admin-assignments-changed", refresh);
    window.addEventListener("rossa-caretaker-updates-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("rossa-care-reports-changed", refresh);
      window.removeEventListener("rossa-care-review-changed", refresh);
      window.removeEventListener("rossa-admin-notes-changed", refresh);
      window.removeEventListener("rossa-admin-assignments-changed", refresh);
      window.removeEventListener("rossa-caretaker-updates-changed", refresh);
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
        window.localStorage.setItem(
          adminCaretakerAssignmentsKey,
          JSON.stringify(remoteAssignments)
        );
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
        window.localStorage.setItem(reportsStorageKey, JSON.stringify(remoteReports));
      }
    };

    void syncCaretakerData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlaceId) {
      setReviewNote("");
      return;
    }

    setReviewNote(reviewStates[selectedPlaceId]?.note ?? "");
  }, [reviewStates, selectedPlaceId]);

  useEffect(() => {
    setAdminNoteDraft(adminNotes[selectedCaretakerId] ?? "");
  }, [adminNotes, selectedCaretakerId]);

  const demoReports = useMemo<CareReport[]>(
    () => [
      {
        id: "demo-report-1",
        placeId: 4,
        placeName: places.find((place) => place.id === 4)?.name ?? "Antoni Wiwulski",
        type: "needs_care",
        note: isEnglish ? "Demo report: check grave condition after winter." : "Zgloszenie demo: sprawdzic stan grobu po zimie.",
        status: "new",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      },
      {
        id: "demo-report-2",
        placeId: 10,
        placeName: places.find((place) => place.id === 10)?.name ?? "Balys Sruoga",
        type: "missing_photo",
        note: isEnglish ? "Demo report: add a newer grave photo." : "Zgloszenie demo: dodac nowsze zdjecie grobu.",
        status: "review",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      },
      {
        id: "demo-report-3",
        placeId: 1,
        placeName: places.find((place) => place.id === 1)?.name ?? "Jozef Pilsudski",
        type: "wrong_description",
        note: isEnglish
          ? "Demo report: visitor suggests adding information about the heart of the marshal."
          : "Zgloszenie demo: odwiedzajacy proponuje dopisac informacje o sercu marszalka.",
        status: "new",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
      },
      {
        id: "demo-report-4",
        placeId: 2,
        placeName: places.find((place) => place.id === 2)?.name ?? "Wladyslaw Syrokomla",
        type: "wrong_location",
        note: isEnglish
          ? "Demo report: marker seems shifted from the actual grave path."
          : "Zgloszenie demo: marker wyglada na przesuniety wzgledem alejki przy grobie.",
        status: "review",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
      },
      {
        id: "demo-report-5",
        placeId: 7,
        placeName: places.find((place) => place.id === 7)?.name ?? "Czeslaw Jankowski",
        type: "missing_person",
        note: isEnglish
          ? "Demo report: add a short biographical note and verify dates."
          : "Zgloszenie demo: dodac krotka note biograficzna i sprawdzic daty.",
        status: "new",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 55).toISOString(),
      },
      {
        id: "demo-report-6",
        placeId: 4,
        placeName: places.find((place) => place.id === 4)?.name ?? "Antoni Wiwulski",
        type: "other",
        note: isEnglish
          ? "Demo report: cleaned inscription area, photo confirmation is needed."
          : "Zgloszenie demo: oczyszczono miejsce przy inskrypcji, potrzebne potwierdzenie zdjeciem.",
        status: "resolved",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      },
    ],
    [isEnglish, places]
  );

  const allReports = useMemo(() => {
    const reportIds = new Set(reports.map((report) => report.id));
    return [...reports, ...demoReports.filter((report) => !reportIds.has(report.id))];
  }, [demoReports, reports]);

  const caretakers = useMemo<CaretakerRecord[]>(
    () =>
      isEnglish
        ? [
            {
              id: "rossa-main",
              name: "Rasos caretaker",
              email: "opiekun@na-rossie.local",
              phone: "+370 600 10 204",
              status: "active",
              specialization: "Historical graves and visitor reports",
              assignedPlaceIds: caretakerAssignments["opiekun@na-rossie.local"] ?? [1, 4, 10],
              completedActions: 18,
              lastActive: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
              activity: ["Closed 2 user reports", "Approved a grave photo", "Updated condition after inspection"],
            },
            {
              id: "poets-care",
              name: "Maria Nowicka",
              email: "maria.opiekun@rossa.local",
              phone: "+48 510 420 119",
              status: "active",
              specialization: "Poets and artists",
              assignedPlaceIds: caretakerAssignments["maria.opiekun@rossa.local"] ?? [2, 3, 7],
              completedActions: 11,
              lastActive: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
              activity: ["Added note about inscriptions", "Checked artist route", "Marked one grave as cared for"],
            },
            {
              id: "field-check",
              name: "Tomasz Wysocki",
              email: "tomasz.check@rossa.local",
              phone: "+48 604 777 321",
              status: "needs_contact",
              specialization: "Location checks and field photos",
              assignedPlaceIds: caretakerAssignments["tomasz.check@rossa.local"] ?? [5, 6, 8, 9],
              completedActions: 7,
              lastActive: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
              activity: ["Uploaded field notes", "Needs confirmation for two markers", "No activity today"],
            },
          ]
        : [
            {
              id: "rossa-main",
              name: "Opiekun Rossy",
              email: "opiekun@na-rossie.local",
              phone: "+370 600 10 204",
              status: "active",
              specialization: "Groby historyczne i zgloszenia zwiedzajacych",
              assignedPlaceIds: caretakerAssignments["opiekun@na-rossie.local"] ?? [1, 4, 10],
              completedActions: 18,
              lastActive: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
              activity: ["Zamknieto 2 zgloszenia", "Zatwierdzono zdjecie grobu", "Zmieniono status po kontroli"],
            },
            {
              id: "poets-care",
              name: "Maria Nowicka",
              email: "maria.opiekun@rossa.local",
              phone: "+48 510 420 119",
              status: "active",
              specialization: "Poeci i artysci",
              assignedPlaceIds: caretakerAssignments["maria.opiekun@rossa.local"] ?? [2, 3, 7],
              completedActions: 11,
              lastActive: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
              activity: ["Dodano notatke o inskrypcjach", "Sprawdzono trase artystow", "Oznaczono jeden grob jako zadbany"],
            },
            {
              id: "field-check",
              name: "Tomasz Wysocki",
              email: "tomasz.check@rossa.local",
              phone: "+48 604 777 321",
              status: "needs_contact",
              specialization: "Lokalizacje i zdjecia terenowe",
              assignedPlaceIds: caretakerAssignments["tomasz.check@rossa.local"] ?? [5, 6, 8, 9],
              completedActions: 7,
              lastActive: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
              activity: ["Wgrano notatki terenowe", "Dwa markery wymagaja potwierdzenia", "Brak aktywnosci dzisiaj"],
            },
          ],
    [caretakerAssignments, isEnglish]
  );

  const statusRows = useMemo(
    () =>
      places.map((place) => ({
        place,
        status: reviewStates[place.id]?.status ?? demoStatusByPlaceId[place.id] ?? "good",
      })),
    [places, reviewStates]
  );
  const selectedCaretaker = caretakers.find((caretaker) => caretaker.id === selectedCaretakerId) ?? caretakers[0];
  const currentCaretaker =
    caretakers.find((caretaker) => caretaker.email === currentUser?.email) ?? caretakers[0];
  const activeCaretaker = isAdmin ? selectedCaretaker : currentCaretaker;
  const visiblePlaceIds = new Set(isAdmin ? places.map((place) => place.id) : activeCaretaker.assignedPlaceIds);
  const visiblePlaces = places.filter((place) => visiblePlaceIds.has(place.id));
  const visibleStatusRows = statusRows.filter((row) => visiblePlaceIds.has(row.place.id));
  const visibleReports = isAdmin
    ? allReports
    : allReports.filter((report) => report.placeId !== null && visiblePlaceIds.has(report.placeId));
  const needsCare = visibleStatusRows.filter((row) => row.status === "needs_care" || row.status === "check");
  const missingPhoto = visibleStatusRows.filter((row) => row.status === "missing_photo");
  const unresolvedReports = visibleReports.filter((report) => report.status !== "resolved");
  const reportCounts: Record<ReportFilter, number> = {
    all: visibleReports.length,
    new: visibleReports.filter((report) => report.status === "new").length,
    review: visibleReports.filter((report) => report.status === "review").length,
    resolved: visibleReports.filter((report) => report.status === "resolved").length,
  };
  const filteredVisibleReports =
    reportFilter === "all"
      ? visibleReports
      : visibleReports.filter((report) => report.status === reportFilter);
  const reportFilterOptions: Array<{ id: ReportFilter; label: string }> = [
    { id: "all", label: isEnglish ? "All" : "Wszystkie" },
    { id: "new", label: reportStatusLabels.new[language] },
    { id: "review", label: reportStatusLabels.review[language] },
    { id: "resolved", label: reportStatusLabels.resolved[language] },
  ];
  const careTaskQueue = useMemo<CareTask[]>(() => {
    const priorityRank: Record<CareTaskPriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };
    const reportsByPlace = new Map<number, CareReport[]>();

    unresolvedReports.forEach((report) => {
      if (report.placeId === null) return;
      const current = reportsByPlace.get(report.placeId) ?? [];
      reportsByPlace.set(report.placeId, [...current, report]);
    });

    return visibleStatusRows
      .map<CareTask | null>(({ place, status }) => {
        const placeReports = reportsByPlace.get(place.id) ?? [];
        if (status === "good" && placeReports.length === 0) return null;

        const hasCriticalReport = placeReports.some(
          (report) => report.type === "needs_care" || report.type === "wrong_location"
        );
        const hasPhotoReport = placeReports.some((report) => report.type === "missing_photo");
        const hasDataReport = placeReports.some(
          (report) => report.type === "wrong_description" || report.type === "missing_person"
        );
        const priority: CareTaskPriority =
          status === "needs_care" || hasCriticalReport
            ? "high"
            : status === "check" || status === "missing_data" || placeReports.length > 0
              ? "medium"
              : "low";
        const kind: CareTaskKind =
          placeReports.length > 0
            ? "report"
            : status === "needs_care" || status === "check"
              ? "condition"
              : status === "missing_photo" || hasPhotoReport
                ? "photo"
                : status === "missing_data" || hasDataReport
                  ? "data"
                  : "condition";
        const reportText =
          placeReports.length === 0
            ? isEnglish
              ? "no open reports"
              : "brak otwartych zgloszen"
            : isEnglish
              ? `${placeReports.length} open report${placeReports.length > 1 ? "s" : ""}`
              : `${placeReports.length} otwarte zgloszen${placeReports.length === 1 ? "ie" : ""}`;

        return {
          id: `care-task-${place.id}-${status}-${placeReports.map((report) => report.id).join("-")}`,
          placeId: place.id,
          title: place.name,
          subtitle: `${statusLabels[status][language]} - ${place.categoryLabel}`,
          detail: isEnglish
            ? `${reportText}. Check the record and update the care status.`
            : `${reportText}. Sprawdz karte i zaktualizuj status opieki.`,
          priority,
          kind,
          status,
          reportIds: placeReports.map((report) => report.id),
          reportCount: placeReports.length,
        };
      })
      .filter((task): task is CareTask => task !== null)
      .sort((first, second) => {
        const priorityDiff = priorityRank[second.priority] - priorityRank[first.priority];
        if (priorityDiff !== 0) return priorityDiff;
        const reportDiff = second.reportCount - first.reportCount;
        if (reportDiff !== 0) return reportDiff;
        return first.title.localeCompare(second.title);
      });
  }, [isEnglish, language, unresolvedReports, visibleStatusRows]);
  const activeCaretakerAdminNote = adminNotes[activeCaretaker.id] ?? adminNotes[activeCaretaker.email] ?? "";
  const selectedCaretakerPlaceIds = new Set(selectedCaretaker?.assignedPlaceIds ?? []);
  const selectedCaretakerPlaces = places.filter((place) => selectedCaretakerPlaceIds.has(place.id));
  const selectedCaretakerReports = allReports.filter(
    (report) => report.placeId !== null && selectedCaretakerPlaceIds.has(report.placeId) && report.status !== "resolved"
  );
  const selectedCaretakerAttention = statusRows.filter(
    (row) => selectedCaretakerPlaceIds.has(row.place.id) && row.status !== "good"
  );
  const activeCaretakersCount = caretakers.filter((caretaker) => caretaker.status === "active").length;
  const selectedRow = visibleStatusRows.find((row) => row.place.id === selectedPlaceId) ?? null;
  const selectedPlace = selectedRow?.place ?? null;
  const selectedStatus = selectedRow?.status ?? "good";
  const selectedReview = selectedPlace ? reviewStates[selectedPlace.id] ?? {} : {};
  const selectedReports = selectedPlace
    ? visibleReports.filter((report) => report.placeId === selectedPlace.id && report.status !== "resolved")
    : [];
  const currentCaretakerUpdates = caretakerUpdates.filter(
    (update) => update.caretakerEmail === currentCaretaker.email
  );
  const caretakerOpenTasksCount = unresolvedReports.length + needsCare.length + missingPhoto.length;
  const selectedTasks = useMemo<ReviewTask[]>(() => {
    if (!selectedPlace) return [];

    const hasPhotoReport = selectedReports.some((report) => report.type === "missing_photo");
    const hasDescriptionReport = selectedReports.some(
      (report) => report.type === "wrong_description" || report.type === "missing_person"
    );
    const hasLocationReport = selectedReports.some((report) => report.type === "wrong_location");
    const hasCareReport = selectedReports.some((report) => report.type === "needs_care");
    const needsPhoto = selectedStatus === "missing_photo" || hasPhotoReport;
    const needsDescription = selectedStatus === "missing_data" || hasDescriptionReport;
    const needsLocation = hasLocationReport;
    const needsCondition = selectedStatus === "needs_care" || selectedStatus === "check" || hasCareReport;
    const text = isEnglish
      ? {
          photo: "Grave photo",
          photoOk: "Photo is approved.",
          photoFix: "Add or approve a current grave photo.",
          description: "Historical description",
          descriptionOk: "Description is approved.",
          descriptionFix: "Check text, dates and missing data.",
          location: "Map location",
          locationOk: "Location is approved.",
          locationFix: "Verify the marker on the cemetery map.",
          condition: "Grave condition",
          conditionOk: "Condition is marked as cared for.",
          conditionFix: "Needs inspection or care confirmation.",
          reports: "User reports",
          reportsOk: "No open reports for this place.",
          reportsFix: "Review and close open user reports.",
        }
      : {
          photo: "Zdjecie grobu",
          photoOk: "Zdjecie jest zatwierdzone.",
          photoFix: "Dodaj albo zatwierdz aktualne zdjecie grobu.",
          description: "Opis historyczny",
          descriptionOk: "Opis jest zatwierdzony.",
          descriptionFix: "Sprawdz tekst, daty i brakujace dane.",
          location: "Lokalizacja na mapie",
          locationOk: "Lokalizacja jest zatwierdzona.",
          locationFix: "Zweryfikuj marker na mapie cmentarza.",
          condition: "Stan grobu",
          conditionOk: "Stan oznaczony jako zadbany.",
          conditionFix: "Wymaga kontroli albo potwierdzenia opieki.",
          reports: "Zgloszenia uzytkownikow",
          reportsOk: "Brak otwartych zgloszen dla tego miejsca.",
          reportsFix: "Przejrzyj i zamknij otwarte zgloszenia.",
        };

    return [
      {
        id: "photo",
        label: text.photo,
        detail: needsPhoto && !selectedReview.approvedPhoto ? text.photoFix : text.photoOk,
        kind: needsPhoto && !selectedReview.approvedPhoto ? "info" : "done",
        done: !needsPhoto || Boolean(selectedReview.approvedPhoto),
      },
      {
        id: "description",
        label: text.description,
        detail: needsDescription && !selectedReview.approvedDescription ? text.descriptionFix : text.descriptionOk,
        kind: needsDescription && !selectedReview.approvedDescription ? "warning" : "done",
        done: !needsDescription || Boolean(selectedReview.approvedDescription),
      },
      {
        id: "location",
        label: text.location,
        detail: needsLocation && !selectedReview.approvedLocation ? text.locationFix : text.locationOk,
        kind: needsLocation && !selectedReview.approvedLocation ? "warning" : "done",
        done: !needsLocation || Boolean(selectedReview.approvedLocation),
      },
      {
        id: "condition",
        label: text.condition,
        detail: needsCondition ? text.conditionFix : text.conditionOk,
        kind: needsCondition ? "danger" : "done",
        done: !needsCondition,
      },
      {
        id: "reports",
        label: text.reports,
        detail: selectedReports.length > 0 ? text.reportsFix : text.reportsOk,
        kind: selectedReports.length > 0 ? "warning" : "done",
        done: selectedReports.length === 0,
      },
    ];
  }, [isEnglish, selectedPlace, selectedReports, selectedReview, selectedStatus]);
  const openTasksCount = selectedTasks.filter((task) => !task.done).length;

  const saveReviewState = (placeId: number, patch: PlaceReviewState) => {
    const nextStates = {
      ...reviewStates,
      [placeId]: {
        ...reviewStates[placeId],
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    };
    setReviewStates(nextStates);
    window.localStorage.setItem(reviewStorageKey, JSON.stringify(nextStates));
    window.dispatchEvent(new Event("rossa-care-review-changed"));
  };

  const openPlaceReview = (placeId: number) => {
    setSelectedPlaceId(placeId);
    window.requestAnimationFrame(() => {
      document.querySelector(".place-review-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const saveAdminNote = () => {
    const nextNotes = {
      ...adminNotes,
      [selectedCaretakerId]: adminNoteDraft,
    };
    setAdminNotes(nextNotes);
    window.localStorage.setItem(adminNotesStorageKey, JSON.stringify(nextNotes));
    window.dispatchEvent(new Event("rossa-admin-notes-changed"));
  };

  const updateReportStatus = async (reportId: string, status: ReportStatus) => {
    const existingReport = reports.find((report) => report.id === reportId);
    const sourceReport = existingReport ?? allReports.find((report) => report.id === reportId);
    if (!sourceReport) return;

    await updateCareReportStatus(reportId, status);
    const nextReports = existingReport
      ? reports.map((report) => (report.id === reportId ? { ...report, status } : report))
      : [{ ...sourceReport, status }, ...reports];
    setReports(nextReports);
    window.localStorage.setItem(reportsStorageKey, JSON.stringify(nextReports));
    window.dispatchEvent(new Event("rossa-care-reports-changed"));
  };

  const closeSelectedReports = async () => {
    const selectedIds = new Set(selectedReports.map((report) => report.id));
    await Promise.all(
      selectedReports.map((report) => updateCareReportStatus(report.id, "resolved"))
    );
    const nextReports = [
      ...selectedReports.map((report) => ({ ...report, status: "resolved" as ReportStatus })),
      ...reports.filter((report) => !selectedIds.has(report.id)),
    ];
    setReports(nextReports);
    window.localStorage.setItem(reportsStorageKey, JSON.stringify(nextReports));
    window.dispatchEvent(new Event("rossa-care-reports-changed"));
  };

  const updateTaskReports = async (task: CareTask, status: ReportStatus) => {
    if (task.reportIds.length === 0) return;

    const selectedIds = new Set(task.reportIds);
    const sourceReports = allReports.filter((report) => selectedIds.has(report.id));
    await Promise.all(sourceReports.map((report) => updateCareReportStatus(report.id, status)));
    const nextReports = [
      ...sourceReports.map((report) => ({ ...report, status })),
      ...reports.filter((report) => !selectedIds.has(report.id)),
    ];
    setReports(nextReports);
    window.localStorage.setItem(reportsStorageKey, JSON.stringify(nextReports));
    window.dispatchEvent(new Event("rossa-care-reports-changed"));
  };

  const completeReviewTask = (taskId: ReviewTask["id"]) => {
    if (!selectedPlace) return;

    if (taskId === "reports") {
      closeSelectedReports();
      return;
    }

    if (taskId === "condition") {
      saveReviewState(selectedPlace.id, { status: "good" });
      return;
    }

    saveReviewState(selectedPlace.id, {
      approvedDescription: taskId === "description" ? true : selectedReview.approvedDescription,
      approvedLocation: taskId === "location" ? true : selectedReview.approvedLocation,
      approvedPhoto: taskId === "photo" ? true : selectedReview.approvedPhoto,
    });
  };

  const sendCaretakerUpdate = async () => {
    if (!currentUser || !caretakerUpdateDraft.trim()) return;

    const updatePayload = {
      caretakerEmail: currentCaretaker.email,
      caretakerName: currentUser.name || currentCaretaker.name,
      note: caretakerUpdateDraft.trim(),
      assignedCount: visiblePlaces.length,
      openTasksCount: caretakerOpenTasksCount,
    };
    const remoteUpdate = await saveCaretakerUpdate(updatePayload);
    const update: CaretakerAdminUpdate = remoteUpdate ?? {
      id: `caretaker-update-${Date.now()}`,
      ...updatePayload,
      createdAt: new Date().toISOString(),
    };
    const nextUpdates = [
      update,
      ...caretakerUpdates.filter((item) => item.id !== update.id),
    ].slice(0, 50);
    setCaretakerUpdates(nextUpdates);
    window.localStorage.setItem(caretakerAdminUpdatesKey, JSON.stringify(nextUpdates));
    window.dispatchEvent(new Event("rossa-caretaker-updates-changed"));
    setCaretakerUpdateDraft("");
  };

  if (!hasAccess) {
    return (
      <main className="caretaker-page">
        <section className="caretaker-login-card">
          <span className="eyebrow">{isEnglish ? "Caretaker access" : "Dostep opiekuna"}</span>
          <h1>{isEnglish ? "Rasos caretaker panel" : "Panel Opiekuna Rossy"}</h1>
          <p>
            {isEnglish
              ? "This is a separate area for people who manage reports, grave statuses and content updates."
              : "To osobna czesc dla osob, ktore zarzadzaja zgloszeniami, statusami grobow i aktualizacja tresci."}
          </p>

          <div className="caretaker-demo-box">
            <FaUserShield />
            <span>
              <strong>{isEnglish ? "Use the main login window" : "Uzyj glownego okna logowania"}</strong>
              <small>
                {isEnglish
                  ? "Choose Caretaker or Administrator mode there."
                  : "Tam wybierz tryb Opiekun albo Administrator."}
              </small>
            </span>
          </div>

          <button onClick={onLoginClick} type="button">
            <FaShieldAlt /> {isEnglish ? "Log in with access mode" : "Zaloguj przez tryb dostepu"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="caretaker-page">
      <section className="caretaker-hero">
        <div>
          <span className="eyebrow">{isAdmin ? (isEnglish ? "Administrator workspace" : "Przestrzen administratora") : (isEnglish ? "Caretaker workspace" : "Przestrzen opiekuna")}</span>
          <h1>{isAdmin ? (isEnglish ? "Rasos admin dashboard" : "Panel Administratora Rossy") : (isEnglish ? "Rasos care dashboard" : "Panel Opiekuna Rossy")}</h1>
          <p>
            {isAdmin
              ? isEnglish
                ? "Overview of caretakers, responsibilities, reports and graves that still need attention."
                : "Widok dla zarzadzania opiekunami, odpowiedzialnoscia, zgloszeniami i grobami wymagajacymi uwagi."
              : isEnglish
              ? "Separate operational view for reports, grave condition, missing photos and content moderation."
              : "Osobny widok roboczy dla zgloszen, stanu grobow, brakujacych zdjec i moderacji tresci."}
          </p>
        </div>
        <div className="caretaker-user-card">
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

      <section className="caretaker-stats">
        <article>
          {isAdmin ? <FaUsers /> : <FaMapMarkerAlt />}
          <strong>{isAdmin ? caretakers.length : visiblePlaces.length}</strong>
          <span>{isAdmin ? (isEnglish ? "caretakers" : "opiekunow") : (isEnglish ? "assigned places" : "moich miejsc")}</span>
        </article>
        <article>
          {isAdmin ? <FaUserShield /> : <FaExclamationTriangle />}
          <strong>{isAdmin ? activeCaretakersCount : unresolvedReports.length}</strong>
          <span>{isAdmin ? (isEnglish ? "active caretakers" : "aktywnych opiekunow") : (isEnglish ? "open reports" : "otwartych zgloszen")}</span>
        </article>
        <article>
          <FaTools />
          <strong>{needsCare.length}</strong>
          <span>{isEnglish ? "need attention" : "wymaga uwagi"}</span>
        </article>
        <article>
          <FaImage />
          <strong>{missingPhoto.length}</strong>
          <span>{isEnglish ? "missing photos" : "brak zdjec"}</span>
        </article>
      </section>

      {!isAdmin && (
        <section className="caretaker-task-board">
          <header className="caretaker-task-head">
            <div>
              <span className="eyebrow">{isEnglish ? "My responsibility" : "Moja odpowiedzialnosc"}</span>
              <h2>{isEnglish ? "Assigned graves and tasks" : "Przypisane groby i zadania"}</h2>
              <p>
                {isEnglish
                  ? "This view shows only places assigned to your caretaker account."
                  : "Ten widok pokazuje tylko miejsca przypisane do Twojego konta opiekuna."}
              </p>
            </div>
            <strong>
              <FaTasks /> {caretakerOpenTasksCount}
              <small>{isEnglish ? "open tasks" : "zadan"}</small>
            </strong>
          </header>

          <div className="caretaker-task-grid">
            <article>
              <FaMapMarkerAlt />
              <strong>{visiblePlaces.length}</strong>
              <span>{isEnglish ? "places under care" : "miejsc pod opieka"}</span>
            </article>
            <article>
              <FaClipboardList />
              <strong>{unresolvedReports.length}</strong>
              <span>{isEnglish ? "reports to review" : "zgloszen do sprawdzenia"}</span>
            </article>
            <article>
              <FaTools />
              <strong>{needsCare.length}</strong>
              <span>{isEnglish ? "condition checks" : "kontroli stanu"}</span>
            </article>
            <article>
              <FaImage />
              <strong>{missingPhoto.length}</strong>
              <span>{isEnglish ? "photo tasks" : "zadan ze zdjeciem"}</span>
            </article>
          </div>

          {activeCaretakerAdminNote && (
            <aside className="caretaker-admin-note">
              <FaUserShield />
              <span>
                <strong>{isEnglish ? "Note from administrator" : "Notatka od administratora"}</strong>
                <p>{activeCaretakerAdminNote}</p>
              </span>
            </aside>
          )}

          <div className="caretaker-task-columns">
            <article className="caretaker-assignment-focus">
              <h3>{isEnglish ? "My places" : "Moje miejsca"}</h3>
              <div>
                {visiblePlaces.length === 0 ? (
                  <p>{isEnglish ? "No places assigned yet." : "Nie masz jeszcze przypisanych miejsc."}</p>
                ) : (
                  visiblePlaces.map((place) => {
                    const row = visibleStatusRows.find((item) => item.place.id === place.id);
                    const status = row?.status ?? "good";

                    return (
                      <button
                        className={`caretaker-place-pill status-${status}`}
                        key={place.id}
                        onClick={() => openPlaceReview(place.id)}
                        type="button"
                      >
                        <img alt={place.name} src={place.image} />
                        <span>
                          <strong>{place.name}</strong>
                          <small>{statusLabels[status][language]}</small>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </article>

            <article className="caretaker-task-list">
              <h3>{isEnglish ? "Priority tasks" : "Najpilniejsze zadania"}</h3>
              {careTaskQueue.length === 0 ? (
                <p>{isEnglish ? "Everything assigned to you is clean for now." : "Na razie wszystko przypisane do Ciebie jest uporzadkowane."}</p>
              ) : (
                <>
                  {careTaskQueue.slice(0, 6).map((task) => (
                    <div className={`caretaker-task-row priority-${task.priority}`} key={task.id}>
                      <span className="caretaker-task-main">
                        <em>{careTaskPriorityLabels[task.priority][language]}</em>
                        <strong>{task.title}</strong>
                        <small>{task.subtitle}</small>
                        <small>{task.detail}</small>
                      </span>
                      <span className="caretaker-task-type">
                        {careTaskKindLabels[task.kind][language]}
                      </span>
                      <div className="caretaker-task-actions">
                        <button onClick={() => openPlaceReview(task.placeId)} type="button">
                          <FaEdit /> {isEnglish ? "Review" : "Kontrola"}
                        </button>
                        {task.reportCount > 0 && (
                          <button onClick={() => updateTaskReports(task, "review")} type="button">
                            <FaClipboardList /> {isEnglish ? "In review" : "W pracy"}
                          </button>
                        )}
                        {task.reportCount > 0 && (
                          <button onClick={() => updateTaskReports(task, "resolved")} type="button">
                            <FaCheckCircle /> {isEnglish ? "Close" : "Zamknij"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </article>

            <article className="caretaker-admin-report">
              <h3>{isEnglish ? "Report to administrator" : "Raport do administratora"}</h3>
              <textarea
                onChange={(event) => setCaretakerUpdateDraft(event.target.value)}
                placeholder={isEnglish ? "Write what was checked today..." : "Napisz, co dzisiaj sprawdzono..."}
                value={caretakerUpdateDraft}
              />
              <button disabled={!caretakerUpdateDraft.trim()} onClick={sendCaretakerUpdate} type="button">
                <FaPaperPlane /> {isEnglish ? "Send report" : "Wyslij raport"}
              </button>
              <div className="caretaker-update-history">
                <strong>{isEnglish ? "Sent reports" : "Wyslane raporty"}</strong>
                {currentCaretakerUpdates.length === 0 ? (
                  <p>{isEnglish ? "No caretaker reports yet." : "Nie ma jeszcze raportow opiekuna."}</p>
                ) : (
                  currentCaretakerUpdates.slice(0, 3).map((update) => (
                    <div className="caretaker-update-card" key={update.id}>
                      <small>{formatDate(update.createdAt, language)}</small>
                      <p>{update.note}</p>
                      <span>{update.assignedCount} {isEnglish ? "places" : "miejsc"} - {update.openTasksCount} {isEnglish ? "tasks" : "zadan"}</span>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>
        </section>
      )}

      {isAdmin && selectedCaretaker && (
        <section className="admin-overview-panel">
          <header className="admin-overview-head">
            <div>
              <span className="eyebrow">{isEnglish ? "Admin control" : "Kontrola administratora"}</span>
              <h2>{isEnglish ? "Caretakers and assigned graves" : "Opiekunowie i przypisane groby"}</h2>
              <p>
                {isEnglish
                  ? "Admin can see who is responsible for each place, what still needs care and when a caretaker was last active."
                  : "Administrator widzi, kto odpowiada za miejsca, co wymaga opieki i kiedy opiekun byl ostatnio aktywny."}
              </p>
            </div>
            <strong>
              <FaUsers /> {caretakers.length}
            </strong>
          </header>

          <div className="admin-overview-grid">
            <div className="admin-caretaker-list">
              {caretakers.map((caretaker) => {
                const assignedIds = new Set(caretaker.assignedPlaceIds);
                const openReportCount = allReports.filter(
                  (report) => report.placeId !== null && assignedIds.has(report.placeId) && report.status !== "resolved"
                ).length;
                const attentionCount = statusRows.filter(
                  (row) => assignedIds.has(row.place.id) && row.status !== "good"
                ).length;

                return (
                  <button
                    className={`admin-caretaker-card ${selectedCaretakerId === caretaker.id ? "active" : ""}`}
                    key={caretaker.id}
                    onClick={() => setSelectedCaretakerId(caretaker.id)}
                    type="button"
                  >
                    <span className={`caretaker-status-dot status-${caretaker.status}`} />
                    <strong>{caretaker.name}</strong>
                    <small>{caretaker.specialization}</small>
                    <b>{caretaker.assignedPlaceIds.length} {isEnglish ? "places" : "miejsc"}</b>
                    <em>{openReportCount} {isEnglish ? "reports" : "zgloszen"} - {attentionCount} {isEnglish ? "alerts" : "uwag"}</em>
                  </button>
                );
              })}
            </div>

            <article className="admin-caretaker-detail">
              <div className="admin-detail-head">
                <div>
                  <span className={`caretaker-status-pill status-${selectedCaretaker.status}`}>
                    {caretakerStatusLabels[selectedCaretaker.status][language]}
                  </span>
                  <h3>{selectedCaretaker.name}</h3>
                  <p>{selectedCaretaker.specialization}</p>
                </div>
                <div className="admin-contact-card">
                  <span>{selectedCaretaker.email}</span>
                  <span>{selectedCaretaker.phone}</span>
                  <small>{isEnglish ? "Last active" : "Ostatnia aktywnosc"}: {formatDate(selectedCaretaker.lastActive, language)}</small>
                </div>
              </div>

              <div className="admin-mini-stats">
                <span>
                  <strong>{selectedCaretakerPlaces.length}</strong>
                  {isEnglish ? "assigned places" : "przypisane miejsca"}
                </span>
                <span>
                  <strong>{selectedCaretakerReports.length}</strong>
                  {isEnglish ? "open reports" : "otwarte zgloszenia"}
                </span>
                <span>
                  <strong>{selectedCaretakerAttention.length}</strong>
                  {isEnglish ? "need attention" : "wymaga uwagi"}
                </span>
                <span>
                  <strong>{selectedCaretaker.completedActions}</strong>
                  {isEnglish ? "completed actions" : "wykonane dzialania"}
                </span>
              </div>

              <div className="assigned-place-list">
                <strong>{isEnglish ? "Places under care" : "Miejsca pod opieka"}</strong>
                {selectedCaretakerPlaces.map((place) => {
                  const row = statusRows.find((item) => item.place.id === place.id);
                  const status = row?.status ?? "good";

                  return (
                    <div className={`assigned-place-row status-${status}`} key={place.id}>
                      <img alt={place.name} src={place.image} />
                      <span>
                        <b>{place.name}</b>
                        <small>{statusLabels[status][language]} - {place.categoryLabel}</small>
                      </span>
                      <button onClick={() => openPlaceReview(place.id)} type="button">
                        <FaEdit /> {isEnglish ? "Review" : "Kontrola"}
                      </button>
                      <button onClick={() => onShowPlace(place.id)} type="button">
                        <FaMapMarkerAlt /> {isEnglish ? "Map" : "Mapa"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="admin-detail-bottom">
                <label className="admin-note-box">
                  {isEnglish ? "Admin note about this caretaker" : "Notatka administratora o opiekunie"}
                  <textarea
                    onChange={(event) => setAdminNoteDraft(event.target.value)}
                    placeholder={isEnglish ? "Example: reliable, check winter reports first..." : "Np. aktywny, najpierw sprawdzic zgloszenia po zimie..."}
                    value={adminNoteDraft}
                  />
                  <button onClick={saveAdminNote} type="button">
                    <FaEdit /> {isEnglish ? "Save admin note" : "Zapisz notatke"}
                  </button>
                </label>

                <div className="admin-activity-list">
                  <strong>{isEnglish ? "Recent activity" : "Ostatnia aktywnosc"}</strong>
                  {selectedCaretaker.activity.map((activity) => (
                    <span key={activity}>
                      <FaCheckCircle /> {activity}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {selectedPlace && (
        <section className={`place-review-panel review-${selectedStatus}`}>
          <div className="place-review-top">
            <button className="review-back" onClick={() => setSelectedPlaceId(null)} type="button">
              <FaArrowLeft /> {isEnglish ? "Back to list" : "Wroc do listy"}
            </button>
            <span className={`review-status-badge status-${selectedStatus}`}>
              {statusLabels[selectedStatus][language]}
            </span>
          </div>

          <div className="place-review-layout">
            <div className="place-review-photo">
              <img alt={selectedPlace.name} src={selectedPlace.image} />
              <div className={openTasksCount > 0 ? "review-alert is-open" : "review-alert is-done"}>
                <strong>{openTasksCount}</strong>
                <span>
                  {openTasksCount > 0
                    ? isEnglish
                      ? "items need attention"
                      : "rzeczy do poprawy"
                    : isEnglish
                      ? "everything approved"
                      : "wszystko zatwierdzone"}
                </span>
              </div>
            </div>

            <div className="place-review-content">
              <span className="eyebrow">{isEnglish ? "Caretaker record" : "Karta kontroli"}</span>
              <h2>{selectedPlace.name}</h2>
              <p className="place-review-meta">
                {selectedPlace.categoryLabel} - {selectedPlace.years}
              </p>
              <p>{selectedPlace.description ?? selectedPlace.shortDescription}</p>
              {selectedPlace.source && (
                <small>
                  {isEnglish ? "Source" : "Zrodlo"}: {selectedPlace.source}
                </small>
              )}

              <div className="place-review-actions">
                <button onClick={() => onShowPlace(selectedPlace.id)} type="button">
                  <FaMapMarkerAlt /> {isEnglish ? "Show on map" : "Zobacz na mapie"}
                </button>
                <button
                  onClick={() =>
                    saveReviewState(selectedPlace.id, {
                      approvedDescription: true,
                      approvedLocation: true,
                      approvedPhoto: true,
                      status: "good",
                    })
                  }
                  type="button"
                >
                  <FaCheckCircle /> {isEnglish ? "Approve all" : "Zatwierdz wszystko"}
                </button>
              </div>
            </div>
          </div>

          <div className="review-workgrid">
            <article className="review-checklist">
              <h3>{isEnglish ? "What needs review" : "Co trzeba sprawdzic"}</h3>
              {selectedTasks.map((task) => (
                <div className={`review-task task-${task.kind}`} key={task.id}>
                  <span>
                    <strong>{task.label}</strong>
                    <small>{task.detail}</small>
                  </span>
                  <button
                    disabled={task.done}
                    onClick={() => completeReviewTask(task.id)}
                    type="button"
                  >
                    <FaCheckCircle /> {task.done ? (isEnglish ? "Approved" : "Zatwierdzone") : (isEnglish ? "Approve" : "Zatwierdz")}
                  </button>
                </div>
              ))}
            </article>

            <article className="review-side-panel">
              <h3>{isEnglish ? "Caretaker decisions" : "Decyzje opiekuna"}</h3>
              <label>
                {isEnglish ? "Internal note" : "Notatka wewnetrzna"}
                <textarea
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder={isEnglish ? "What was checked or changed?" : "Co sprawdzono albo co trzeba poprawic?"}
                  value={reviewNote}
                />
              </label>
              <button
                onClick={() => saveReviewState(selectedPlace.id, { note: reviewNote })}
                type="button"
              >
                <FaEdit /> {isEnglish ? "Save note" : "Zapisz notatke"}
              </button>

              <div className="review-status-picker">
                <strong>{isEnglish ? "Change grave status" : "Zmien status grobu"}</strong>
                <div>
                  {(Object.keys(statusLabels) as GraveStatus[]).map((status) => (
                    <button
                      className={selectedStatus === status ? "active" : ""}
                      key={status}
                      onClick={() => saveReviewState(selectedPlace.id, { status })}
                      type="button"
                    >
                      {statusLabels[status][language]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="selected-report-list">
                <strong>{isEnglish ? "Open reports" : "Otwarte zgloszenia"}</strong>
                {selectedReports.length === 0 ? (
                  <p>{isEnglish ? "There are no open reports for this place." : "Brak otwartych zgloszen dla tego miejsca."}</p>
                ) : (
                  selectedReports.map((report) => (
                    <div className={`selected-report status-${report.status}`} key={report.id}>
                      <span>{reportLabels[report.type][language]}</span>
                      <p>{report.note}</p>
                      <button onClick={() => updateReportStatus(report.id, "resolved")} type="button">
                        <FaCheckCircle /> {isEnglish ? "Close report" : "Zamknij zgloszenie"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="caretaker-grid">
        <article className="caretaker-panel">
          <header>
            <FaClipboardList />
            <h2>{isEnglish ? "User reports" : "Zgloszenia uzytkownikow"}</h2>
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

          <div className="report-list">
            {filteredVisibleReports.length === 0 && (
              <p className="caretaker-empty-state">
                {isEnglish ? "No reports in this status." : "Brak zgloszen w tym statusie."}
              </p>
            )}
            {filteredVisibleReports.map((report) => (
              <article className={`report-card status-${report.status}`} key={report.id}>
                <div>
                  <span>{reportLabels[report.type][language]}</span>
                  <h3>{report.placeName}</h3>
                  <p>{report.note}</p>
                  <div className="report-card-meta">
                    <small>{formatDate(report.createdAt, language)}</small>
                    <small className={`report-status-chip status-${report.status}`}>
                      {reportStatusLabels[report.status][language]}
                    </small>
                  </div>
                </div>
                <div className="report-actions">
                  {report.placeId && (
                    <button onClick={() => openPlaceReview(report.placeId as number)} type="button">
                      <FaEdit /> {isEnglish ? "Open record" : "Otworz karte"}
                    </button>
                  )}
                  {report.status !== "review" && report.status !== "resolved" && (
                    <button onClick={() => updateReportStatus(report.id, "review")} type="button">
                      <FaClipboardList /> {isEnglish ? "Take into review" : "Przyjmij do pracy"}
                    </button>
                  )}
                  {report.status !== "resolved" ? (
                    <button onClick={() => updateReportStatus(report.id, "resolved")} type="button">
                      <FaCheckCircle /> {isEnglish ? "Resolve" : "Rozwiaz"}
                    </button>
                  ) : (
                    <button onClick={() => updateReportStatus(report.id, "new")} type="button">
                      <FaEdit /> {isEnglish ? "Reopen" : "Otworz ponownie"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="caretaker-panel">
          <header>
            <FaTools />
            <h2>{isEnglish ? "Grave status" : "Status grobow"}</h2>
          </header>

          <div className="status-list">
            {visibleStatusRows.length === 0 && (
              <p className="caretaker-empty-state">
                {isEnglish ? "No assigned graves to show." : "Brak przypisanych grobow do wyswietlenia."}
              </p>
            )}
            {visibleStatusRows.map(({ place, status }) => (
              <article className={`status-row status-${status} ${selectedPlaceId === place.id ? "active" : ""}`} key={place.id}>
                <img alt={place.name} src={place.image} />
                <span>
                  <strong>{place.name}</strong>
                  <small>{place.categoryLabel} - {place.years}</small>
                </span>
                <b>{statusLabels[status][language]}</b>
                <button onClick={() => openPlaceReview(place.id)} type="button">
                  <FaEdit /> {isEnglish ? "Open" : "Otworz"}
                </button>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

export default CaretakerPanel;
