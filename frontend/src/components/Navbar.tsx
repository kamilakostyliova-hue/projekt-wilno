import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./Navbar.css";
import {
  FaBars,
  FaChevronDown,
  FaCopy,
  FaExternalLinkAlt,
  FaGlobeEurope,
  FaMoon,
  FaPowerOff,
  FaQrcode,
  FaSignOutAlt,
  FaSun,
  FaTimes,
  FaUserCircle,
  FaWifi,
} from "react-icons/fa";
import type { AppLanguage, ThemeMode, UserProfile, ViewId } from "../App";

type NavbarProps = {
  activeView: ViewId;
  currentUser: UserProfile | null;
  favoriteCount: number;
  language: AppLanguage;
  networkOnline: boolean;
  onlineMode: boolean;
  searchQuery: string;
  theme: ThemeMode;
  onLanguageChange: (language: AppLanguage) => void;
  onLoginClick: () => void;
  onLogout: () => void;
  onOnlineModeToggle: () => void;
  onSearchChange: (query: string) => void;
  onThemeToggle: () => void;
  onViewChange: (view: ViewId) => void;
};

const menuItems: Array<{ id: ViewId; labelKey: string; authOnly?: boolean }> = [
  { id: "home", labelKey: "nav.home" },
  { id: "map", labelKey: "nav.map" },
  { id: "walk", labelKey: "nav.walk" },
  { id: "list", labelKey: "nav.list" },
  { id: "favorites", labelKey: "nav.favorites" },
  { id: "categories", labelKey: "nav.categories" },
];

const initialsFor = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "R";

