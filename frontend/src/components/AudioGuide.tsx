import { useTranslation } from "react-i18next";
import SpeechControls from "./SpeechControls";
import type { SpeechLanguage } from "./useSpeechSynthesis";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import "./AudioGuide.css";

export type AudioGuidePlace = {
  id: number;
  name: string;
  years: string;
  categoryLabel: string;
  position: [number, number];
  description: string;
  shortDescription: string;
};

type AudioGuideProps = {
  language: SpeechLanguage;
  place: AudioGuidePlace | null;
  onLanguageChange: (language: SpeechLanguage) => void;
  showLanguageSwitch?: boolean;
};

function getStoryText(place: AudioGuidePlace, language: SpeechLanguage) {
  if (language === "en-GB") {
    return "You are listening to the story of " +
      place.name +
      ", " +
      place.years +
      ". This point belongs to the category " +
      place.categoryLabel +
      ". " +
      place.shortDescription +
      ". The place is part of the historic Rasos Cemetery route in Vilnius.";
  }

  return "Odsłuchujesz historię miejsca: " +
    place.name +
    ", lata " +
    place.years +
    ". " +
    place.description;
}

function AudioGuide({ language, place, onLanguageChange, showLanguageSwitch = false }: AudioGuideProps) {
  const { t } = useTranslation();
  const speech = useSpeechSynthesis();

  const playStory = () => {
    if (!place) return;
    speech.speak(getStoryText(place, language), language, {
      label: t("audio.story") + ": " + place.name,
      rate: 0.9,
      pitch: 1,
    });
  };

  if (!place) {
    return null;
  }

  return (
    <section className="audio-guide-card">
      <div className="audio-guide-title">
        <span>{t("audio.guide")}</span>
      </div>

      <SpeechControls
        activeLabel={speech.activeLabel}
        disabled={!speech.supported}
        language={language}
        onLanguageChange={onLanguageChange}
        onPause={speech.pause}
        onPlay={playStory}
        onResume={speech.resume}
        onStop={speech.stop}
        progress={speech.progress}
        status={speech.status}
        title={t("audio.story")}
        voiceName={speech.voiceName}
        showLanguageSwitch={showLanguageSwitch}
      />
    </section>
  );
}

export default AudioGuide;
