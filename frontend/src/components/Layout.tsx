import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaBookOpen,
  FaCheckCircle,
  FaClock,
  FaCompass,
  FaCross,
  FaDraftingCompass,
  FaFlask,
  FaExternalLinkAlt,
  FaHeart,
  FaLandmark,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaMedal,
  FaPalette,
  FaQuestionCircle,
  FaRoute,
  FaShieldAlt,
  FaSave,
  FaStar,
  FaTrophy,
  FaTimes,
} from "react-icons/fa";
import AudioGuide from "./AudioGuide";
import MapView from "./MapView";
import PersonDetailPage from "./PersonDetailPage";
import UserProfilePage, { type VisitedPlaceRecord, type WantVisitRecord } from "./UserProfilePage";
import {
  transportModes,
  type LatLngTuple,
  type RouteSummary,
  type TransportModeId,
} from "./routingConfig";
import "./Layout.css";
import type { AppLanguage, ThemeMode, UserProfile, UserSettings, ViewId } from "../App";
import {
  getLanguageKey,
  layoutText,
  localizeCategory,
  localizePlace,
  localizeTimelinePeriod,
  timelineEventText,
} from "../i18n/domain";

type CategoryId =
  | "all"
  | "wojskowi"
  | "politycy"
  | "artysci"
  | "architektura"
  | "naukowcy"
  | "duchowni";

type CemeteryPlace = {
  id: number;
  name: string;
  years: string;
  category: Exclude<CategoryId, "all">;
  tags?: Array<Exclude<CategoryId, "all">>;
  categoryLabel: string;
  position: [number, number];
  image: string;
  gallery?: string[];
  description: string;
  shortDescription: string;
  source: string;
  rating: number;
};

type LayoutProps = {
  activeView: ViewId;
  appLanguage: AppLanguage;
  currentUser: UserProfile | null;
  currentUserId: string | null;
  networkOnline: boolean;
  onlineMode: boolean;
  searchQuery: string;
  theme: ThemeMode;
  userSettings: UserSettings;
  onFavoritesCountChange: (count: number) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onSearchChange: (query: string) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onUserChange: (profile: UserProfile) => void;
  onViewChange: (view: ViewId) => void;
  onPersonOpen?: (slug: string) => void;
  personSlug?: string | null;
};

type SavedRouteRecord = {
  id: string;
  name: string;
  pointCount: number;
  distance: number;
  time: number;
  savedAt: string;
  mode: TransportModeId | string;
  routeKind?: "category" | "single";
  categoryId?: string;
  categoryLabel?: string;
  start?: {
    label: string;
    position: LatLngTuple;
    source: "gate" | "user";
  };
  end?: {
    label: string;
    position: LatLngTuple | null;
  };
  places?: Array<{
    id: number;
    name: string;
    years: string;
    category: string;
    categoryLabel: string;
    position: LatLngTuple;
    image: string;
    shortDescription: string;
  }>;
  waypoints?: LatLngTuple[];
  summarySource?: "online" | "offline";
  savedOnDevice?: boolean;
};

type WalkHistoryRecord = {
  id: string;
  routeName: string;
  pointCount: number;
  distance: number;
  duration: number;
  startedAt: string;
};

type QuizResultRecord = {
  id: string;
  routeName: string;
  score: number;
  total: number;
  completedAt: string;
};

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  answer: string;
  placeName: string;
};

type TimelineEvent = {
  year: string;
  title: string;
  text: string;
};

type PlaceStatusFilter = "all" | "favorites";
type TimelineFilter = "all" | "1800" | "1850" | "1900" | "1950";

const cemeteryGate: LatLngTuple = [54.66842, 25.30236];
const nearbyLimitMeters = 350;