function Navbar({
  activeView,
  currentUser,
  favoriteCount,
  language,
  networkOnline,
  onlineMode,
  searchQuery,
  theme,
  onLanguageChange,
  onLoginClick,
  onLogout,
  onOnlineModeToggle,
  onSearchChange,
  onThemeToggle,
  onViewChange,
}: NavbarProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const effectiveOnline = onlineMode && networkOnline;
  const projectMenuLabel =
    language === "en" ? "Project description" : "Opis projektu";
  const shareText =
    language === "en"
      ? {
          button: "Share",
          close: "Close",
          eyebrow: "QR code",
          title: "Project description",
          description:
            "Scan the code to open the project description page on your phone.",
          qrAlt: "QR code linking to the project description",
          copy: "Copy link",
          copied: "Copied",
          openProject: "Open description",
          localHint:
            "For university presentation use the public Vercel link, so everyone can open it from their own phone.",
        }
      : {
          button: "Udostępnij",
          close: "Zamknij",
          eyebrow: "QR kod",
          title: "Opis projektu",
          description:
            "Zeskanuj kod, żeby otworzyć stronę z opisem projektu na telefonie.",
          qrAlt: "QR kod prowadzący do opisu projektu",
          copy: "Kopiuj link",
          copied: "Skopiowano",
          openProject: "Otwórz opis",
          localHint:
            "",
        };
  const projectShareUrl = (() => {
    if (typeof window === "undefined") return "";

    const url = new URL(window.location.href);
    url.pathname = "/";
    url.search = "?view=project";
    url.hash = "";
    return url.toString();
  })();
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=16&data=${encodeURIComponent(
    projectShareUrl
  )}`;

  const goToView = (view: ViewId) => {
    onViewChange(view);
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const openShare = () => {
    setCopied(false);
    setShareOpen(true);
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(projectShareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="navbar">
      <button className="logo" onClick={() => goToView("home")} type="button">
        <span className="logo-mark">R</span>
        <span>
          <strong>Na Rossie</strong>
          <small>{t("nav.brandSubtitle")}</small>
        </span>
      </button>

      <button
        aria-expanded={menuOpen}
        aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
        className="hamburger"
        onClick={() => setMenuOpen((current) => !current)}
        type="button"
      >
        {menuOpen ? <FaTimes /> : <FaBars />}
      </button>

      {menuOpen && (
        <button
          aria-label={t("nav.closeMenu")}
          className="nav-scrim"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <div className={`nav-content ${menuOpen ? "open" : ""}`}>
        <div className="menu">
          {menuItems
            .filter((item) => !item.authOnly || currentUser)
            .map((item) => (
              <button
                className={activeView === item.id ? "active" : ""}
                key={item.id}
                onClick={() => goToView(item.id)}
                type="button"
              >
                {t(item.labelKey)}
                {item.id === "favorites" && favoriteCount > 0 && (
                  <span className="nav-count">{favoriteCount}</span>
                )}
              </button>
            ))}
        </div>

        <div className="right">
          <input
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                goToView("list");
              }
            }}
            placeholder={t("nav.searchPlaceholder")}
            value={searchQuery}
          />
          <div className="language-pill" aria-label={t("nav.language")}>
            <FaGlobeEurope />
            <button
              className={language === "pl" ? "active" : ""}
              onClick={() => onLanguageChange("pl")}
              type="button"
            >
              PL
            </button>
            <button
              className={language === "en" ? "active" : ""}
              onClick={() => onLanguageChange("en")}
              type="button"
            >
              EN
            </button>
          </div>
          <button
            className={`mode-pill ${effectiveOnline ? "online" : "offline"}`}
            onClick={onOnlineModeToggle}
            title={effectiveOnline ? t("nav.switchOffline") : t("nav.switchOnline")}
            type="button"
          >
            {effectiveOnline ? <FaWifi /> : <FaPowerOff />}
            <span>{effectiveOnline ? t("nav.online") : t("nav.offline")}</span>
          </button>
          <button
            className="mode-pill"
            onClick={onThemeToggle}
            title={theme === "day" ? t("nav.enableNight") : t("nav.enableDay")}
            type="button"
          >
            {theme === "day" ? <FaMoon /> : <FaSun />}
            <span>{theme === "day" ? t("nav.night") : t("nav.day")}</span>
          </button>
          <button
            aria-label={shareText.button}
            className="mode-pill share-nav-button"
            onClick={openShare}
            title={shareText.button}
            type="button"
          >
            <FaQrcode />
            <span>{shareText.button}</span>
          </button>

          {currentUser ? (
            <div className="profile-menu-wrap">
              <button
                aria-expanded={profileOpen}
                className="profile-chip"
                onClick={() => setProfileOpen((current) => !current)}
                type="button"
              >
                {currentUser.avatar ? (
                  <img alt={currentUser.name} src={currentUser.avatar} />
                ) : (
                  <span className="avatar-fallback">{initialsFor(currentUser.name)}</span>
                )}
                <span>
                  <strong>{currentUser.name}</strong>
                  <small>{t("nav.favorite_many", { count: favoriteCount })}</small>
                </span>
                <FaChevronDown className="profile-caret" />
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <button onClick={() => goToView("project")} type="button">
                    <FaExternalLinkAlt /> {projectMenuLabel}
                  </button>
                  <button onClick={() => goToView("profile")} type="button">
                    <FaUserCircle /> {t("nav.dropdownProfile")}
                  </button>
                  <button onClick={onLogout} type="button">
                    <FaSignOutAlt /> {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="login-button" onClick={onLoginClick} type="button">
              <FaUserCircle /> {t("nav.login")}
            </button>
          )}
        </div>
      </div>
      {shareOpen && (
        <div className="share-shell" role="dialog" aria-modal="true">
          <button
            aria-label={shareText.close}
            className="share-backdrop"
            onClick={() => setShareOpen(false)}
            type="button"
          />
          <section className="share-card">
            <button
              aria-label={shareText.close}
              className="share-close"
              onClick={() => setShareOpen(false)}
              type="button"
            >
              <FaTimes />
            </button>
            <span className="share-eyebrow">{shareText.eyebrow}</span>
            <h2>{shareText.title}</h2>
            <p>{shareText.description}</p>

            <div className="qr-frame">
              <img alt={shareText.qrAlt} src={qrImageUrl} />
            </div>

            <code>{projectShareUrl}</code>

            <div className="share-actions">
              <button onClick={copyShareLink} type="button">
                <FaCopy /> {copied ? shareText.copied : shareText.copy}
              </button>
              <a href={projectShareUrl} rel="noreferrer" target="_blank">
                <FaExternalLinkAlt /> {shareText.openProject}
              </a>
            </div>

            <small>{shareText.localHint}</small>
          </section>
        </div>
      )}
    </div>
  );
}

export default Navbar;
