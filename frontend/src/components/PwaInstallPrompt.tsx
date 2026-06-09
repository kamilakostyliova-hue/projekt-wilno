import { useEffect, useMemo, useState } from "react";
import { FaDownload, FaMobileAlt, FaTimes, FaWifi } from "react-icons/fa";
import type { AppLanguage } from "../App";
import "./PwaInstallPrompt.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallPromptProps = {
  language: AppLanguage;
  online: boolean;
};

const dismissKey = "rossa-pwa-install-dismissed-at";
const dismissedDays = 7;

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
};

const recentlyDismissed = () => {
  if (typeof window === "undefined") return true;
  const saved = Number(window.localStorage.getItem(dismissKey) ?? "0");
  if (!saved) return false;
  return Date.now() - saved < dismissedDays * 24 * 60 * 60 * 1000;
};

function PwaInstallPrompt({ language, online }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());

  const copy = useMemo(
    () =>
      language === "en"
        ? {
            eyebrow: "Mobile app",
            title: "Install Na Rossie",
            lead: "Open the guide from your phone screen, faster and with saved routes.",
            install: "Install app",
            later: "Later",
            ios: "On iPhone: Share > Add to Home Screen.",
            offline: "Offline-ready",
          }
        : {
            eyebrow: "Aplikacja mobilna",
            title: "Zainstaluj Na Rossie",
            lead: "Otwieraj przewodnik z ekranu telefonu, szybciej i z zapisanymi trasami.",
            install: "Zainstaluj aplikacje",
            later: "Pozniej",
            ios: "Na iPhone: Udostepnij > Do ekranu poczatkowego.",
            offline: "Dziala offline",
          },
    [language]
  );

  useEffect(() => {
    if (installed || recentlyDismissed()) return;

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isIos && isSafari && !isStandalone()) {
      const timer = window.setTimeout(() => setVisible(true), 1600);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installed]);

  const dismiss = () => {
    window.localStorage.setItem(dismissKey, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
  };

  if (!visible || installed) {
    return null;
  }

  return (
    <section className="pwa-install-card" aria-label={copy.title}>
      <button className="pwa-close" onClick={dismiss} type="button" aria-label={copy.later}>
        <FaTimes />
      </button>
      <div className="pwa-icon">
        <FaMobileAlt />
      </div>
      <div className="pwa-copy">
        <span>{copy.eyebrow}</span>
        <h2>{copy.title}</h2>
        <p>{copy.lead}</p>
        {!deferredPrompt && <small>{copy.ios}</small>}
      </div>
      <div className="pwa-actions">
        {deferredPrompt && (
          <button className="pwa-primary" onClick={install} type="button">
            <FaDownload /> {copy.install}
          </button>
        )}
        <button className="pwa-secondary" onClick={dismiss} type="button">
          {copy.later}
        </button>
      </div>
      <div className={`pwa-status ${online ? "online" : "offline"}`}>
        <FaWifi /> {copy.offline}
      </div>
    </section>
  );
}

export default PwaInstallPrompt;
