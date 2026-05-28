import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClipboardList,
  FaEdit,
  FaExclamationTriangle,
  FaImage,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaSignOutAlt,
  FaTools,
  FaUserShield,
} from "react-icons/fa";
import type { AppLanguage, UserProfile } from "../App";
import "./CaretakerPanel.css";

type CaretakerPlace = {
  id: number;
  name: string;
  years: string;
  category: string;
  categoryLabel: string;
  image: string;
  shortDescription: string;
  position: [number, number];
};

type GraveStatus = "good" | "check" | "needs_care" | "missing_photo" | "missing_data";
type ReportStatus = "new" | "review" | "resolved";
export type ReportType = "missing_photo" | "wrong_description" | "needs_care" | "wrong_location" | "missing_person" | "other";

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

const demoStatusByPlaceId: Record<number, GraveStatus> = {
  1: "good",
  2: "check",
  4: "needs_care",
  7: "missing_data",
  10: "missing_photo",
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
  const isEnglish = language === "en";
  const hasAccess = currentUser?.role === "caretaker" || currentUser?.role === "admin";

  useEffect(() => {
    const refresh = () => setReports(readReports());
    window.addEventListener("storage", refresh);
    window.addEventListener("rossa-care-reports-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("rossa-care-reports-changed", refresh);
    };
  }, []);

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
    ],
    [isEnglish, places]
  );

  const allReports = useMemo(() => {
    const reportIds = new Set(reports.map((report) => report.id));
    return [...reports, ...demoReports.filter((report) => !reportIds.has(report.id))];
  }, [demoReports, reports]);
  const statusRows = useMemo(
    () =>
      places.map((place) => ({
        place,
        status: demoStatusByPlaceId[place.id] ?? "good",
      })),
    [places]
  );
  const needsCare = statusRows.filter((row) => row.status === "needs_care" || row.status === "check");
  const missingPhoto = statusRows.filter((row) => row.status === "missing_photo");
  const unresolvedReports = allReports.filter((report) => report.status !== "resolved");

  const updateReportStatus = (reportId: string, status: ReportStatus) => {
    const existingReport = reports.find((report) => report.id === reportId);
    const sourceReport = existingReport ?? allReports.find((report) => report.id === reportId);
    if (!sourceReport) return;

    const nextReports = existingReport
      ? reports.map((report) => (report.id === reportId ? { ...report, status } : report))
      : [{ ...sourceReport, status }, ...reports];
    setReports(nextReports);
    window.localStorage.setItem(reportsStorageKey, JSON.stringify(nextReports));
    window.dispatchEvent(new Event("rossa-care-reports-changed"));
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
          <span className="eyebrow">{isEnglish ? "Caretaker workspace" : "Przestrzen opiekuna"}</span>
          <h1>{isEnglish ? "Rasos care dashboard" : "Panel Opiekuna Rossy"}</h1>
          <p>
            {isEnglish
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
          <FaMapMarkerAlt />
          <strong>{places.length}</strong>
          <span>{isEnglish ? "places in catalog" : "miejsc w katalogu"}</span>
        </article>
        <article>
          <FaExclamationTriangle />
          <strong>{unresolvedReports.length}</strong>
          <span>{isEnglish ? "open reports" : "otwartych zgloszen"}</span>
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

      <section className="caretaker-grid">
        <article className="caretaker-panel">
          <header>
            <FaClipboardList />
            <h2>{isEnglish ? "User reports" : "Zgloszenia uzytkownikow"}</h2>
          </header>

          <div className="report-list">
            {allReports.map((report) => (
              <article className={`report-card status-${report.status}`} key={report.id}>
                <div>
                  <span>{reportLabels[report.type][language]}</span>
                  <h3>{report.placeName}</h3>
                  <p>{report.note}</p>
                  <small>{formatDate(report.createdAt, language)}</small>
                </div>
                <div className="report-actions">
                  {report.placeId && (
                    <button onClick={() => onShowPlace(report.placeId as number)} type="button">
                      <FaMapMarkerAlt /> {isEnglish ? "Map" : "Mapa"}
                    </button>
                  )}
                  <button onClick={() => updateReportStatus(report.id, "resolved")} type="button">
                    <FaCheckCircle /> {isEnglish ? "Resolved" : "Rozwiazane"}
                  </button>
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
            {statusRows.map(({ place, status }) => (
              <article className={`status-row status-${status}`} key={place.id}>
                <img alt={place.name} src={place.image} />
                <span>
                  <strong>{place.name}</strong>
                  <small>{place.categoryLabel} - {place.years}</small>
                </span>
                <b>{statusLabels[status][language]}</b>
                <button onClick={() => onShowPlace(place.id)} type="button">
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
