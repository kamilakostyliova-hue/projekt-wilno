import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./Navbar.css";
import {
  FaBars,
  FaChevronDown,
  FaGlobeEurope,
  FaMoon,
  FaPowerOff,
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
  const effectiveOnline = onlineMode && networkOnline;

  const goToView = (view: ViewId) => {
    onViewChange(view);
    setMenuOpen(false);
    setProfileOpen(false);
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
    </div>
  );
}

export default Navbar;

