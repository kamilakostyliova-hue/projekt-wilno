import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechLanguage = "pl-PL" | "en-GB";
export type SpeechStatus = "idle" | "playing" | "paused";

type SpeakOptions = {
  label?: string;
  rate?: number;
  pitch?: number;
};

const languageVoiceHints: Record<SpeechLanguage, string[]> = {
  "pl-PL": ["pl", "polish", "polski"],
  "en-GB": ["en-gb", "english", "uk"],
};

const naturalVoiceHints = [
  "natural",
  "online",
  "neural",
  "google",
  "microsoft",
];

const femaleVoiceHints = [
  "female",
  "woman",
  "aria",
  "zira",
  "jenny",
  "susan",
  "paulina",
  "agnieszka",
  "ewa",
  "maria",
];

const hasSpeech = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

function getVoiceScore(voice: SpeechSynthesisVoice, language: SpeechLanguage) {
  const hints = languageVoiceHints[language];
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  const languagePrefix = language.toLowerCase().slice(0, 2);
  let score = 0;

  if (lang === language.toLowerCase()) score += 8;
  if (lang.startsWith(languagePrefix)) score += 5;

  hints.forEach((hint) => {
    if (name.includes(hint) || lang.includes(hint)) score += 3;
  });

  naturalVoiceHints.forEach((hint) => {
    if (name.includes(hint)) score += 3;
  });

  femaleVoiceHints.forEach((hint) => {
    if (name.includes(hint)) score += 2;
  });

  if (!voice.localService) score += 1;

  return score;
}

function findVoice(voices: SpeechSynthesisVoice[], language: SpeechLanguage) {
  return voices
    .map((voice) => ({ score: getVoiceScore(voice, language), voice }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)[0]?.voice;
}

export function detectSpeechLanguage(): SpeechLanguage {
  if (typeof navigator === "undefined") return "pl-PL";

  const browserLanguage = navigator.language.toLowerCase();

  if (browserLanguage.startsWith("en")) return "en-GB";
  return "pl-PL";
}

export function useSpeechSynthesis() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const estimatedDurationRef = useRef(1);
  const startedAtRef = useRef(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [activeLabel, setActiveLabel] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const supported = hasSpeech();

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const refreshVoices = useCallback(() => {
    if (!hasSpeech()) return;
    setVoices(window.speechSynthesis.getVoices());
  }, []);

  useEffect(() => {
    if (!hasSpeech()) return undefined;

    refreshVoices();
    const refreshTimer = window.setTimeout(refreshVoices, 250);
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);

    return () => {
      window.clearTimeout(refreshTimer);
      window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
    };
  }, [refreshVoices]);

  useEffect(
    () => () => {
      stopProgressTimer();
      if (hasSpeech()) {
        window.speechSynthesis.cancel();
      }
    },
    [stopProgressTimer]
  );

  const startProgressTimer = useCallback(
    (textLength: number) => {
      stopProgressTimer();
      estimatedDurationRef.current = Math.max(8, textLength / 11);
      startedAtRef.current = window.performance.now();

      progressTimerRef.current = window.setInterval(() => {
        setProgress((current) => {
          const elapsed =
            (window.performance.now() - startedAtRef.current) / 1000;
          const estimated = Math.min(
            96,
            Math.round((elapsed / estimatedDurationRef.current) * 100)
          );

          return Math.max(current, estimated);
        });
      }, 350);
    },
    [stopProgressTimer]
  );

  const speak = useCallback(
    (text: string, language: SpeechLanguage, options: SpeakOptions = {}) => {
      const cleanText = text.replace(/\s+/g, " ").trim();
      if (!hasSpeech() || cleanText.length === 0) return;

      window.speechSynthesis.cancel();
      stopProgressTimer();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = language;
      utterance.rate = options.rate ?? 0.9;
      utterance.pitch = options.pitch ?? 1.02;
      utterance.volume = 1;

      const voice = findVoice(voices, language);
      if (voice) {
        utterance.voice = voice;
      }
      setVoiceName(voice?.name ?? "");

      utterance.onstart = () => {
        setStatus("playing");
        setProgress(2);
        setActiveLabel(options.label ?? "");
        startProgressTimer(cleanText.length);
      };

      utterance.onboundary = (event) => {
        if (event.name !== "word" && event.charIndex === 0) return;
        setProgress(
          Math.min(96, Math.round((event.charIndex / cleanText.length) * 100))
        );
      };

      utterance.onpause = () => setStatus("paused");
      utterance.onresume = () => setStatus("playing");
      utterance.onerror = () => {
        stopProgressTimer();
        setStatus("idle");
        setVoiceName("");
      };
      utterance.onend = () => {
        stopProgressTimer();
        setProgress(100);
        window.setTimeout(() => {
          setStatus("idle");
          setProgress(0);
          setActiveLabel("");
          setVoiceName("");
        }, 650);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [startProgressTimer, stopProgressTimer, voices]
  );

  const pause = useCallback(() => {
    if (!hasSpeech()) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (!hasSpeech()) return;
    window.speechSynthesis.resume();
    setStatus("playing");
  }, []);

  const stop = useCallback(() => {
    if (!hasSpeech()) return;
    stopProgressTimer();
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
    setProgress(0);
    setActiveLabel("");
    setVoiceName("");
  }, [stopProgressTimer]);

  return {
    activeLabel,
    pause,
    progress,
    resume,
    speak,
    status,
    stop,
    supported,
    voiceName,
  };
}