const distanceMeters = (from: [number, number], to: [number, number]) => {
  const earth = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);
  const dLat = toRad(to[0] - from[0]);
  const dLng = toRad(to[1] - from[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return Math.round(2 * earth * Math.asin(Math.sqrt(h)));
};

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;

const slugifyPlace = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const formatDuration = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

const estimateWalkingTime = (meters: number) =>
  Math.round(meters / 1.25);

const commonsImage = (fileName: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    fileName
  )}?width=600`;

const localImages = import.meta.glob("../assets/*", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const assetImage = (fileName: string) =>
  localImages[`../assets/${fileName}`] ?? commonsImage(fileName);

const imageFallback = (name: string) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420"><rect width="600" height="420" fill="#eaf3ff"/><path d="M0 318 C130 278 220 356 360 306 C462 270 528 292 600 262 V420 H0Z" fill="#c8dcf2"/><circle cx="300" cy="165" r="78" fill="#6fa8dc"/><text x="300" y="190" text-anchor="middle" font-family="Arial,sans-serif" font-size="62" font-weight="700" fill="#ffffff">${initials}</text></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const baseCategories = [
  {
    id: "all",
    label: "Wszystkie",
    description: "PeÅ‚na lista osÃ³b i miejsc pamiÄ™ci.",
    icon: FaMapMarkerAlt,
  },
  {
    id: "wojskowi",
    label: "Wojskowi",
    description: "DowÃ³dcy, powstaÅ„cy i osoby zwiÄ…zane z walkÄ… o wolnoÅ›Ä‡.",
    icon: FaShieldAlt,
  },
  {
    id: "politycy",
    label: "Politycy",
    description: "DziaÅ‚acze paÅ„stwowi, spoÅ‚ecznicy i sygnatariusze.",
    icon: FaLandmark,
  },
  {
    id: "artysci",
    label: "ArtyÅ›ci",
    description: "Poeci, pisarze, malarze, kompozytorzy i architekci.",
    icon: FaPalette,
  },
  {
    id: "architektura",
    label: "Architektura",
    description: "Architekci, inÅ¼ynierowie i miejsca zwiÄ…zane z rozwojem Wilna.",
    icon: FaDraftingCompass,
  },
  {
    id: "naukowcy",
    label: "Naukowcy",
    description: "Profesorowie, historycy, lekarze i badacze.",
    icon: FaFlask,
  },
  {
    id: "duchowni",
    label: "Duchowni",
    description: "KsiÄ™Å¼a i postacie religijne zwiÄ…zane z Wilnem.",
    icon: FaCross,
  },
] satisfies Array<{
  id: CategoryId;
  label: string;
  description: string;
  icon: typeof FaMapMarkerAlt;
}>;

const basePlaces: CemeteryPlace[] = [
  {
    id: 1,
    name: "JÃ³zef PiÅ‚sudski",
    years: "1867 - 1935",
    category: "wojskowi",
    categoryLabel: "Wojskowy",
    position: [54.66887, 25.30352],
    image: assetImage("g.juzef.jpg"),
    gallery: [assetImage("juzef.1.jpg"), assetImage("juzef.2.jpg"), assetImage("juzef.3.jpg")],
    description:
      "Na Rossie znajduje siÄ™ mauzoleum Matka i Serce Syna, gdzie spoczywa matka JÃ³zefa PiÅ‚sudskiego oraz serce marszaÅ‚ka. To jedno z najwaÅ¼niejszych miejsc pamiÄ™ci na cmentarzu.",
    shortDescription:
      "Symboliczne miejsce zwiÄ…zane z sercem marszaÅ‚ka i grobem jego matki.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 5,
  },
  {
    id: 2,
    name: "WÅ‚adysÅ‚aw Syrokomla",
    years: "1823 - 1862",
    category: "artysci",
    categoryLabel: "Artysta",
    position: [54.66853, 25.30292],
    image: assetImage("g.wladyslaw.jpg"),
    gallery: [assetImage("wladyslaw.1.jpg"), assetImage("wladyslaw.2.jpg"), assetImage("wladyslaw.3.jpg")],
    description:
      "Poeta i tÅ‚umacz zwiÄ…zany z WileÅ„szczyznÄ…. Jego twÃ³rczoÅ›Ä‡ Å‚Ä…czyÅ‚a tematykÄ™ historycznÄ…, ludowÄ… i krajobrazowÄ….",
    shortDescription:
      "Poeta WileÅ„szczyzny, autor gawÄ™d i utworÃ³w o tematyce historycznej.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 4,
  },
  {
    id: 3,
    name: "Joachim Lelewel",
    years: "1786 - 1861",
    category: "naukowcy",
    categoryLabel: "Naukowiec",
    position: [54.66879, 25.30407],
    image: assetImage("g.joachim.png"),
    gallery: [assetImage("joachim.1.jpg"), assetImage("joachim.2.jpg"), assetImage("joachim.3.jpg")],
    description:
      "Historyk, profesor Uniwersytetu WileÅ„skiego i dziaÅ‚acz polityczny. Jego grÃ³b jest waÅ¼nym punktem pamiÄ™ci akademickiego Wilna.",
    shortDescription:
      "Historyk, profesor Uniwersytetu WileÅ„skiego i polityk emigracyjny.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 5,
  },
  {
    id: 4,
    name: "Antoni Wiwulski",
    years: "1877 - 1919",
    category: "artysci",
    tags: ["architektura"],
    categoryLabel: "Artysta",
    position: [54.66836, 25.30466],
    image: assetImage("g.antoni.jpg"),
    gallery: [assetImage("antoni.1.jpg"), assetImage("antoni.2.JPG"), assetImage("antoni.3.jpg")],
    description:
      "Architekt i rzeÅºbiarz zwiÄ…zany z Wilnem. Na Rossie upamiÄ™tnia go jeden z charakterystycznych nagrobkÃ³w artystycznej czÄ™Å›ci nekropolii.",
    shortDescription: "Architekt i rzeÅºbiarz zwiÄ…zany z Wilnem.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 4,
  },
  {
    id: 5,
    name: "Jonas BasanaviÄius",
    years: "1851 - 1927",
    category: "politycy",
    categoryLabel: "Polityk",
    position: [54.66917, 25.30278],
    image: assetImage("g.jonas.jpg"),
    gallery: [assetImage("jonas.1.jpg"), assetImage("jonas.2.jpg"), assetImage("jonas.3.jpg")],
    description:
      "Lekarz, dziaÅ‚acz narodowy i sygnatariusz Aktu NiepodlegÅ‚oÅ›ci Litwy. Jego miejsce pochÃ³wku pokazuje wielokulturowy charakter Rossy.",
    shortDescription:
      "Litewski dziaÅ‚acz narodowy, lekarz i sygnatariusz niepodlegÅ‚oÅ›ci.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 5,
  },
  {
    id: 6,
    name: "Euzebiusz SÅ‚owacki",
    years: "1773 - 1814",
    category: "naukowcy",
    categoryLabel: "Naukowiec",
    position: [54.66813, 25.30371],
    image: assetImage("g.euzebiusz.jpg"),
    gallery: [assetImage("euzebiusz.1.jpg"), assetImage("euzebiusz.2.jpg"), assetImage("euzebiusz.3.jpg")],
    description:
      "Profesor wymowy i poezji Uniwersytetu WileÅ„skiego oraz ojciec Juliusza SÅ‚owackiego. Jego grÃ³b przypomina o literackich zwiÄ…zkach Wilna.",
    shortDescription:
      "Profesor Uniwersytetu WileÅ„skiego i ojciec Juliusza SÅ‚owackiego.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 3,
  },
  {
    id: 7,
    name: "Vladas Mironas",
    years: "1880 - 1953",
    category: "duchowni",
    categoryLabel: "Duchowny",
    position: [54.66983, 25.30442],
    image: assetImage("g.vladas.jpg"),
    gallery: [assetImage("vlad.1.webp"), assetImage("vlad.2.webp"), assetImage("vlad.3.jpg")],
    description:
      "KsiÄ…dz, polityk i sygnatariusz aktu niepodlegÅ‚oÅ›ci Litwy. W aplikacji reprezentuje kategoriÄ™ duchownych oraz miejsca pamiÄ™ci symbolicznej.",
    shortDescription: "Duchowny i polityk, punkt pamiÄ™ci symbolicznej.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 4,
  },
  {
    id: 9,
    name: "Mikalojus Konstantinas ÄŒiurlionis",
    years: "1875 - 1911",
    category: "artysci",
    categoryLabel: "Artysta",
    position: [54.67032, 25.30215],
    image: assetImage("g.mikolaj.jpg"),
    gallery: [assetImage("mikolaj.1.jpg"), assetImage("mikolaj.2.jpg"), assetImage("mikolaj.3.jpg")],
    description:
      "Kompozytor i malarz, jedna z najwaÅ¼niejszych postaci kultury litewskiej. Jego twÃ³rczoÅ›Ä‡ Å‚Ä…czyÅ‚a muzykÄ™, malarstwo i symbolizm.",
    shortDescription: "Litewski kompozytor i malarz, twÃ³rca symbolistyczny.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 5,
  },
  {
    id: 10,
    name: "Balys Sruoga",
    years: "1896 - 1947",
    category: "artysci",
    categoryLabel: "Artysta",
    position: [54.66947, 25.30516],
    image: assetImage("g.balys.jpg"),
    gallery: [assetImage("balys.1.jpg"), assetImage("balys.2.jpg"), assetImage("balys.3.jpg")],
    description:
      "Pisarz, poeta i badacz teatru. Jego twÃ³rczoÅ›Ä‡ naleÅ¼y do waÅ¼nych Å›wiadectw kultury litewskiej pierwszej poÅ‚owy XX wieku.",
    shortDescription: "Pisarz i teatrolog, waÅ¼na postaÄ‡ kultury litewskiej.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 4,
  },
  {
    id: 11,
    name: "JÃ³zef MontwiÅ‚Å‚",
    years: "1850 - 1911",
    category: "politycy",
    tags: ["architektura"],
    categoryLabel: "Polityk",
    position: [54.66904, 25.30505],
    image: assetImage("g.montwill.jpg"),
    gallery: [assetImage("montwill.1.jpg"), assetImage("montwill.2.jpg"), assetImage("montwill.3.jpg")],
    description:
      "Bankier, spoÅ‚ecznik i filantrop zasÅ‚uÅ¼ony dla Wilna. WspieraÅ‚ instytucje dobroczynne oraz projekty miejskie.",
    shortDescription: "SpoÅ‚ecznik i filantrop zasÅ‚uÅ¼ony dla Wilna.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 4,
  },
  {
    id: 12,
    name: "Petras VileiÅ¡is",
    years: "1851 - 1926",
    category: "naukowcy",
    tags: ["architektura"],
    categoryLabel: "Naukowiec",
    position: [54.66958, 25.30335],
    image: assetImage("g.petras.jpg"),
    gallery: [assetImage("petras.1.jpg"), assetImage("petras.2.jpg"), assetImage("petras.3.jpg")],
    description:
      "InÅ¼ynier, wydawca i dziaÅ‚acz spoÅ‚eczny. ByÅ‚ jednÄ… z postaci litewskiego odrodzenia narodowego i modernizacji Å¼ycia publicznego.",
    shortDescription: "InÅ¼ynier, wydawca i dziaÅ‚acz spoÅ‚eczny.",
    source: "Wikipedia / Wikimedia Commons",
    rating: 4,
  },
];

const placeMatchesCategory = (place: CemeteryPlace, categoryId: CategoryId) =>
  categoryId === "all" ||
  place.category === categoryId ||
  place.tags?.includes(categoryId) === true;

const baseHomeTimeline = [
  {
    year: "1800",
    title: "Epoka Uniwersytetu WileÅ„skiego",
    placeIds: [3, 6],
  },
  {
    year: "1850",
    title: "Powstania, poezja i uniwersytet",
    placeIds: [2, 3],
  },
  {
    year: "1900",
    title: "Miasto artystÃ³w i dziaÅ‚aczy",
    placeIds: [1, 4, 9, 11],
  },
  {
    year: "1950",
    title: "PamiÄ™Ä‡ XX wieku",
    placeIds: [7, 10, 12],
  },
];


const getFavoritesKey = (currentUserId: string | null) =>
  `rossa-favorites-${currentUserId ?? "guest"}`;

const getVisitedKey = (currentUserId: string | null) =>
  `rossa-visited-${currentUserId ?? "guest"}`;

const getWantVisitKey = (currentUserId: string | null) =>
  `rossa-want-visit-${currentUserId ?? "guest"}`;

const getPlannedWalksKey = (currentUserId: string | null) =>
  `rossa-planned-walks-${currentUserId ?? "guest"}`;

const getSavedRoutesKey = (currentUserId: string | null) =>
  `rossa-saved-routes-${currentUserId ?? "guest"}`;

const getWalkHistoryKey = (currentUserId: string | null) =>
  `rossa-walk-history-${currentUserId ?? "guest"}`;

const getTimeSpentKey = (currentUserId: string | null) =>
  `rossa-time-spent-${currentUserId ?? "guest"}`;

const getQuizResultsKey = (currentUserId: string | null) =>
  `rossa-quiz-results-${currentUserId ?? "guest"}`;

const readStorageArray = <T,>(storageKey: string): T[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const getInitialVisited = (storageKey: string): VisitedPlaceRecord[] => {
  const validPlaceIds = new Set(basePlaces.map((place) => place.id));
  return readStorageArray<VisitedPlaceRecord>(storageKey).filter(
    (item) =>
      typeof item.placeId === "number" &&
      validPlaceIds.has(item.placeId) &&
      typeof item.visitedAt === "string"
  );
};

const getInitialWantVisits = (storageKey: string): WantVisitRecord[] => {
  const validPlaceIds = new Set(basePlaces.map((place) => place.id));
  return readStorageArray<WantVisitRecord>(storageKey).filter(
    (item) =>
      typeof item.placeId === "number" &&
      validPlaceIds.has(item.placeId) &&
      typeof item.plannedAt === "string"
  );
};

const getInitialFavorites = (storageKey: string) => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedFavorites =
      window.localStorage.getItem(storageKey) ??
      window.localStorage.getItem("rossa-favorites");
    const parsedFavorites = savedFavorites ? JSON.parse(savedFavorites) : [];
    const validPlaceIds = new Set(basePlaces.map((place) => place.id));

    return Array.isArray(parsedFavorites)
      ? parsedFavorites.filter(
          (id): id is number => typeof id === "number" && validPlaceIds.has(id)
        )
      : [];
  } catch {
    return [];
  }
};


const getRouteDistanceFor = (
  routePlaces: CemeteryPlace[],
  start: [number, number] = cemeteryGate
) =>
  routePlaces.reduce((total, place, index) => {
    const previousPoint =
      index === 0 ? start : routePlaces[index - 1].position;
    return total + distanceMeters(previousPoint, place.position);
  }, 0);


const getTimeline = (place: CemeteryPlace, languageKey: "pl" | "en"): TimelineEvent[] => {
  const text = timelineEventText[languageKey];
  const years = place.years.match(/\d{4}/g) ?? [];
  const birthYear = years[0] ?? text.birthFallback;
  const deathYear = years[1] ?? text.deathFallback;
  const middleYear =
    years.length >= 2
      ? String(Math.round((Number(years[0]) + Number(years[1])) / 2))
      : text.lifeFallback;

  return [
    {
      year: birthYear,
      title: text.startTitle,
      text: text.startText,
    },
    {
      year: middleYear,
      title: text.activityTitle,
      text: text.byCategory[place.category],
    },
    {
      year: deathYear,
      title: text.memoryTitle,
      text: text.memoryText,
    },
  ];
};

function Layout({
  activeView,
  appLanguage,
  currentUser,
  currentUserId,
  networkOnline,
  onlineMode,
  searchQuery,
  theme,
  userSettings,
  onFavoritesCountChange,
  onLanguageChange,
  onSearchChange,
  onThemeChange,
  onUserChange,
  onViewChange,
  onPersonOpen,
  personSlug,
}: LayoutProps) {
  const languageKey = getLanguageKey(appLanguage);
  const copy = layoutText[languageKey];
  const tourCopy = useMemo(
    () =>
      languageKey === "en"
        ? {
            title: "Visiting mode",
            lead: "Follow the route point by point, mark visited graves and finish with a short quiz.",
            start: "Start visiting mode",
            next: "Next point",
            finish: "Finish walk",
            mark: "Mark as visited",
            visited: "Visited",
            planned: "Planned",
            currentPoint: "Current point",
            progress: "Route progress",
            pointsVisited: "points visited",
            badges: "Badges",
            badgeFirst: "First visit",
            badgeExplorer: "Route explorer",
            badgeCollector: "Memory collector",
            badgeQuiz: "Quiz master",
            badgeLocked: "Locked",
            quizTitle: "Historical quiz",
            quizLead: "Answer a few questions from the current route.",
            quizOpen: "Open quiz",
            quizSubmit: "Check answers",
            quizDone: "Quiz completed",
            quizPerfect: "Excellent result. Badge unlocked.",
            quizTryAgain: "Good start. You can try again after the walk.",
            categoryQuestion: (name: string) => `Which category does ${name} belong to?`,
            tourFinished: "Walk finished. Time for a quick quiz.",
          }
        : {
            title: "Tryb zwiedzania",
            lead: "Idź punkt po punkcie, oznaczaj odwiedzone groby i zakończ spacer krótkim quizem.",
            start: "Rozpocznij zwiedzanie",
            next: "Następny punkt",
            finish: "Zakończ spacer",
            mark: "Oznacz jako odwiedzone",
            visited: "Odwiedzone",
            planned: "Zaplanowane",
            currentPoint: "Aktualny punkt",
            progress: "Postęp trasy",
            pointsVisited: "punktów odwiedzonych",
            badges: "Odznaki",
            badgeFirst: "Pierwsza wizyta",
            badgeExplorer: "Odkrywca trasy",
            badgeCollector: "Kolekcjoner pamięci",
            badgeQuiz: "Mistrz quizu",
            badgeLocked: "Zablokowana",
            quizTitle: "Quiz historyczny",
            quizLead: "Odpowiedz na kilka pytań z wybranej trasy.",
            quizOpen: "Otwórz quiz",
            quizSubmit: "Sprawdź odpowiedzi",
            quizDone: "Quiz ukończony",
            quizPerfect: "Świetny wynik. Odznaka odblokowana.",
            quizTryAgain: "Dobry początek. Możesz spróbować ponownie po spacerze.",
            categoryQuestion: (name: string) => `Do jakiej kategorii należy ${name}?`,
            tourFinished: "Spacer ukończony. Czas na krótki quiz.",
          },
    [languageKey]
  );
  const categories = useMemo(
    () => baseCategories.map((category) => localizeCategory(category, languageKey)),
    [languageKey]
  );
  const places = useMemo(
    () => basePlaces.map((place) => localizePlace(place, languageKey)),
    [languageKey]
  );
  const homeTimeline = useMemo(
    () => baseHomeTimeline.map((period) => localizeTimelinePeriod(period, languageKey)),
    [languageKey]
  );
  const getCurrentCategoryCount = useCallback(
    (categoryId: CategoryId) =>
      categoryId === "all"
        ? places.length
        : places.filter((place) => placeMatchesCategory(place, categoryId)).length,
    [places]
  );
  const getCurrentCategoryRoutePlaces = useCallback(
    (categoryId: CategoryId) =>
      categoryId === "all"
        ? []
        : places.filter((place) => placeMatchesCategory(place, categoryId)),
    [places]
  );
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [selectedId, setSelectedId] = useState<number | null>(places[0].id);
  const favoriteStorageKey = useMemo(
    () => getFavoritesKey(currentUserId),
    [currentUserId]
  );
  const visitedStorageKey = useMemo(
    () => getVisitedKey(currentUserId),
    [currentUserId]
  );
  const wantVisitStorageKey = useMemo(
    () => getWantVisitKey(currentUserId),
    [currentUserId]
  );
  const plannedWalksKey = useMemo(
    () => getPlannedWalksKey(currentUserId),
    [currentUserId]
  );
  const savedRoutesKey = useMemo(
    () => getSavedRoutesKey(currentUserId),
    [currentUserId]
  );
  const walkHistoryKey = useMemo(
    () => getWalkHistoryKey(currentUserId),
    [currentUserId]
  );
  const timeSpentKey = useMemo(
    () => getTimeSpentKey(currentUserId),
    [currentUserId]
  );
  const quizResultsKey = useMemo(
    () => getQuizResultsKey(currentUserId),
    [currentUserId]
  );
  const skipFavoriteSave = useRef(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() =>
    getInitialFavorites(favoriteStorageKey)
  );
  const [visitedItems, setVisitedItems] = useState<VisitedPlaceRecord[]>(() =>
    getInitialVisited(visitedStorageKey)
  );
  const [wantVisitItems, setWantVisitItems] = useState<WantVisitRecord[]>(() =>
    getInitialWantVisits(wantVisitStorageKey)
  );
  const [statusFilter, setStatusFilter] = useState<PlaceStatusFilter>("all");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [routeTargetId, setRouteTargetId] = useState<number | null>(null);
  const [routeStart, setRouteStart] = useState<LatLngTuple>(cemeteryGate);
  const [userLocation, setUserLocation] = useState<LatLngTuple | null>(null);
  const [transportMode, setTransportMode] = useState<TransportModeId>("walk");
  const [routeStatus, setRouteStatus] = useState<string>(copy.startGateStatus);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizFeedback, setQuizFeedback] = useState("");
  const [quizResults, setQuizResults] = useState<QuizResultRecord[]>(() =>
    readStorageArray<QuizResultRecord>(quizResultsKey)
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      skipFavoriteSave.current = true;
      const nextFavorites = getInitialFavorites(favoriteStorageKey);
      setFavoriteIds(nextFavorites);
      onFavoritesCountChange(nextFavorites.length);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [favoriteStorageKey, onFavoritesCountChange]);

  useEffect(() => {
    if (skipFavoriteSave.current) {
      skipFavoriteSave.current = false;
      return;
    }

    window.localStorage.setItem(favoriteStorageKey, JSON.stringify(favoriteIds));
    onFavoritesCountChange(favoriteIds.length);
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
  }, [favoriteIds, favoriteStorageKey, onFavoritesCountChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisitedItems(getInitialVisited(visitedStorageKey));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [visitedStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(visitedStorageKey, JSON.stringify(visitedItems));
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
  }, [visitedItems, visitedStorageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWantVisitItems(getInitialWantVisits(wantVisitStorageKey));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [wantVisitStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(wantVisitStorageKey, JSON.stringify(wantVisitItems));
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
  }, [wantVisitItems, wantVisitStorageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuizResults(readStorageArray<QuizResultRecord>(quizResultsKey));
      setQuizAnswers({});
      setQuizFeedback("");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [quizResultsKey]);

  useEffect(() => {
    window.localStorage.setItem(quizResultsKey, JSON.stringify(quizResults));
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
  }, [quizResults, quizResultsKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDrawerOpen(false), 0);

    return () => window.clearTimeout(timer);
  }, [activeView]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRouteSummary(null);
      setRouteStatus(copy.routeModeStatus + copy.transport[transportMode]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [copy, transportMode]);

  const favoritePlaces = useMemo(
    () => places.filter((place) => favoriteIds.includes(place.id)),
    [favoriteIds]
  );
  const visitedIds = useMemo(() => visitedItems.map((item) => item.placeId), [visitedItems]);
  const visitedProgress = Math.round((visitedIds.length / places.length) * 100);
  const activeTimelinePeriods = useMemo(
    () => (timelineFilter === "all" ? homeTimeline : homeTimeline.filter((period) => period.year === timelineFilter)),
    [timelineFilter]
  );

  const filteredPlaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return places.filter((place) => {
      const matchesCategory = placeMatchesCategory(place, activeCategory);
      const matchesFavorites =
        !showOnlyFavorites || favoriteIds.includes(place.id);
      const matchesStatus = statusFilter === "all" || (statusFilter === "favorites" && favoriteIds.includes(place.id));
      const matchesNearby =
        !showNearbyOnly ||
        distanceMeters(routeStart, place.position) <= nearbyLimitMeters;
      const matchesSearch =
        query.length === 0 ||
        `${place.name} ${place.categoryLabel} ${place.shortDescription} ${
          place.tags?.join(" ") ?? ""
        }`
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesFavorites && matchesStatus && matchesNearby && matchesSearch;
    });
  }, [
    activeCategory,
    favoriteIds,
    routeStart,
    searchQuery,
    showNearbyOnly,
    showOnlyFavorites,
    statusFilter,
  ]);

  const categoryPeople = useMemo(
    () =>
      activeCategory === "all"
        ? places
        : places.filter((place) => placeMatchesCategory(place, activeCategory)),
    [activeCategory]
  );
  const activeCategoryInfo =
    categories.find((category) => category.id === activeCategory) ??
    categories[0];
  const featuredPlaces = useMemo(
    () => places.filter((place) => [1, 4, 9].includes(place.id)),
    []
  );
  const architecturePlacesTotal = getCurrentCategoryCount("architektura");
  const recommendedCategoryId =
    activeCategory === "all" ? "architektura" : activeCategory;
  const recommendedCategoryInfo =
    categories.find((category) => category.id === recommendedCategoryId) ??
    categories[0];
  const recommendedRoutePlaces = useMemo(
    () =>
      places.filter((place) =>
        placeMatchesCategory(place, recommendedCategoryId)
      ),
    [recommendedCategoryId]
  );
  const recommendedPlaceWord =
    recommendedRoutePlaces.length === 1
      ? copy.placesWord[0]
      : recommendedRoutePlaces.length < 5
        ? copy.placesWord[1]
        : copy.placesWord[2];

  const markerPlaces =
    activeView === "favorites" ? favoritePlaces : filteredPlaces;

  const selectedPlace =
    markerPlaces.find((place) => place.id === selectedId) ??
    markerPlaces[0] ??
    null;
  const selectedTimeline = selectedPlace ? getTimeline(selectedPlace, languageKey) : [];

  const mapCenter = selectedPlace?.position ?? cemeteryGate;
  const isSelectedFavorite = selectedPlace
    ? favoriteIds.includes(selectedPlace.id)
    : false;
  const routeTarget = places.find((place) => place.id === routeTargetId);
  const routeStartSource =
    userLocation && distanceMeters(routeStart, userLocation) < 25
      ? "user"
      : "gate";
  const routeStartLabel =
    routeStartSource === "user"
      ? languageKey === "en"
        ? "Your location"
        : "Twoja lokalizacja"
      : copy.gate;
  const categoryRoutePlaces = useMemo(
    () => getCurrentCategoryRoutePlaces(activeCategory),
    [activeCategory]
  );
  const hasCategoryRoute =
    activeCategory !== "all" &&
    routeTargetId === null &&
    categoryRoutePlaces.length > 1;
  const routeWaypoints = useMemo(() => {
    if (hasCategoryRoute) {
      return [
        routeStart,
        ...categoryRoutePlaces.map((place) => place.position),
      ];
    }

    if (routeTarget) {
      return [routeStart, routeTarget.position];
    }

    return [];
  }, [categoryRoutePlaces, hasCategoryRoute, routeStart, routeTarget]);
  const fallbackRouteDistance = useMemo(
    () =>
      routeWaypoints.slice(1).reduce(
        (total, point, index) =>
          total + distanceMeters(routeWaypoints[index], point),
        0
      ),
    [routeWaypoints]
  );
  const fallbackRouteTime = Math.round(
    fallbackRouteDistance / transportModes[transportMode].speedMps
  );
  const currentWalkPlaces =
    activeCategory === "all" ? recommendedRoutePlaces : categoryRoutePlaces;
  const tourPlaces = useMemo(
    () =>
      currentWalkPlaces.length > 0
        ? currentWalkPlaces
        : places.slice(0, Math.min(3, places.length)),
    [currentWalkPlaces, places]
  );
  const audioRoutePlaces = hasCategoryRoute
    ? categoryRoutePlaces
    : routeTarget
      ? [routeTarget]
      : selectedPlace
        ? [selectedPlace]
        : currentWalkPlaces;
  const currentWalkDistance = getRouteDistanceFor(currentWalkPlaces, routeStart);
  const currentWalkTime = estimateWalkingTime(currentWalkDistance);
  const safeTourStepIndex = Math.min(
    tourStepIndex,
    Math.max(0, tourPlaces.length - 1)
  );
  const activeTourPlace = tourPlaces[safeTourStepIndex] ?? selectedPlace;
  const tourVisitedCount = tourPlaces.filter((place) =>
    visitedIds.includes(place.id)
  ).length;
  const tourProgress = tourPlaces.length
    ? Math.round((tourVisitedCount / tourPlaces.length) * 100)
    : 0;
  const categoryLabels = useMemo(
    () =>
      categories
        .filter((category) => category.id !== "all")
        .map((category) => category.label),
    [categories]
  );
  const quizQuestions = useMemo<QuizQuestion[]>(
    () =>
      tourPlaces.slice(0, 4).map((place, index) => {
        const distractors = categoryLabels.filter(
          (label) => label !== place.categoryLabel
        );
        const rotatedDistractors = [
          ...distractors.slice(index),
          ...distractors.slice(0, index),
        ].slice(0, 3);
        const options: string[] =
          index % 2 === 0
            ? [place.categoryLabel, ...rotatedDistractors]
            : [
                rotatedDistractors[0],
                place.categoryLabel,
                ...rotatedDistractors.slice(1),
              ].filter((option): option is string => Boolean(option));

        return {
          id: place.id,
          question: tourCopy.categoryQuestion(place.name),
          options: Array.from(new Set(options)).slice(0, 4),
          answer: place.categoryLabel,
          placeName: place.name,
        };
      }),
    [categoryLabels, tourCopy, tourPlaces]
  );
  const latestQuizResult = quizResults[0] ?? null;
  const hasPerfectQuiz = quizResults.some(
    (result) => result.total > 0 && result.score === result.total
  );
  const tourBadges = [
    {
      id: "first-visit",
      label: tourCopy.badgeFirst,
      unlocked: visitedIds.length > 0,
      icon: FaMapMarkerAlt,
    },
    {
      id: "route-explorer",
      label: tourCopy.badgeExplorer,
      unlocked: tourPlaces.length > 0 && tourVisitedCount === tourPlaces.length,
      icon: FaRoute,
    },
    {
      id: "memory-collector",
      label: tourCopy.badgeCollector,
      unlocked: favoriteIds.length >= 3,
      icon: FaHeart,
    },
    {
      id: "quiz-master",
      label: tourCopy.badgeQuiz,
      unlocked: hasPerfectQuiz,
      icon: FaQuestionCircle,
    },
  ];
  const hasActiveRoute =
    routeWaypoints.length > 1 && (Boolean(routeTarget) || hasCategoryRoute);
  const offlineStatus = networkOnline ? copy.routeLocal : copy.noInternet;
  const offlinePanelTitle = onlineMode
    ? copy.onlineNavigation
    : networkOnline
      ? copy.offlineLocalData
      : copy.localModeNoInternet;

  const handleRouteFound = useCallback((summary: RouteSummary) => {
    setRouteSummary(summary);
  }, []);

  const handleRouteError = useCallback(() => {
    setRouteStatus(copy.routeError);
    setRouteSummary(null);
  }, []);

  const pickCategory = (categoryId: CategoryId) => {
    setActiveCategory(categoryId);
    setRouteTargetId(null);
    setRouteSummary(null);
    setRouteStatus(
      categoryId !== "all"
        ? onlineMode
          ? copy.routeCategory + categories.find((category) => category.id === categoryId)?.label
          : copy.routeOfflineApprox
        : copy.routeStart
    );
    setShowOnlyFavorites(false);

    const firstMatchingPlace = places.find(
      (place) => placeMatchesCategory(place, categoryId)
    );

    if (firstMatchingPlace) {
      setSelectedId(firstMatchingPlace.id);
    }
  };

  const handleCategoryClick = (categoryId: CategoryId) => {
    pickCategory(categoryId);

    if (activeView !== "list") {
      onViewChange("map");
    }
  };

  const recordWalkStart = (
    routeName: string,
    pointCount: number,
    distance: number,
    duration: number
  ) => {
    const history = readStorageArray<WalkHistoryRecord>(walkHistoryKey);
    const entry: WalkHistoryRecord = {
      id: `walk-${Date.now()}`,
      routeName,
      pointCount,
      distance,
      duration,
      startedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(walkHistoryKey, JSON.stringify([entry, ...history].slice(0, 30)));
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
  };

  const startCategoryRoute = (categoryId: CategoryId) => {
    const routePlaces = getCurrentCategoryRoutePlaces(categoryId);
    const routeDistance = getRouteDistanceFor(routePlaces, routeStart);
    const routeTime = estimateWalkingTime(routeDistance);
    const routeLabel =
      categories.find((category) => category.id === categoryId)?.label ?? "Rasos";

    if (routePlaces.length > 1) {
      recordWalkStart(`${routeLabel} Rasos`, routePlaces.length, routeDistance, routeTime);
    }

    pickCategory(categoryId);
    onViewChange("walk");
  };

  const startArchitectureRoute = () => {
    startCategoryRoute("architektura");
  };

  const startRecommendedRoute = () => {
    startCategoryRoute(recommendedCategoryId);
  };

  const markPlaceVisited = (placeId: number) => {
    setVisitedItems((items) =>
      items.some((item) => item.placeId === placeId)
        ? items
        : [{ placeId, visitedAt: new Date().toISOString() }, ...items]
    );
  };

  const goToTourStep = (index: number) => {
    const place = tourPlaces[index];
    if (!place) return;

    setTourStepIndex(index);
    setSelectedId(place.id);
    setRouteTargetId(place.id);
    setRouteSummary(null);
    onViewChange("walk");
  };

  const startTourMode = () => {
    const firstPlace = tourPlaces[0];
    if (!firstPlace) return;

    if (tourActive) {
      goToTourStep(safeTourStepIndex);
      return;
    }

    setTourActive(true);
    setQuizOpen(false);
    setQuizAnswers({});
    setQuizFeedback("");
    setTourStepIndex(0);
    setSelectedId(firstPlace.id);
    setRouteTargetId(firstPlace.id);
    setRouteSummary(null);
    recordWalkStart(
      `${tourCopy.title}: ${activeCategory === "all" ? recommendedCategoryInfo.label : activeCategoryInfo.label}`,
      tourPlaces.length,
      getRouteDistanceFor(tourPlaces, routeStart),
      estimateWalkingTime(getRouteDistanceFor(tourPlaces, routeStart))
    );
    onViewChange("walk");
  };

  const completeTourPoint = () => {
    if (!activeTourPlace) return;

    markPlaceVisited(activeTourPlace.id);

    if (safeTourStepIndex < tourPlaces.length - 1) {
      goToTourStep(safeTourStepIndex + 1);
      return;
    }

    setTourActive(false);
    setQuizOpen(true);
    setQuizFeedback(tourCopy.tourFinished);
    setRouteTargetId(null);
    setRouteSummary(null);
  };

  const submitQuiz = () => {
    if (quizQuestions.length === 0) return;

    const score = quizQuestions.reduce(
      (total, question) =>
        total + (quizAnswers[question.id] === question.answer ? 1 : 0),
      0
    );
    const result: QuizResultRecord = {
      id: `quiz-${Date.now()}`,
      routeName:
        activeCategory === "all"
          ? `${recommendedCategoryInfo.label} Rossy`
          : `${activeCategoryInfo.label} Rossy`,
      score,
      total: quizQuestions.length,
      completedAt: new Date().toISOString(),
    };

    setQuizResults((items) => [result, ...items].slice(0, 20));
    setQuizFeedback(
      score === quizQuestions.length ? tourCopy.quizPerfect : tourCopy.quizTryAgain
    );
  };

  const saveCurrentRoute = () => {
    if (!hasActiveRoute && !selectedPlace) return false;

    const routePlaces = hasCategoryRoute ? categoryRoutePlaces : routeTarget ? [routeTarget] : selectedPlace ? [selectedPlace] : [];
    if (routePlaces.length === 0) return false;

    const name = hasCategoryRoute
      ? `${copy.trailPrefix}${activeCategoryInfo.label}`
      : routePlaces[0]
        ? `${copy.routeTo}${routePlaces[0].name}`
        : copy.routeDefaultName;
    const savedWaypoints =
      routeWaypoints.length > 1
        ? routeWaypoints
        : [routeStart, ...routePlaces.map((place) => place.position)];
    const savedDistance =
      routeSummary?.distance ??
      savedWaypoints.slice(1).reduce(
        (total, point, index) => total + distanceMeters(savedWaypoints[index], point),
        0
      );
    const savedTime =
      routeSummary?.time ??
      Math.max(60, Math.round(savedDistance / transportModes[transportMode].speedMps));
    const destination = routePlaces[routePlaces.length - 1];
    const route: SavedRouteRecord = {
      id: `route-${Date.now()}`,
      name,
      pointCount: routePlaces.length,
      distance: Math.round(savedDistance),
      time: Math.round(savedTime),
      savedAt: new Date().toISOString(),
      mode: transportMode,
      routeKind: hasCategoryRoute ? "category" : "single",
      categoryId: hasCategoryRoute ? activeCategory : routePlaces[0]?.category,
      categoryLabel: hasCategoryRoute ? activeCategoryInfo.label : routePlaces[0]?.categoryLabel,
      start: {
        label: routeStartLabel,
        position: routeStart,
        source: routeStartSource,
      },
      end: {
        label: destination?.name ?? copy.routeDefaultName,
        position: destination?.position ?? null,
      },
      places: routePlaces.map((place) => ({
        id: place.id,
        name: place.name,
        years: place.years,
        category: place.category,
        categoryLabel: place.categoryLabel,
        position: place.position,
        image: place.image,
        shortDescription: place.shortDescription,
      })),
      waypoints: savedWaypoints,
      summarySource: routeSummary ? "online" : "offline",
      savedOnDevice: true,
    };
    const routes = readStorageArray<SavedRouteRecord>(savedRoutesKey);
    window.localStorage.setItem(savedRoutesKey, JSON.stringify([route, ...routes].slice(0, 24)));
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
    return true;
  };

  const openSavedRoute = (route: SavedRouteRecord) => {
    const savedMode =
      route.mode in transportModes ? (route.mode as TransportModeId) : "walk";
    const savedCategory =
      categories.find((category) => category.id === route.categoryId)?.id ?? null;
    const firstPlaceId = route.places?.[0]?.id ?? null;

    setTransportMode(savedMode);
    setRouteStart(route.start?.position ?? cemeteryGate);
    setRouteSummary({
      distance: route.distance,
      time: route.time,
    });

    if (route.routeKind === "category" && savedCategory && savedCategory !== "all") {
      setActiveCategory(savedCategory);
      setRouteTargetId(null);
      setSelectedId(firstPlaceId);
    } else if (firstPlaceId) {
      setActiveCategory("all");
      setSelectedId(firstPlaceId);
      setRouteTargetId(firstPlaceId);
    }

    setRouteStatus(`Otworzono trase zapisana na tym urzadzeniu: ${route.name}.`);
    onViewChange("map");
  };

  const resetUserData = () => {
    setFavoriteIds([]);
    setVisitedItems([]);
    setWantVisitItems([]);
    setQuizResults([]);
    [favoriteStorageKey, visitedStorageKey, wantVisitStorageKey, savedRoutesKey, walkHistoryKey, plannedWalksKey, timeSpentKey, quizResultsKey].forEach((key) => {
      window.localStorage.removeItem(key);
    });
    window.dispatchEvent(new Event("rossa-profile-data-changed"));
  };

  const toggleFavorite = (placeId: number) => {
    const isFavorite = favoriteIds.includes(placeId);

    if (isFavorite) {
      const nextFavorites = favoriteIds.filter((id) => id !== placeId);
      setFavoriteIds(nextFavorites);

      if (activeView === "favorites" && selectedId === placeId) {
        setSelectedId(nextFavorites[0] ?? null);
      }

      return;
    }

    setFavoriteIds([...favoriteIds, placeId]);
    setSelectedId(placeId);
  };

  const showPlaceOnMap = (placeId: number) => {
    setSelectedId(placeId);
    setActiveCategory("all");
    setShowOnlyFavorites(false);
    setStatusFilter("all");
    setRouteTargetId(null);
    setRouteSummary(null);
    onViewChange("map");
  };

  const openPersonDetails = (placeId: number) => {
    const place = places.find((item) => item.id === placeId);
    if (!place) return;
    setSelectedId(place.id);
    setRouteTargetId(null);
    onPersonOpen?.(slugifyPlace(place.name));
  };

  const handleNavigate = () => {
    if (!selectedPlace) {
      return;
    }

    setSelectedId(selectedPlace.id);
    setActiveCategory("all");
    setShowOnlyFavorites(false);
    setRouteTargetId(selectedPlace.id);
    setRouteSummary(null);
    recordWalkStart(
      `${copy.routeTo}${selectedPlace.name}`,
      1,
      fallbackRouteDistance || distanceMeters(routeStart, selectedPlace.position),
      fallbackRouteTime || estimateWalkingTime(distanceMeters(routeStart, selectedPlace.position))
    );
    onViewChange("map");

    if (!navigator.geolocation) {
      setRouteStart(cemeteryGate);
      setRouteStatus(
        onlineMode
          ? copy.startGateStatus
          : copy.offlineStartGate
      );
      return;
    }

    setRouteStatus(
      onlineMode ? copy.gettingLocation : copy.gettingGps
    );
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: LatLngTuple = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(nextLocation);
        setRouteStart(nextLocation);
        setRouteStatus(
          onlineMode
            ? copy.startCurrentPosition
            : copy.offlineStartCurrentPosition
        );
      },
      () => {
        setRouteStart(cemeteryGate);
        setRouteStatus(
          onlineMode
            ? copy.gpsUnavailableGate
            : copy.gpsUnavailableOffline
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setRouteStatus(copy.geolocationUnsupported);
      return;
    }

    setRouteStatus(
      onlineMode ? copy.gettingLocation : copy.gettingGps
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: LatLngTuple = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(nextLocation);
        setRouteStart(nextLocation);
        setRouteStatus(
          onlineMode
            ? copy.startCurrentPosition
            : copy.offlineStartCurrentPosition
        );
        setRouteSummary(null);
      },
      () => {
        setRouteStatus(
          copy.locationFailed
        );
        setRouteSummary(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const clearRoute = () => {
    setRouteTargetId(null);
    setRouteSummary(null);
    setRouteStatus(copy.startGateStatus);

    if (activeCategory !== "all") {
      setActiveCategory("all");
    }
  };
  const renderPlaceBadges = (place: CemeteryPlace) => (
    <div className="place-status-badges">
      {visitedIds.includes(place.id) && <span className="visited"><FaCheckCircle /> {tourCopy.visited}</span>}
      {wantVisitItems.some((item) => item.placeId === place.id) && <span className="want"><FaMedal /> {tourCopy.planned}</span>}
      {favoriteIds.includes(place.id) && <span className="favorite"><FaHeart /> {copy.favorites}</span>}
    </div>
  );

  const renderImage = (place: CemeteryPlace, className?: string) => (
    <img
      alt={place.name}
      className={className}
      onError={(event) => {
        event.currentTarget.src = imageFallback(place.name);
      }}
      src={place.image}
    />
  );

  const renderMapSection = () => (
    <MapView
      audioRoutePlaces={audioRoutePlaces}
      center={mapCenter}
      endLabel={(routeTarget ?? selectedPlace)?.name ?? null}
      fallbackDistance={fallbackRouteDistance}
      fallbackTime={fallbackRouteTime}
      getImageFallback={imageFallback}
      hasActiveRoute={hasActiveRoute}
      favoriteIds={favoriteIds}
      onlineMode={onlineMode}
      onNavigate={handleNavigate}
      onRouteError={handleRouteError}
      onRouteFound={handleRouteFound}
      onShowDetails={openPersonDetails}
      onToggleFavorite={toggleFavorite}
      onSelectPlace={(placeId) => {
        setSelectedId(placeId);
        setRouteTargetId(null);
      }}
      onStartWalk={startRecommendedRoute}
      onTransportModeChange={setTransportMode}
      onUseLocation={requestCurrentLocation}
      places={markerPlaces}
      routeStatus={onlineMode ? routeStatus : offlineStatus}
      routeSummary={routeSummary}
      routeWaypoints={routeWaypoints}
      selectedPlaceId={selectedPlace?.id ?? null}
      startLabel={routeStartLabel}
      transportMode={transportMode}
      userLocation={userLocation}
    />
  );

  if (activeView === "person") {
    const personPlace =
      (personSlug ? places.find((place) => slugifyPlace(place.name) === personSlug) : null) ??
      selectedPlace ??
      places[0];
    const relatedPlaces = places
      .filter(
        (place) =>
          place.id !== personPlace.id &&
          (place.category === personPlace.category ||
            place.tags?.includes(personPlace.category) ||
            personPlace.tags?.includes(place.category))
      )
      .slice(0, 6);

    return (
      <PersonDetailPage
        isFavorite={favoriteIds.includes(personPlace.id)}
        language={appLanguage === "en" ? "en-GB" : "pl-PL"}
        notesKey={`rossa-notes-${currentUserId ?? "guest"}-${personPlace.id}`}
        onBack={() => onViewChange("map")}
        onLanguageChange={(language) => onLanguageChange(language === "en-GB" ? "en" : "pl")}
        onOpenPerson={openPersonDetails}
        onRoute={() => {
          setSelectedId(personPlace.id);
          setActiveCategory("all");
          setStatusFilter("all");
          setRouteTargetId(personPlace.id);
          setRouteSummary(null);
          onViewChange("map");
        }}
        onSaveRoute={saveCurrentRoute}
        onShowOnMap={() => showPlaceOnMap(personPlace.id)}
        onToggleFavorite={() => toggleFavorite(personPlace.id)}
        place={personPlace}
        relatedPlaces={relatedPlaces.length > 0 ? relatedPlaces : places.filter((place) => place.id !== personPlace.id).slice(0, 4)}
      />
    );
  }

  if (activeView === "profile") {
    return (
      <UserProfilePage
        currentUser={currentUser}
        favoriteIds={favoriteIds}
        language={appLanguage}
        onLanguageChange={onLanguageChange}
        onOpenSavedRoute={openSavedRoute}
        onResetUserData={resetUserData}
        onSaveCurrentRoute={saveCurrentRoute}
        onShowPlace={showPlaceOnMap}
        onThemeChange={onThemeChange}
        onToggleFavorite={toggleFavorite}
        onUserChange={onUserChange}
        places={places}
        plannedWalksKey={plannedWalksKey}
        quizResultsKey={quizResultsKey}
        savedRoutesKey={savedRoutesKey}
        theme={theme}
        timeSpentKey={timeSpentKey}
        userSettings={userSettings}
        visitedCount={visitedItems.length}
        walkHistoryKey={walkHistoryKey}
      />
    );
  }

  if (activeView === "home") {
    return (
      <main className="home-page">
        <section className="home-hero">
          <div className="home-copy">
            <span className="eyebrow">{copy.homeEyebrow}</span>
            <h1>{copy.homeTitle}</h1>
            <p>{copy.homeLead}</p>

            <div className="home-actions">
              <button onClick={() => onViewChange("map")} type="button">
                <FaMapMarkerAlt /> {copy.openMap}
              </button>
              <button onClick={startArchitectureRoute} type="button">
                <FaDraftingCompass /> {copy.architectureTrail}
              </button>
              <button onClick={() => onViewChange("list")} type="button">
                <FaBookOpen /> {copy.catalog}
              </button>
            </div>

            <div className="home-metrics" aria-label="Statystyki aplikacji">
              <span>
                <strong>{places.length}</strong>
                <small>{copy.statsPlaces}</small>
              </span>
              <span>
                <strong>{categories.length - 1}</strong>
                <small>{copy.statsCategories}</small>
              </span>
              <span>
                <strong>{architecturePlacesTotal}</strong>
                <small>{copy.statsArchitecture}</small>
              </span>
              <span>
                <strong>{visitedProgress}%</strong>
                <small>{copy.statsCompletion}</small>
              </span>
            </div>
          </div>

          <aside className="home-visual" aria-label={copy.cemeteryPhotoAria}>
            <div className="home-visual-frame rossa-visual-frame">
              <img src={assetImage("rossa.jpg")} alt={copy.cemeteryAlt} />
              <img src={assetImage("rossa.1.jpg")} alt={copy.cemeteryPathAlt} />
              <img src={assetImage("rossa.2.jpg")} alt={copy.cemeteryGravesAlt} />
            </div>
            <div className="home-visual-caption">
              <span>{onlineMode ? copy.modeOnline : copy.modeOffline}</span>
              <small>
                {onlineMode
                  ? copy.captionOnline
                  : copy.captionOffline}
              </small>
            </div>
          </aside>
        </section>

        <section className="home-feature-strip" aria-label={copy.featuresAria}>
          <button onClick={startArchitectureRoute} type="button">
            <FaRoute />
            <span>{copy.readyTrail}</span>
            <strong>{copy.readyTrailTitle}</strong>
            <small>{copy.readyTrailDesc}</small>
          </button>

          <button onClick={() => onViewChange("categories")} type="button">
            <FaLayerGroup />
            <span>{copy.order}</span>
            <strong>{copy.categories}</strong>
            <small>{copy.categoriesDesc}</small>
          </button>

          <button onClick={() => onViewChange("favorites")} type="button">
            <FaHeart />
            <span>{copy.memory}</span>
            <strong>{copy.favorites}</strong>
            <small>{copy.favoritesDesc}</small>
          </button>
        </section>

        <section className="home-featured" aria-label={copy.featuredEyebrow}>
          <div>
            <span className="eyebrow">{copy.featuredEyebrow}</span>
            <h2>{copy.featuredTitle}</h2>
          </div>

          <div className="home-featured-list">
            {featuredPlaces.map((place) => (
              <button
                key={place.id}
                onClick={() => openPersonDetails(place.id)}
                type="button"
              >
                {renderImage(place)}
                <span>
                  <strong>{place.name}</strong>
                  <small>{place.shortDescription}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="home-timeline" aria-label={copy.timelineAria}>
          <div className="home-section-copy">
            <span className="eyebrow">{copy.timelineEyebrow}</span>
            <h2>{copy.timelineTitle}</h2>
            <p>{copy.timelineLead}</p>
          </div>

          <div className="timeline-filter" aria-label={copy.timelineFilter}>
            {(["all", "1800", "1850", "1900", "1950"] as TimelineFilter[]).map((filter) => (
              <button
                className={timelineFilter === filter ? "active" : ""}
                key={filter}
                onClick={() => setTimelineFilter(filter)}
                type="button"
              >
                {filter === "all" ? copy.all : filter}
              </button>
            ))}
          </div>

          <div className="timeline-rail">
            {activeTimelinePeriods.map((period) => (
              <article className="timeline-period" key={period.year}>
                <span>{period.year}</span>
                <h3>{period.title}</h3>
                <div>
                  {period.placeIds.map((placeId) => {
                    const place = places.find((item) => item.id === placeId);
                    if (!place) return null;

                    return (
                      <button
                        key={place.id}
                        onClick={() => openPersonDetails(place.id)}
                        type="button"
                      >
                        {renderImage(place)}
                        <strong>{place.name}</strong>
                        <small>{place.years}</small>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-memory" aria-label={copy.memoryAria}>
          <div className="memory-line" />
          <p>{copy.memoryQuote}</p>
          <span>{copy.cemeteryName}</span>
        </section>
      </main>
    );
  }

  if (activeView === "project") {
    return (
      <main className="project-page">
        <section className="project-hero">
          <div>
            <span className="eyebrow">{copy.projectEyebrow}</span>
            <h1>{copy.projectTitle}</h1>
            <p>{copy.projectLead}</p>
          </div>
          <figure className="project-university-seal">
            <img
              src={assetImage("godlo_uwb_konturowe_png.png")}
              alt="Znak Uniwersytetu w Bialymstoku"
            />
            <figcaption>Uniwersytet w Białymstoku</figcaption>
          </figure>
        </section>

        <section className="project-photo-gallery" aria-label={copy.projectGalleryAria}>
          <figure>
            <img src={assetImage("rossa.jpg")} alt={copy.cemeteryName} />
          </figure>
          <figure>
            <img src={assetImage("rossa.1.jpg")} alt="Alejka na Cmentarzu Na Rossie" />
          </figure>
          <figure>
            <img src={assetImage("rossa.2.jpg")} alt="Nagrobki na Cmentarzu Na Rossie" />
          </figure>
        </section>

        <section className="project-grid">
          <article>
            <FaBookOpen />
            <h2>{copy.projectGoal}</h2>
            <p>{copy.projectGoalText}</p>
          </article>
          <article>
            <FaLandmark />
            <h2>{copy.aboutRossa}</h2>
            <p>{copy.aboutRossaText}</p>
          </article>
          <article>
            <FaRoute />
            <h2>{copy.functions}</h2>
            <p>{copy.functionsText}</p>
          </article>
        </section>
      </main>
    );
  }

  if (activeView === "categories") {
    return (
      <main className="categories-page">
        <section className="categories-hero">
          <span className="eyebrow">{copy.categories}</span>
          <h1>{copy.categoriesTitle}</h1>
          <p>{copy.categoriesLead}</p>
        </section>

        <section className="category-grid">
          {categories.map((category) => {
            const Icon = category.icon;
            const count = getCurrentCategoryCount(category.id);

            return (
              <button
                className={`category-tile ${
                  activeCategory === category.id ? "active" : ""
                }`}
                key={category.id}
                onClick={() => pickCategory(category.id)}
                type="button"
              >
                <Icon />
                <strong>{category.label}</strong>
                <span>{count} {copy.items}</span>
                <p>{category.description}</p>
              </button>
            );
          })}
        </section>

        <section className="category-preview">
          <div className="list-header">
            <h3>
              {activeCategory === "all"
                ? copy.allPeople
                : categories.find((category) => category.id === activeCategory)
                    ?.label}{" "}
              ({categoryPeople.length})
            </h3>
            <button
              className="small-button"
              onClick={() =>
                activeCategory !== "all" && categoryPeople.length > 1
                  ? startCategoryRoute(activeCategory)
                  : onViewChange("map")
              }
              type="button"
            >
              {activeCategory !== "all" && categoryPeople.length > 1
                ? copy.showTrail
                : copy.showOnMap}
            </button>
          </div>

          <div className="category-people">
            {categoryPeople.map((place) => (
              <button
                className={`category-person ${
                  selectedPlace?.id === place.id ? "active" : ""
                }`}
                key={place.id}
                onClick={() => openPersonDetails(place.id)}
                type="button"
              >
                {renderImage(place)}
                <span>
                  <strong>{place.name}</strong>
                  <small>{place.categoryLabel}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div
      className={`layout ${activeView === "walk" ? "walk-layout" : ""} ${
        activeView === "list" ? "list-layout" : ""
      }`}
    >
      {activeView !== "walk" && (
        <>
          <button
            className={`drawer-toggle ${drawerOpen ? "hidden" : ""}`}
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <FaLayerGroup /> Katalog kategorii
          </button>
          {drawerOpen && (
            <button
              aria-label={copy.closeFilters}
              className="drawer-scrim"
              onClick={() => setDrawerOpen(false)}
              type="button"
            />
          )}
        </>
      )}
      {activeView !== "walk" && (
      <div className={`sidebar ${drawerOpen ? "open" : ""}`}>
        <button
          aria-label={copy.closeFilters}
          className="drawer-close"
          onClick={() => setDrawerOpen(false)}
          type="button"
        >
          <FaTimes aria-hidden="true" />
        </button>
        <h3>Kategorie</h3>

        {categories.map((category) => {
          const Icon = category.icon;
          const count = getCurrentCategoryCount(category.id);

          return (
            <button
              className={activeCategory === category.id ? "active" : ""}
              key={category.id}
              onClick={() => {
                handleCategoryClick(category.id);
                setDrawerOpen(false);
              }}
              type="button"
            >
              <Icon />
              <span className="category-button-text">
                <strong>{category.label}</strong>
                <small>{count} {copy.items}</small>
              </span>
            </button>
          );
        })}

        <div className="route-spotlight">
          <span className="eyebrow">{copy.recommendedTrail}</span>
          <h4>{recommendedCategoryInfo.label} Rossy</h4>
          <p>
            {recommendedRoutePlaces.length > 1
              ? `${recommendedRoutePlaces.length} ${recommendedPlaceWord} ${copy.connectedRoute}`
              : `${recommendedRoutePlaces.length} ${recommendedPlaceWord} ${copy.inThisCategory}`}
          </p>
          <button
            className="spotlight-button"
            onClick={startRecommendedRoute}
            type="button"
          >
            <FaCompass />{" "}
            {recommendedRoutePlaces.length > 1 ? copy.showTrail : copy.showPlace}
          </button>
        </div>

        <div className={`offline-brief ${onlineMode ? "online" : "offline"}`}>
          <span className="eyebrow">{copy.appStatus}</span>
          <h4>{offlinePanelTitle}</h4>
          <p>
            {onlineMode ? copy.onlineRoutes : copy.offlineRoutes}
          </p>
          <ul>
            <li>{onlineMode ? copy.roadRouting : copy.localRoute}</li>
            <li>{networkOnline ? copy.networkAvailable : copy.noConnection}</li>
            <li>{copy.savedInApp}</li>
          </ul>
        </div>

        <div className="visit-progress-panel">
          <span className="eyebrow">{copy.statsCompletion}</span>
          <h4><FaTrophy /> {visitedProgress}% ukończenia</h4>
          <div className="progress-track">
            <span style={{ width: `${visitedProgress}%` }} />
          </div>
          <small>{places.length} {copy.statsPlaces} Rasos</small>
        </div>

        <div className="filters">
          <h4>{copy.quickFilters}</h4>

          <label>
            <input
              checked={showOnlyFavorites}
              onChange={(event) => setShowOnlyFavorites(event.target.checked)}
              type="checkbox"
            />
            <span>
              {copy.onlyFavorites}
              <small>{favoriteIds.length} {copy.savedPlaces}</small>
            </span>
          </label>

          <label>
            <input
              checked={showNearbyOnly}
              onChange={(event) => {
                const checked = event.target.checked;
                setShowNearbyOnly(checked);

                if (checked) {
                  requestCurrentLocation();
                }
              }}
              type="checkbox"
            />
            <span>
              {copy.nearbyOnly}
              <small>{copy.about} {nearbyLimitMeters} m {copy.fromStart}</small>
            </span>
          </label>
          <div className="status-filter-chips" aria-label={copy.statusFilters}>
            {([
              ["all", copy.all],
              ["favorites", copy.favorites],
            ] as Array<[PlaceStatusFilter, string]>).map(([filter, label]) => (
              <button
                className={statusFilter === filter ? "active" : ""}
                key={filter}
                onClick={() => setStatusFilter(filter)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="center">
        {activeView === "favorites" ? (
          <div className="list favorites-list">
            <div className="list-header">
              <h3>{copy.favoritePlaces} ({favoritePlaces.length})</h3>
              <button
                className="small-button"
                onClick={() => onViewChange("map")}
                type="button"
              >
                {copy.showOnMap}
              </button>
            </div>

            {favoritePlaces.length === 0 ? (
              <div className="empty-favorites">
                <FaHeart />
                <h4>{copy.noFavoritesTitle}</h4>
                <p>{copy.noFavoritesText}</p>
              </div>
            ) : (
              favoritePlaces.map((place) => (
                <div
                  className={`item favorite-item ${
                    selectedPlace?.id === place.id ? "active" : ""
                  }`}
                  key={place.id}
                  onClick={() => {
                    setSelectedId(place.id);
                    setRouteTargetId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(place.id);
                      setRouteTargetId(null);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {renderImage(place)}
                  <div>
                    <h4>
                      {place.name}{" "}
                      <span
                        className={
                          place.category === "wojskowi" ? "tag blue" : "tag"
                        }
                      >
                        {place.categoryLabel}
                      </span>
                    </h4>
                    <p>{place.years}</p>
                    <p>{place.shortDescription}</p>
                    <p className="distance">
                      {formatDistance(distanceMeters(routeStart, place.position))}
                    </p>
                      {renderPlaceBadges(place)}
                      <div className="item-actions">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openPersonDetails(place.id);
                          }}
                          type="button"
                        >
                          <FaExternalLinkAlt /> {copy.details}
                        </button>
                      </div>

                    <button
                      className="quiet-remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(place.id);
                      }}
                      type="button"
                    >
                      {copy.removeFavorite}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="workspace-bar">
              <div>
                <span className="eyebrow">
                  {activeView === "list"
                    ? copy.workspaceCatalog
                    : activeView === "walk"
                      ? copy.workspaceWalk
                      : copy.workspaceMap}
                </span>
                <h2>
                  {activeView === "list"
                    ? copy.listTitle
                    : activeView === "walk"
                      ? activeCategory === "all"
                        ? copy.chooseThemedWalk
                        : `${copy.walkPrefix}${activeCategoryInfo.label}`
                      : activeCategory === "all"
                        ? copy.allPlaces
                        : activeCategoryInfo.label}
                </h2>
                <p>
                  {activeView === "walk"
                    ? copy.walkLead
                    : activeCategory === "architektura"
                      ? copy.architectureLead
                      : copy.mapLead}
                </p>
              </div>
            </div>

            {activeView === "walk" && (
              <section className="walk-planner" aria-label={copy.workspaceWalk}>
                <div className="walk-summary">
                  <span className="eyebrow">{copy.selectedTrail}</span>
                  <h3>
                    {activeCategory === "all"
                      ? `${recommendedCategoryInfo.label} Rossy`
                      : `${activeCategoryInfo.label} Rossy`}
                  </h3>
                  <p>
                    {currentWalkPlaces.length > 1
                      ? `${currentWalkPlaces.length} ${copy.points}, ${copy.about} ${formatDistance(
                          currentWalkDistance
                        )} i ${formatDuration(currentWalkTime)} ${copy.walkTimeSuffix}.`
                      : copy.chooseCategoryWalk}
                  </p>
                  <button
                    className="walk-start"
                    onClick={startTourMode}
                    type="button"
                  >
                    <FaRoute /> {tourCopy.start}
                  </button>
                </div>

                <div className="walk-category-list">
                  {categories.map((category) => {
                    if (category.id === "all") return null;

                    const Icon = category.icon;
                    const routePlaces = getCurrentCategoryRoutePlaces(category.id);
                    const routeDistance = getRouteDistanceFor(routePlaces);
                    const routeTime = estimateWalkingTime(routeDistance);

                    return (
                      <button
                        className={`walk-choice ${
                          activeCategory === category.id ? "active" : ""
                        }`}
                        key={category.id}
                        onClick={() => startCategoryRoute(category.id)}
                        type="button"
                      >
                        <Icon />
                        <span>
                          <strong>{category.label}</strong>
                          <small>
                            {routePlaces.length} {copy.items}{" - "}
                            {routePlaces.length > 1
                              ? `${formatDistance(routeDistance)} - ${formatDuration(
                                  routeTime
                                )}`
                              : copy.singlePoint}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {activeView === "walk" && (
              <section className="tour-mode-panel" aria-label={tourCopy.title}>
                <div className="tour-mode-header">
                  <div>
                    <span className="eyebrow">{tourCopy.title}</span>
                    <h3>{activeTourPlace?.name ?? copy.chooseThemedWalk}</h3>
                    <p>{tourCopy.lead}</p>
                  </div>
                  <button
                    className={tourActive ? "tour-primary active" : "tour-primary"}
                    onClick={startTourMode}
                    type="button"
                  >
                    <FaRoute /> {tourActive ? tourCopy.currentPoint : tourCopy.start}
                  </button>
                </div>

                <div className="tour-progress-row">
                  <span>{tourCopy.progress}</span>
                  <strong>
                    {tourVisitedCount}/{tourPlaces.length} {tourCopy.pointsVisited}
                  </strong>
                  <div className="tour-progress-track">
                    <i style={{ width: `${tourProgress}%` }} />
                  </div>
                </div>

                <div className="tour-badges" aria-label={tourCopy.badges}>
                  {tourBadges.map((badge) => {
                    const Icon = badge.icon;

                    return (
                      <article
                        className={badge.unlocked ? "unlocked" : ""}
                        key={badge.id}
                      >
                        <Icon />
                        <span>{badge.label}</span>
                        <small>{badge.unlocked ? tourCopy.visited : tourCopy.badgeLocked}</small>
                      </article>
                    );
                  })}
                </div>

                {activeTourPlace && (
                  <div className="tour-current-card">
                    {renderImage(activeTourPlace)}
                    <span>
                      <small>{tourCopy.currentPoint}</small>
                      <strong>{activeTourPlace.name}</strong>
                      <em>{activeTourPlace.shortDescription}</em>
                    </span>
                    <div className="tour-current-actions">
                      <button
                        className={visitedIds.includes(activeTourPlace.id) ? "is-done" : ""}
                        onClick={() => markPlaceVisited(activeTourPlace.id)}
                        type="button"
                      >
                        <FaCheckCircle />{" "}
                        {visitedIds.includes(activeTourPlace.id)
                          ? tourCopy.visited
                          : tourCopy.mark}
                      </button>
                      <button onClick={completeTourPoint} type="button">
                        <FaRoute />{" "}
                        {safeTourStepIndex < tourPlaces.length - 1
                          ? tourCopy.next
                          : tourCopy.finish}
                      </button>
                      <button onClick={() => setQuizOpen((open) => !open)} type="button">
                        <FaQuestionCircle /> {tourCopy.quizOpen}
                      </button>
                    </div>
                  </div>
                )}

                {quizOpen && (
                  <div className="tour-quiz">
                    <div>
                      <span className="eyebrow">{tourCopy.quizTitle}</span>
                      <h3>{tourCopy.quizLead}</h3>
                      {latestQuizResult && (
                        <p>
                          {tourCopy.quizDone}: {latestQuizResult.score}/
                          {latestQuizResult.total}
                        </p>
                      )}
                    </div>

                    {quizQuestions.map((question, index) => (
                      <fieldset key={question.id}>
                        <legend>
                          {index + 1}. {question.question}
                        </legend>
                        <div className="quiz-options">
                          {question.options.map((option) => (
                            <button
                              className={
                                quizAnswers[question.id] === option ? "active" : ""
                              }
                              key={option}
                              onClick={() =>
                                setQuizAnswers((answers) => ({
                                  ...answers,
                                  [question.id]: option,
                                }))
                              }
                              type="button"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    ))}

                    <div className="quiz-footer">
                      <button onClick={submitQuiz} type="button">
                        <FaCheckCircle /> {tourCopy.quizSubmit}
                      </button>
                      {quizFeedback && <strong>{quizFeedback}</strong>}
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeView !== "list" && renderMapSection()}
            {hasActiveRoute && (
              <div className="route-panel">
                <div>
                  <span className="eyebrow">{copy.appRoute}</span>
                  <h3>
                    {hasCategoryRoute
                      ? `${copy.trailPrefix}${activeCategoryInfo.label}`
                      : `${copy.goTo}${routeTarget?.name}`}
                  </h3>
                  <p>
                    {routeStatus}.{" "}
                    <strong>
                      {!onlineMode
                        ? `${formatDistance(fallbackRouteDistance)} - ${formatDuration(fallbackRouteTime)} offline`
                        : routeSummary
                          ? `${formatDistance(routeSummary.distance)} - ${formatDuration(routeSummary.time)} - ${copy.transport[transportMode]}`
                          : `${copy.about} ${formatDistance(fallbackRouteDistance)}`}
                    </strong>
                    .
                  </p>
                </div>

                {hasCategoryRoute ? (
                  <ol>
                    {categoryRoutePlaces.map((place) => (
                      <li key={place.id}>{place.name}</li>
                    ))}
                  </ol>
                ) : (
                  <ol>
                    <li>{copy.routeInstruction1}</li>
                    <li>{copy.routeInstruction2}</li>
                    <li>{copy.routeInstruction3}</li>
                  </ol>
                )}

                <div className="route-actions">
                  <button
                    className="small-button"
                    onClick={requestCurrentLocation}
                    type="button"
                  >
                    {copy.useMyLocation}
                  </button>
                  <button
                    className="small-button save-route-button"
                    onClick={saveCurrentRoute}
                    type="button"
                  >
                    <FaSave /> {copy.saveRoute}
                  </button>
                  <button
                    className="small-button"
                    onClick={clearRoute}
                    type="button"
                  >
                    {copy.endRoute}
                  </button>
                </div>
              </div>
            )}

            {activeView !== "walk" ? (
            <div className="list">
              <div className="list-header">
                <h3>{copy.listOfPeople} ({filteredPlaces.length})</h3>
                <input
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={copy.searchList}
                  value={searchQuery}
                />
              </div>

              {filteredPlaces.length === 0 ? (
                <div className="empty-favorites">
                  <FaMapMarkerAlt />
                  <h4>{copy.noResults}</h4>
                  <p>{copy.noResultsText}</p>
                </div>
              ) : (
                filteredPlaces.map((place) => (
                  <div
                    className={`item ${
                      selectedPlace?.id === place.id ? "active" : ""
                    }`}
                    key={place.id}
                    onClick={() => {
                      setSelectedId(place.id);
                      setRouteTargetId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(place.id);
                        setRouteTargetId(null);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {renderImage(place)}
                    <div>
                      <h4>
                        {place.name}{" "}
                        <span
                          className={
                            place.category === "wojskowi" ? "tag blue" : "tag"
                          }
                        >
                          {place.categoryLabel}
                        </span>
                      </h4>
                      <p>{place.years}</p>
                      <p>{place.shortDescription}</p>
                      <p className="distance">
                        {formatDistance(distanceMeters(routeStart, place.position))}
                      </p>
                      {renderPlaceBadges(place)}
                      <div className="item-actions">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openPersonDetails(place.id);
                          }}
                          type="button"
                        >
                          <FaExternalLinkAlt /> {copy.details}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            ) : (
              <div className="walk-route-list">
                <div className="list-header">
                  <h3>{copy.walkPoints} ({currentWalkPlaces.length})</h3>
                  <button
                    className="small-button"
                    onClick={startRecommendedRoute}
                    type="button"
                  >
                    {copy.showRoute}
                  </button>
                </div>

                <div className="walk-route-steps">
                  {currentWalkPlaces.map((place, index) => (
                    <button
                      className={`walk-route-step ${
                        selectedPlace?.id === place.id ? "active" : ""
                      } ${
                        visitedIds.includes(place.id) ? "visited" : ""
                      } ${
                        tourActive && safeTourStepIndex === index ? "tour-current" : ""
                      }`}
                      key={place.id}
                      onClick={() => {
                        if (tourActive) {
                          goToTourStep(index);
                          return;
                        }
                        setSelectedId(place.id);
                        setRouteTargetId(null);
                      }}
                      type="button"
                    >
                      <span>{index + 1}</span>
                      {renderImage(place)}
                      <strong>{place.name}</strong>
                      <small>{place.years}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="details">
        <h3>{copy.placeDetails}</h3>

        <div className="card">
          {selectedPlace ? (
            <>
              {renderImage(selectedPlace)}

              <h2>
                {selectedPlace.name}{" "}
                <span
                  className={
                    selectedPlace.category === "wojskowi" ? "tag blue" : "tag"
                  }
                >
                  {selectedPlace.categoryLabel}
                </span>
              </h2>

              <p className="years">{selectedPlace.years}</p>
              {renderPlaceBadges(selectedPlace)}

              <div className="details-meta">
                <span>
                  <FaClock /> {formatDistance(distanceMeters(cemeteryGate, selectedPlace.position))} {copy.fromGate}
                </span>
                {selectedPlace.tags?.includes("architektura") && (
                  <span>
                    <FaDraftingCompass /> {copy.architectureTrail}
                  </span>
                )}
              </div>

              <div className="timeline">
                <span className="section-label">{copy.timelineEyebrow}</span>
                {selectedTimeline.map((event) => (
                  <div className="timeline-item" key={`${event.year}-${event.title}`}>
                    <strong>{event.year}</strong>
                    <span>
                      <b>{event.title}</b>
                      <small>{event.text}</small>
                    </span>
                  </div>
                ))}
              </div>

              <p className="desc">{selectedPlace.description}</p>

              <p className="source">{copy.source}: {selectedPlace.source}</p>

              <div
                className="rating"
                aria-label={`${copy.rating} ${selectedPlace.rating} / 5`}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <FaStar
                    color={
                      index < selectedPlace.rating ? "#2563eb" : "#d7e4f5"
                    }
                    key={index}
                  />
                ))}
              </div>

              <AudioGuide
                language={appLanguage === "en" ? "en-GB" : "pl-PL"}
                onLanguageChange={(language) => onLanguageChange(language === "en-GB" ? "en" : "pl")}
                place={selectedPlace}
              />


              <button
                className={`visited-action ${
                  visitedIds.includes(selectedPlace.id) ? "active" : ""
                }`}
                onClick={() => markPlaceVisited(selectedPlace.id)}
                type="button"
              >
                <FaCheckCircle />{" "}
                {visitedIds.includes(selectedPlace.id)
                  ? tourCopy.visited
                  : tourCopy.mark}
              </button>
              <button
                className={`fav ${isSelectedFavorite ? "active" : ""}`}
                onClick={() => toggleFavorite(selectedPlace.id)}
                type="button"
              >
                <FaHeart />{" "}
                {isSelectedFavorite
                  ? copy.removeFavorite
                  : copy.addFavorite}
              </button>
              <button className="visited-action" onClick={() => openPersonDetails(selectedPlace.id)} type="button">
                <FaExternalLinkAlt /> {copy.fullPersonPage}
              </button>
              <button className="nav" onClick={handleNavigate} type="button">
                <FaRoute /> {copy.planRoute}
              </button>
              <button className="visited-action" onClick={saveCurrentRoute} type="button">
                <FaSave /> {copy.saveRoute}
              </button>
              {routeTargetId === selectedPlace.id && (
                <div className="route-summary-card">
                  <FaRoute />
                  <span>
                    <strong>
                      {!onlineMode
                        ? `${formatDistance(fallbackRouteDistance)} - ${formatDuration(fallbackRouteTime)} offline`
                        : routeSummary
                        ? `${formatDistance(routeSummary.distance)} - ${formatDuration(routeSummary.time)} - ${copy.transport[transportMode]}`
                        : `${copy.about} ${formatDistance(fallbackRouteDistance)}`}
                    </strong>
                    <small>
                      {onlineMode
                        ? `${copy.bestRoute}: ${copy.transport[transportMode].toLowerCase()}`
                        : copy.localApproxRoute}
                    </small>
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="empty-favorites">
              <FaMapMarkerAlt />
              <h4>{copy.noResults}</h4>
              <p>{copy.noResultsText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Layout;
