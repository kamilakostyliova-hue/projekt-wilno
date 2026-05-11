import {
  FaGlobeEurope,
  FaPause,
  FaPlay,
  FaStop,
  FaVolumeUp,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import type { SpeechLanguage, SpeechStatus } from "./useSpeechSynthesis";

type SpeechControlsProps = {
  activeLabel: string;
  disabled?: boolean;
  language: SpeechLanguage;
  onLanguageChange: (language: SpeechLanguage) => void;
  onPause: () => void;
  onPlay: () => void;
  onResume: () => void;
  onStop: () => void;
  progress: number;
  status: SpeechStatus;
  title: string;
  voiceName: string;
  showLanguageSwitch?: boolean;
};

const languageOptions: Array<{ id: SpeechLanguage; label: string }> = [
  { id: "pl-PL", label: "PL" },
  { id: "en-GB", label: "EN" },
];

function SpeechControls({
  activeLabel,
  disabled = false,
  language,
  onLanguageChange,
  onPause,
  onPlay,
  onResume,
  onStop,
  progress,
  status,
  title,
  voiceName,
  showLanguageSwitch = false,
}: SpeechControlsProps) {
  const { t } = useTranslation();
  const isPlaying = status === "playing";
  const isPaused = status === "paused";

  return (
    <div className={"speech-controls " + (isPlaying ? "speaking" : "")}>
      <div className="speech-controls-head">
        <span>
          <FaVolumeUp />
          {title}
        </span>
        <small>
          {isPlaying ? t("audio.playing") : isPaused ? t("audio.paused") : t("audio.ready")}
        </small>
      </div>

      <div className="speech-progress" aria-label={t("audio.progress")}>
        <span style={{ width: progress + "%" }} />
      </div>

      <div className="speech-actions">
        <button
          className="speech-main"
          disabled={disabled}
          onClick={isPaused ? onResume : onPlay}
          type="button"
        >
          {isPaused ? <FaPlay /> : <FaVolumeUp />}
          <span>{isPaused ? t("audio.resume") : t("audio.playStory")}</span>
        </button>
        <button
          aria-label={isPlaying ? t("audio.pause") : t("audio.resume")}
          disabled={disabled || status === "idle"}
          onClick={isPlaying ? onPause : onResume}
          type="button"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button
          aria-label={t("audio.stop")}
          disabled={disabled || status === "idle"}
          onClick={onStop}
          type="button"
        >
          <FaStop />
        </button>
      </div>

      {showLanguageSwitch && (
        <div className="speech-meta">
          <div className="language-switch" aria-label={t("audio.language")}>
            <FaGlobeEurope />
            {languageOptions.map((option) => (
              <button
                className={language === option.id ? "active" : ""}
                key={option.id}
                onClick={() => onLanguageChange(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(activeLabel || voiceName) && (
        <p className="speech-now">
          {activeLabel || t("audio.narration")} {voiceName ? "• " + voiceName : ""}
        </p>
      )}
    </div>
  );
}

export default SpeechControls;
