import { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaDownload, FaEllipsisV, FaMobileAlt, FaShareAlt, FaTimes, FaWifi } from "react-icons/fa";
import type { AppLanguage } from "../App";
import "./PwaInstallPrompt.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallPromptProps = {
  language: AppLanguage;
  online: boolean;
  openRequest: number;
};

const dismissKey = "rossa-pwa-install-dismissed-at";
const dismissedDays = 7;

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
};

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);
};

const recentlyDismissed = () => {
  if (typeof window === "undefined") return true;
  const saved = Number(window.localStorage.getItem(dismissKey) ?? "0");
  if (!saved) return false;
  return Date.now() - saved < dismissedDays * 24 * 60 * 60 * 1000;
};

function PwaInstallPrompt({ language, online, openRequest }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [manualGuide, setManualGuide] = useState(false);
  const isIosSafari =
    typeof window !== "undefined" &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);

  const copy = useMemo(
    () =>
      language === "en"
        ? {
            eyebrow: "Mobile app",
            title: "Install Na Rossie",
            lead: "Open the guide from your phone screen, faster and with saved routes.",
            install: "Install app",
            showSteps: "Show install steps",
            later: "Later",
            ready: "Your browser is ready for one-tap install.",
            manual: "If the phone does not show the system window, use these quick steps.",
            ios: "On iPhone: Share > Add to Home Screen.",
            browser: "On Android/Samsung: menu > Add page to > Home screen.",
            offline: "Offline-ready",
            steps: isIosSafari
              ? ["Tap Share", "Choose Add to Home Screen", "Confirm Add"]
              : ["Tap the browser menu", "Choose Add page to or Install app", "Confirm Add"],
          }
        : {
            eyebrow: "Aplikacja mobilna",
            title: "Zainstaluj Na Rossie",
            lead: "Otwieraj przewodnik z ekranu telefonu, szybciej i z zapisanymi trasami.",
            install: "Zainstaluj aplikacje",
            showSteps: "Pokaz instalacje",
            later: "Pozniej",
            ready: "Telefon jest gotowy do instalacji jednym kliknieciem.",
            manual: "Jesli telefon nie pokazuje okna systemowego, zrob te szybkie kroki.",
            ios: "Na iPhone: Udostepnij > Do ekranu poczatkowego.",
            browser: "Na Android/Samsung: menu > Dodaj strone do > Ekran glowny.",
            offline: "Dziala offline",
            steps: isIosSafari
              ? ["Nacisnij Udostepnij", "Wybierz Do ekranu poczatkowego", "Potwierdz Dodaj"]
              : ["Nacisnij menu przegladarki", "Wybierz Dodaj strone do albo Zainstaluj aplikacje", "Potwierdz Dodaj"],
          },
    [isIosSafari, language]
  );

  useEffect(() => {
    if (installed) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!recentlyDismissed()) {
        setVisible(true);
      }
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isMobileDevice() && !isStandalone() && !recentlyDismissed()) {
      const timer = window.setTimeout(() => setVisible(true), 1400);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    if (isIosSafari && !isStandalone() && !recentlyDismissed()) {
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
  }, [installed, isIosSafari]);

  useEffect(() => {
    if (!installed && openRequest > 0) {
      setManualGuide(false);
      setVisible(true);
    }
  }, [installed, openRequest]);

  const dismiss = () => {
    window.localStorage.setItem(dismissKey, String(Date.now()));
    setManualGuide(false);
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) {
      setManualGuide(true);
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
        <small>{deferredPrompt ? copy.ready : isIosSafari ? copy.ios : copy.browser}</small>
      </div>
      <div className="pwa-actions">
        <button className="pwa-primary" onClick={install} type="button">
          <FaDownload /> {deferredPrompt ? copy.install : copy.showSteps}
        </button>
        <button className="pwa-secondary" onClick={dismiss} type="button">
          {copy.later}
        </button>
      </div>
      {manualGuide && (
        <div className="pwa-manual-guide">
          <strong>{copy.manual}</strong>
          <ol>
            {copy.steps.map((step, index) => (
              <li key={step}>
                <span>
                  {index === 0 ? (isIosSafari ? <FaShareAlt /> : <FaEllipsisV />) : <FaCheckCircle />}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className={`pwa-status ${online ? "online" : "offline"}`}>
        <FaWifi /> {copy.offline}
      </div>
    </section>
  );
}

export default PwaInstallPrompt;
