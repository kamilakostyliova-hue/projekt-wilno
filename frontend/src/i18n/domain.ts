import type { AppLanguage } from "../App";
import type { SpeechLanguage } from "../components/useSpeechSynthesis";

export type LanguageKey = "pl" | "en";

type Localized = {
  pl: string;
  en: string;
};

type LocalizedPlace = {
  name?: Localized;
  categoryLabel: Localized;
  description: Localized;
  shortDescription: Localized;
};

export const getLanguageKey = (language: AppLanguage): LanguageKey =>
  language === "en" ? "en" : "pl";

export const getSpeechLanguageKey = (language: SpeechLanguage): LanguageKey =>
  language === "en-GB" ? "en" : "pl";

export const transportText = {
  pl: {
    walk: "Pieszo",
    bike: "Rower",
    car: "Samochód",
  },
  en: {
    walk: "Walking",
    bike: "Bike",
    car: "Car",
  },
} as const;

export const categoryText: Record<string, { label: Localized; description: Localized }> = {
  all: {
    label: { pl: "Wszystkie", en: "All" },
    description: {
      pl: "Pełna lista osób i miejsc pamięci.",
      en: "The full list of people and memorial places.",
    },
  },
  wojskowi: {
    label: { pl: "Wojskowi", en: "Military" },
    description: {
      pl: "Dowódcy, powstańcy i osoby związane z walką o wolność.",
      en: "Commanders, insurgents and people connected with the struggle for freedom.",
    },
  },
  politycy: {
    label: { pl: "Politycy", en: "Public Figures" },
    description: {
      pl: "Działacze państwowi, społecznicy i sygnatariusze.",
      en: "Statesmen, civic activists and signatories.",
    },
  },
  artysci: {
    label: { pl: "Artyści", en: "Artists" },
    description: {
      pl: "Poeci, pisarze, malarze, kompozytorzy i architekci.",
      en: "Poets, writers, painters, composers and architects.",
    },
  },
  architektura: {
    label: { pl: "Architektura", en: "Architecture" },
    description: {
      pl: "Architekci, inżynierowie i miejsca związane z rozwojem Wilna.",
      en: "Architects, engineers and places connected with Vilnius urban history.",
    },
  },
  naukowcy: {
    label: { pl: "Naukowcy", en: "Scholars" },
    description: {
      pl: "Profesorowie, historycy, lekarze i badacze.",
      en: "Professors, historians, physicians and researchers.",
    },
  },
  duchowni: {
    label: { pl: "Duchowni", en: "Clergy" },
    description: {
      pl: "Księża i postacie religijne związane z Wilnem.",
      en: "Clergy and religious figures connected with Vilnius.",
    },
  },
};

export const placeText: Record<number, LocalizedPlace> = {
  1: {
    name: { pl: "Józef Piłsudski", en: "Józef Piłsudski" },
    categoryLabel: { pl: "Wojskowy", en: "Military" },
    description: {
      pl: "Na Rossie znajduje się mauzoleum Matka i Serce Syna, gdzie spoczywa matka Józefa Piłsudskiego oraz serce marszałka. To jedno z najważniejszych miejsc pamięci na cmentarzu.",
      en: "At Rasos Cemetery there is the Mother and Son's Heart mausoleum, where Józef Piłsudski's mother is buried together with the marshal's heart. It is one of the cemetery's most important memorial places.",
    },
    shortDescription: {
      pl: "Symboliczne miejsce związane z sercem marszałka i grobem jego matki.",
      en: "A symbolic place connected with the marshal's heart and his mother's grave.",
    },
  },
  2: {
    name: { pl: "Władysław Syrokomla", en: "Władysław Syrokomla" },
    categoryLabel: { pl: "Artysta", en: "Artist" },
    description: {
      pl: "Poeta i tłumacz związany z Wileńszczyzną. Jego twórczość łączyła tematykę historyczną, ludową i krajobrazową.",
      en: "A poet and translator associated with the Vilnius region. His writing combined historical, folk and landscape themes.",
    },
    shortDescription: {
      pl: "Poeta Wileńszczyzny, autor gawęd i utworów o tematyce historycznej.",
      en: "A poet of the Vilnius region, author of tales and historical works.",
    },
  },
  3: {
    name: { pl: "Joachim Lelewel", en: "Joachim Lelewel" },
    categoryLabel: { pl: "Naukowiec", en: "Scholar" },
    description: {
      pl: "Historyk, profesor Uniwersytetu Wileńskiego i działacz polityczny. Jego grób jest ważnym punktem pamięci akademickiego Wilna.",
      en: "A historian, professor at Vilnius University and political activist. His grave is an important point of memory for academic Vilnius.",
    },
    shortDescription: {
      pl: "Historyk, profesor Uniwersytetu Wileńskiego i polityk emigracyjny.",
      en: "Historian, Vilnius University professor and émigré politician.",
    },
  },
  4: {
    name: { pl: "Antoni Wiwulski", en: "Antoni Wiwulski" },
    categoryLabel: { pl: "Artysta", en: "Artist" },
    description: {
      pl: "Architekt i rzeźbiarz związany z Wilnem. Na Rossie upamiętnia go jeden z charakterystycznych nagrobków artystycznej części nekropolii.",
      en: "An architect and sculptor connected with Vilnius. At Rasos he is remembered by one of the distinctive graves in the artistic part of the necropolis.",
    },
    shortDescription: {
      pl: "Architekt i rzeźbiarz związany z Wilnem.",
      en: "Architect and sculptor connected with Vilnius.",
    },
  },
  5: {
    name: { pl: "Jonas Basanavičius", en: "Jonas Basanavičius" },
    categoryLabel: { pl: "Polityk", en: "Public Figure" },
    description: {
      pl: "Lekarz, działacz narodowy i sygnatariusz Aktu Niepodległości Litwy. Jego miejsce pochówku pokazuje wielokulturowy charakter Rossy.",
      en: "A physician, national activist and signatory of Lithuania's Act of Independence. His burial place reflects the multicultural character of Rasos.",
    },
    shortDescription: {
      pl: "Litewski działacz narodowy, lekarz i sygnatariusz niepodległości.",
      en: "Lithuanian national activist, physician and independence signatory.",
    },
  },
  6: {
    name: { pl: "Euzebiusz Słowacki", en: "Euzebiusz Słowacki" },
    categoryLabel: { pl: "Naukowiec", en: "Scholar" },
    description: {
      pl: "Profesor wymowy i poezji Uniwersytetu Wileńskiego oraz ojciec Juliusza Słowackiego. Jego grób przypomina o literackich związkach Wilna.",
      en: "A professor of rhetoric and poetry at Vilnius University and the father of Juliusz Słowacki. His grave recalls Vilnius' literary connections.",
    },
    shortDescription: {
      pl: "Profesor Uniwersytetu Wileńskiego i ojciec Juliusza Słowackiego.",
      en: "Vilnius University professor and father of Juliusz Słowacki.",
    },
  },
  7: {
    name: { pl: "Vladas Mironas", en: "Vladas Mironas" },
    categoryLabel: { pl: "Duchowny", en: "Clergyman" },
    description: {
      pl: "Ksiądz, polityk i sygnatariusz aktu niepodległości Litwy. W aplikacji reprezentuje kategorię duchownych oraz miejsca pamięci symbolicznej.",
      en: "A priest, politician and signatory of Lithuania's Act of Independence. In the app he represents clergy and symbolic places of memory.",
    },
    shortDescription: {
      pl: "Duchowny i polityk, punkt pamięci symbolicznej.",
      en: "Clergyman and politician, a symbolic point of memory.",
    },
  },
  9: {
    name: { pl: "Mikalojus Konstantinas Čiurlionis", en: "Mikalojus Konstantinas Čiurlionis" },
    categoryLabel: { pl: "Artysta", en: "Artist" },
    description: {
      pl: "Kompozytor i malarz, jedna z najważniejszych postaci kultury litewskiej. Jego twórczość łączyła muzykę, malarstwo i symbolizm.",
      en: "A composer and painter, one of the most important figures of Lithuanian culture. His work combined music, painting and symbolism.",
    },
    shortDescription: {
      pl: "Litewski kompozytor i malarz, twórca symbolistyczny.",
      en: "Lithuanian composer, painter and symbolist artist.",
    },
  },
  10: {
    name: { pl: "Balys Sruoga", en: "Balys Sruoga" },
    categoryLabel: { pl: "Artysta", en: "Artist" },
    description: {
      pl: "Pisarz, poeta i badacz teatru. Jego twórczość należy do ważnych świadectw kultury litewskiej pierwszej połowy XX wieku.",
      en: "A writer, poet and theatre scholar. His work is an important witness to Lithuanian culture in the first half of the twentieth century.",
    },
    shortDescription: {
      pl: "Pisarz i teatrolog, ważna postać kultury litewskiej.",
      en: "Writer and theatre scholar, an important figure in Lithuanian culture.",
    },
  },
  11: {
    name: { pl: "Józef Montwiłł", en: "Józef Montwiłł" },
    categoryLabel: { pl: "Polityk", en: "Public Figure" },
    description: {
      pl: "Bankier, społecznik i filantrop zasłużony dla Wilna. Wspierał instytucje dobroczynne oraz projekty miejskie.",
      en: "A banker, civic activist and philanthropist important to Vilnius. He supported charitable institutions and urban projects.",
    },
    shortDescription: {
      pl: "Społecznik i filantrop zasłużony dla Wilna.",
      en: "Civic activist and philanthropist important to Vilnius.",
    },
  },
  12: {
    name: { pl: "Petras Vileišis", en: "Petras Vileišis" },
    categoryLabel: { pl: "Naukowiec", en: "Scholar" },
    description: {
      pl: "Inżynier, wydawca i działacz społeczny. Był jedną z postaci litewskiego odrodzenia narodowego i modernizacji życia publicznego.",
      en: "An engineer, publisher and civic activist. He was one of the figures of the Lithuanian national revival and public modernization.",
    },
    shortDescription: {
      pl: "Inżynier, wydawca i działacz społeczny.",
      en: "Engineer, publisher and civic activist.",
    },
  },
};

export const homeTimelineText: Record<string, Localized> = {
  "1800": { pl: "Epoka Uniwersytetu Wileńskiego", en: "The Age of Vilnius University" },
  "1850": { pl: "Powstania, poezja i uniwersytet", en: "Uprisings, Poetry and the University" },
  "1900": { pl: "Miasto artystów i działaczy", en: "A City of Artists and Activists" },
  "1950": { pl: "Pamięć XX wieku", en: "Memory of the Twentieth Century" },
};

export const timelineEventText = {
  pl: {
    birthFallback: "Początek",
    deathFallback: "Pamięć",
    lifeFallback: "Życie",
    startTitle: "Początek historii",
    startText: "Pierwszy punkt osi czasu tej postaci.",
    activityTitle: "Działalność",
    memoryTitle: "Pamięć na Rossie",
    memoryText: "Miejsce na cmentarzu zachowuje jej historię dla kolejnych odwiedzających.",
    byCategory: {
      wojskowi: "Działalność wojskowa i walka o pamięć regionu.",
      politycy: "Praca społeczna, publiczna i budowanie miejskiej tożsamości.",
      artysci: "Twórczość, która zostawiła ślad w kulturze Wilna i Litwy.",
      architektura: "Projektowanie, fundacje albo miejsca związane z architekturą Rossy.",
      naukowcy: "Praca naukowa, edukacyjna i rozwój życia intelektualnego.",
      duchowni: "Posługa, działalność społeczna i obecność w pamięci Wilna.",
    },
  },
  en: {
    birthFallback: "Beginning",
    deathFallback: "Memory",
    lifeFallback: "Life",
    startTitle: "Beginning of the Story",
    startText: "The first point on this person's timeline.",
    activityTitle: "Work and Influence",
    memoryTitle: "Memory at Rasos",
    memoryText: "The place in the cemetery preserves this story for future visitors.",
    byCategory: {
      wojskowi: "Military activity and the struggle for the region's memory.",
      politycy: "Public work, civic action and building urban identity.",
      artysci: "Creative work that left a mark on the culture of Vilnius and Lithuania.",
      architektura: "Design, foundations and places connected with Rasos architecture.",
      naukowcy: "Scholarly work, education and intellectual life.",
      duchowni: "Service, social activity and presence in Vilnius memory.",
    },
  },
} as const;

export const layoutText = {
  pl: {
    all: "Wszystkie",
    placesWord: ["miejsce", "miejsca", "miejsc"],
    items: "miejsc",
    oneItem: "miejsce",
    routeModeStatus: "Tryb trasy: ",
    routeCategory: "Szlak przez kategorię: ",
    routeOfflineApprox: "Tryb offline: trasa przybliżona lokalnie",
    routeStart: "Start: wejście na cmentarz",
    routeError: "Nie udało się wyznaczyć trasy.",
    routeLocal: "Tryb offline: trasa lokalna",
    noInternet: "Brak połączenia z internetem",
    onlineNavigation: "Online: pełna nawigacja",
    offlineLocalData: "Offline: dane lokalne",
    localModeNoInternet: "Brak internetu: tryb lokalny",
    gate: "Wejście na cmentarz",
    homeEyebrow: "Interaktywny przewodnik po Rossie",
    homeTitle: "Na Rossie w Wilnie",
    homeLead: "Elegancka mapa miejsc pamięci, historii i spokojnych tras. Wybierz osobę, sprawdź szczegóły albo rusz gotowym szlakiem.",
    openMap: "Otwórz mapę",
    architectureTrail: "Szlak architektury",
    catalog: "Katalog postaci",
    statsPlaces: "miejsc",
    statsCategories: "kategorii",
    statsArchitecture: "punktów architektury",
    statsCompletion: "ukończenia",
    cemeteryPhotoAria: "Zdjęcie cmentarza",
    cemeteryAlt: "Cmentarz Na Rossie w Wilnie",
    cemeteryPathAlt: "Alejki Cmentarza Na Rossie",
    cemeteryGravesAlt: "Historyczne nagrobki na Rossie",
    modeOnline: "Tryb online",
    modeOffline: "Tryb offline",
    captionOnline: "Mapa, trasy piesze i przełącznik nocny są gotowe.",
    captionOffline: "Lista i szczegóły zostają dostępne bez internetu.",
    featuresAria: "Najważniejsze funkcje",
    readyTrail: "Gotowy szlak",
    readyTrailTitle: "Architektura Rossy",
    readyTrailDesc: "Trasa przez wszystkie miejsca architektoniczne.",
    order: "Porządek",
    categories: "Kategorie",
    categoriesDesc: "Wojskowi, artyści, naukowcy, duchowni i więcej.",
    memory: "Pamięć",
    favorites: "Ulubione",
    favoritesDesc: "Zapisuj miejsca, do których chcesz wrócić.",
    featuredEyebrow: "Wybrane miejsca",
    featuredTitle: "Najważniejsze punkty na pierwszy spacer",
    timelineAria: "Historyczna oś czasu",
    timelineEyebrow: "Oś czasu",
    timelineTitle: "Historia Rossy w czterech punktach",
    timelineLead: "Kliknij postać na osi czasu, aby przejść do jej miejsca na mapie.",
    timelineFilter: "Filtr epok",
    memoryAria: "Pamięć Rossy",
    memoryQuote: "Nie umiera ten, kto trwa w pamięci żywych.",
    cemeteryName: "Cmentarz Na Rossie",
    projectEyebrow: "Projekt uniwersytecki",
    projectTitle: "Na Rossie jako aplikacja edukacyjna",
    projectLead: "Aplikacja powstała jako projekt uniwersytecki poświęcony Cmentarzowi Na Rossie w Wilnie. Łączy mapę, krótkie biografie, przewodnik audio i planowanie spaceru, żeby pokazać historię miejsca w formie współczesnego narzędzia turystyczno-historycznego.",
    projectGalleryAria: "Zdjęcia Cmentarza Na Rossie",
    projectGoal: "Cel projektu",
    projectGoalText: "Celem było stworzenie czytelnej aplikacji, która pomaga odkrywać ważne postacie, kategorie historyczne i trasy po Rossie. Dane działają lokalnie, a aplikacja pozostaje wygodna na telefonie.",
    aboutRossa: "O Rossie",
    aboutRossaText: "Rossa jest jedną z najważniejszych nekropolii Wilna. To miejsce pamięci wielu kultur, epok i środowisk: artystów, wojskowych, naukowców, duchownych oraz działaczy społecznych.",
    functions: "Funkcje",
    functionsText: "Projekt zawiera mapę, pełne strony postaci, ulubione miejsca, planowane spacery, audio, tryb nocny i przełączanie języka całej aplikacji.",
    categoriesTitle: "Wybierz grupę historyczną",
    categoriesLead: "Ten ekran różni się od mapy: pokazuje kategorie jako osobne karty, liczbę osób w każdej grupie oraz szybki podgląd wybranej kategorii.",
    allPeople: "Wszystkie osoby",
    showTrail: "Pokaż szlak",
    showOnMap: "Pokaż na mapie",
    filters: "Filtry",
    closeFilters: "Zamknij filtry",
    recommendedTrail: "Polecany szlak",
    connectedRoute: "połączone jedną pieszą trasą.",
    inThisCategory: "w tej kategorii.",
    showPlace: "Pokaż miejsce",
    appStatus: "Status aplikacji",
    onlineRoutes: "Trasy prowadzą po drogach, a aplikacja zapisuje dane do pracy awaryjnej.",
    offlineRoutes: "Najważniejsze funkcje zostają dostępne lokalnie: lista, szczegóły i przybliżone szlaki.",
    roadRouting: "Routing po drogach",
    localRoute: "Trasa lokalna",
    networkAvailable: "Sieć dostępna",
    noConnection: "Bez połączenia",
    savedInApp: "Dane zapisane w aplikacji",
    quickFilters: "Szybkie filtry",
    onlyFavorites: "Pokaż tylko ulubione",
    savedPlaces: "zapisanych miejsc",
    nearbyOnly: "Tylko w pobliżu mnie",
    fromStart: "od pozycji startowej",
    statusFilters: "Filtry statusów",
    favoritePlaces: "Ulubione miejsca",
    noFavoritesTitle: "Brak ulubionych miejsc",
    noFavoritesText: "Wybierz osobę z listy albo marker na mapie i kliknij „Dodaj do ulubionych”.",
    details: "Szczegóły",
    removeFavorite: "Usuń z ulubionych",
    workspaceCatalog: "Katalog miejsc",
    workspaceWalk: "Plan spaceru",
    workspaceMap: "Mapa Rossy",
    listTitle: "Lista postaci i miejsc pamięci",
    chooseThemedWalk: "Wybierz spacer tematyczny",
    walkPrefix: "Spacer: ",
    allPlaces: "Wszystkie miejsca",
    walkLead: "Wybierz kategorię, a aplikacja połączy wszystkie punkty jedną pieszą trasą.",
    architectureLead: "Wybrano szlak architektury, więc mapa prowadzi przez wszystkie powiązane punkty.",
    mapLead: "Kliknij marker albo element listy, aby otworzyć elegancki panel szczegółów.",
    selectedTrail: "Wybrany szlak",
    points: "punktów",
    about: "około",
    walkTimeSuffix: "spaceru",
    chooseCategoryWalk: "Wybierz kategorię z kilkoma punktami, aby zbudować spacer.",
    showRoute: "Pokaż trasę",
    singlePoint: "pojedynczy punkt",
    appRoute: "Trasa w aplikacji",
    trailPrefix: "Szlak: ",
    goTo: "Idź do: ",
    routeInstruction1: "Wejdź na teren cmentarza i kieruj się główną alejką.",
    routeInstruction2: "Idź trasą wyznaczoną przez Leaflet Routing Machine.",
    routeInstruction3: "Szukaj wyróżnionego znacznika przy wybranym miejscu.",
    useMyLocation: "Użyj mojej pozycji",
    saveRoute: "Zapisz trasę",
    endRoute: "Zakończ trasę",
    listOfPeople: "Lista postaci",
    searchList: "Wyszukaj w liście...",
    noResults: "Brak wyników",
    noResultsText: "Zmień kategorię, wyszukiwanie albo filtr ulubionych.",
    walkPoints: "Punkty spaceru",
    placeDetails: "Szczegóły miejsca",
    fromGate: "od wejścia",
    source: "Źródło",
    rating: "Ocena",
    addFavorite: "Dodaj do ulubionych",
    fullPersonPage: "Pełna strona postaci",
    planRoute: "Wyznacz trasę",
    bestRoute: "Najlepsza trasa",
    localApproxRoute: "Przybliżona trasa lokalna bez internetu",
    routeTo: "Trasa do: ",
    routeDefaultName: "Trasa Na Rossie",
    startGateStatus: "Start: wejście na cmentarz",
    offlineStartGate: "Tryb offline: start przy wejściu na cmentarz",
    gettingLocation: "Pobieram Twoją pozycję...",
    gettingGps: "Pobieram pozycję GPS...",
    startCurrentPosition: "Start: Twoja aktualna pozycja",
    offlineStartCurrentPosition: "Tryb offline: start z Twojej pozycji",
    gpsUnavailableGate: "GPS niedostępny. Start: wejście na cmentarz",
    gpsUnavailableOffline: "GPS niedostępny. Offline startuje przy wejściu",
    geolocationUnsupported: "Twoja przeglądarka nie obsługuje geolokalizacji.",
    locationFailed: "Nie udało się pobrać pozycji. Zostaje wejście na cmentarz.",
    architectureBadge: "Szlak architektury",
    transport: transportText.pl,
  },
  en: {
    all: "All",
    placesWord: ["place", "places", "places"],
    items: "places",
    oneItem: "place",
    routeModeStatus: "Route mode: ",
    routeCategory: "Trail through category: ",
    routeOfflineApprox: "Offline mode: approximate local route",
    routeStart: "Start: cemetery entrance",
    routeError: "Could not calculate the route.",
    routeLocal: "Offline mode: local route",
    noInternet: "No internet connection",
    onlineNavigation: "Online: full navigation",
    offlineLocalData: "Offline: local data",
    localModeNoInternet: "No internet: local mode",
    gate: "Cemetery entrance",
    homeEyebrow: "Interactive guide to Rasos",
    homeTitle: "Rasos Cemetery in Vilnius",
    homeLead: "An elegant map of memorial places, history and calm walking routes. Choose a person, open details or follow a ready-made trail.",
    openMap: "Open map",
    architectureTrail: "Architecture trail",
    catalog: "People catalog",
    statsPlaces: "places",
    statsCategories: "categories",
    statsArchitecture: "architecture points",
    statsCompletion: "complete",
    cemeteryPhotoAria: "Cemetery photos",
    cemeteryAlt: "Rasos Cemetery in Vilnius",
    cemeteryPathAlt: "Paths at Rasos Cemetery",
    cemeteryGravesAlt: "Historic graves at Rasos",
    modeOnline: "Online mode",
    modeOffline: "Offline mode",
    captionOnline: "Map, walking routes and night mode are ready.",
    captionOffline: "The list and details stay available without internet.",
    featuresAria: "Key features",
    readyTrail: "Ready trail",
    readyTrailTitle: "Rasos Architecture",
    readyTrailDesc: "A route through all architecture-related places.",
    order: "Order",
    categories: "Categories",
    categoriesDesc: "Military figures, artists, scholars, clergy and more.",
    memory: "Memory",
    favorites: "Favorites",
    favoritesDesc: "Save places you want to return to.",
    featuredEyebrow: "Selected places",
    featuredTitle: "Key points for the first walk",
    timelineAria: "Historical timeline",
    timelineEyebrow: "Timeline",
    timelineTitle: "Rasos history in four points",
    timelineLead: "Click a person on the timeline to open their place on the map.",
    timelineFilter: "Period filter",
    memoryAria: "Rasos memory",
    memoryQuote: "Those who live in memory do not die.",
    cemeteryName: "Rasos Cemetery",
    projectEyebrow: "University project",
    projectTitle: "Na Rossie as an educational app",
    projectLead: "The app was created as a university project dedicated to Rasos Cemetery in Vilnius. It combines a map, short biographies, an audio guide and walk planning to present the history of the place as a modern tourist and historical tool.",
    projectGalleryAria: "Rasos Cemetery photos",
    projectGoal: "Project Goal",
    projectGoalText: "The goal was to build a clear application that helps discover important figures, historical categories and routes through Rasos. The data works locally and the interface remains comfortable on mobile.",
    aboutRossa: "About Rasos",
    aboutRossaText: "Rasos is one of the most important necropolises of Vilnius. It is a place of memory for many cultures, eras and communities: artists, military figures, scholars, clergy and civic activists.",
    functions: "Features",
    functionsText: "The project includes a map, full person pages, favorite places, planned walks, audio, night mode and full app language switching.",
    categoriesTitle: "Choose a Historical Group",
    categoriesLead: "This screen differs from the map: it shows categories as separate cards, the number of people in each group and a quick preview of the selected category.",
    allPeople: "All people",
    showTrail: "Show trail",
    showOnMap: "Show on map",
    filters: "Filters",
    closeFilters: "Close filters",
    recommendedTrail: "Recommended trail",
    connectedRoute: "connected by one walking route.",
    inThisCategory: "in this category.",
    showPlace: "Show place",
    appStatus: "App status",
    onlineRoutes: "Routes follow paths and the app saves data for fallback use.",
    offlineRoutes: "Core features remain available locally: list, details and approximate trails.",
    roadRouting: "Path routing",
    localRoute: "Local route",
    networkAvailable: "Network available",
    noConnection: "No connection",
    savedInApp: "Data saved in the app",
    quickFilters: "Quick filters",
    onlyFavorites: "Show only favorites",
    savedPlaces: "saved places",
    nearbyOnly: "Only near me",
    fromStart: "from the start position",
    statusFilters: "Status filters",
    favoritePlaces: "Favorite places",
    noFavoritesTitle: "No favorite places",
    noFavoritesText: "Choose a person from the list or a map marker and click “Add to favorites”.",
    details: "Details",
    removeFavorite: "Remove from favorites",
    workspaceCatalog: "Place catalog",
    workspaceWalk: "Walk plan",
    workspaceMap: "Rasos map",
    listTitle: "People and memorial places",
    chooseThemedWalk: "Choose a themed walk",
    walkPrefix: "Walk: ",
    allPlaces: "All places",
    walkLead: "Choose a category and the app will connect all points into one walking route.",
    architectureLead: "The architecture trail is selected, so the map leads through all related points.",
    mapLead: "Click a marker or list item to open an elegant detail panel.",
    selectedTrail: "Selected trail",
    points: "points",
    about: "about",
    walkTimeSuffix: "walk",
    chooseCategoryWalk: "Choose a category with several points to build a walk.",
    showRoute: "Show route",
    singlePoint: "single point",
    appRoute: "Route in the app",
    trailPrefix: "Trail: ",
    goTo: "Go to: ",
    routeInstruction1: "Enter the cemetery and follow the main path.",
    routeInstruction2: "Follow the route calculated by Leaflet Routing Machine.",
    routeInstruction3: "Look for the highlighted marker at the selected place.",
    useMyLocation: "Use my location",
    saveRoute: "Save route",
    endRoute: "End route",
    listOfPeople: "People list",
    searchList: "Search the list...",
    noResults: "No results",
    noResultsText: "Change category, search or favorite filter.",
    walkPoints: "Walk points",
    placeDetails: "Place details",
    fromGate: "from the entrance",
    source: "Source",
    rating: "Rating",
    addFavorite: "Add to favorites",
    fullPersonPage: "Full person page",
    planRoute: "Plan route",
    bestRoute: "Best route",
    localApproxRoute: "Approximate local route without internet",
    routeTo: "Route to: ",
    routeDefaultName: "Na Rossie route",
    startGateStatus: "Start: cemetery entrance",
    offlineStartGate: "Offline mode: start at the cemetery entrance",
    gettingLocation: "Getting your location...",
    gettingGps: "Getting GPS position...",
    startCurrentPosition: "Start: your current position",
    offlineStartCurrentPosition: "Offline mode: start from your position",
    gpsUnavailableGate: "GPS unavailable. Start: cemetery entrance",
    gpsUnavailableOffline: "GPS unavailable. Offline starts at the entrance",
    geolocationUnsupported: "Your browser does not support geolocation.",
    locationFailed: "Could not get your location. The cemetery entrance remains the start.",
    architectureBadge: "Architecture trail",
    transport: transportText.en,
  },
} as const;

export const personText = {
  pl: {
    back: "Powrót do mapy",
    details: "Szczegóły postaci",
    favorite: "Ulubione",
    addFavorite: "Dodaj do ulubionych",
    removeFavorite: "Usuń z ulubionych",
    route: "Wyznacz trasę",
    saveRoute: "Zapisz trasę",
    actions: "Akcje miejsca",
    bioEyebrow: "Biografia",
    bioTitle: "Historia i znaczenie",
    period: "Okres",
    category: "Kategoria",
    source: "Źródło",
    calmNarration: "Spokojna narracja",
    calmNarrationText: "Wolniejsze tempo i miękki głos dla zwiedzania.",
    routeAudio: "Działa przy trasie",
    routeAudioText: "Możesz wrócić do mapy i prowadzić spacer dalej.",
    appLanguage: "Język aplikacji",
    appLanguageText: "Audio: {{language}}. Zmień język w górnym pasku aplikacji.",
    gallery: "Galeria",
    visualMaterials: "Materiały wizualne",
    open: "Otwórz",
    graveLocation: "Lokalizacja grobu",
    miniMap: "Mini mapa",
    showOnMap: "Pokaż na mapie",
    privateNotes: "Prywatne notatki",
    userComments: "Komentarze użytkownika",
    notePlaceholder: "Zapisz własną notatkę o tym miejscu...",
    relatedEyebrow: "Powiązane postacie",
    relatedTitle: "Ta sama epoka lub kategoria",
    closeGallery: "Zamknij galerię",
  },
  en: {
    back: "Back to map",
    details: "Person details",
    favorite: "Favorite",
    addFavorite: "Add to favorites",
    removeFavorite: "Remove from favorites",
    route: "Plan route",
    saveRoute: "Save route",
    actions: "Place actions",
    bioEyebrow: "Biography",
    bioTitle: "History and Significance",
    period: "Period",
    category: "Category",
    source: "Source",
    calmNarration: "Calm narration",
    calmNarrationText: "A slower pace and softer voice for visiting.",
    routeAudio: "Works with route",
    routeAudioText: "You can return to the map and continue the walk.",
    appLanguage: "App language",
    appLanguageText: "Audio: {{language}}. Change the language in the top bar.",
    gallery: "Gallery",
    visualMaterials: "Visual Materials",
    open: "Open",
    graveLocation: "Grave location",
    miniMap: "Mini map",
    showOnMap: "Show on map",
    privateNotes: "Private notes",
    userComments: "User comments",
    notePlaceholder: "Save your own note about this place...",
    relatedEyebrow: "Related people",
    relatedTitle: "Same era or category",
    closeGallery: "Close gallery",
  },
} as const;

export const personNarratives = {
  pl: {
    architektura: "Wątek architektoniczny pokazuje, jak Wilno budowało swoją pamięć przez formę, detal i miejską wyobraźnię.",
    artysci: "Wątek artystyczny prowadzi przez twórczość, która zostawiła po sobie nie tylko dzieła, ale także sposób patrzenia na miasto.",
    duchowni: "Wątek duchowy przypomina o osobach, które łączyły codzienną posługę z odpowiedzialnością za wspólnotę.",
    naukowcy: "Wątek naukowy opowiada o edukacji, badaniu przeszłości i intelektualnym życiu dawnego Wilna.",
    politycy: "Wątek publiczny pokazuje ludzi instytucji, decyzji i pracy społecznej, bez których historia miasta byłaby niepełna.",
    wojskowi: "Wątek wojskowy prowadzi przez pamięć walki, służby i symboli, które na Rossie mają szczególnie mocny ciężar.",
  },
  en: {
    architektura: "The architectural thread shows how Vilnius built its memory through form, detail and urban imagination.",
    artysci: "The artistic thread follows creative work that left not only works of art, but also a way of looking at the city.",
    duchowni: "The spiritual thread recalls people who combined daily service with responsibility for the community.",
    naukowcy: "The scholarly thread tells about education, research into the past and the intellectual life of old Vilnius.",
    politycy: "The public thread shows people of institutions, decisions and civic work, without whom the city's history would be incomplete.",
    wojskowi: "The military thread leads through memory of struggle, service and symbols that carry special weight at Rasos.",
  },
} as const;

export const personBiographyText = {
  pl: {
    intro: (name: string, years: string) =>
      name + " to jeden z punktów Rossy, przy którym warto zatrzymać się dłużej niż na krótką notkę z mapy. Lata " + years + " porządkują biografię, ale pełniejsza opowieść zaczyna się dopiero wtedy, gdy połączymy życiorys z miejscem pamięci i krajobrazem cmentarza.",
    museum: (description: string) =>
      "Na tej stronie opis jest spokojniejszy i bardziej muzealny: prowadzi przez znaczenie postaci, kontekst Wilna oraz powód, dla którego ten grób lub miejsce pamięci naturalnie trafia na trasę spaceru. " + description,
    visit:
      "Podczas zwiedzania potraktuj ten punkt jako osobny przystanek. Zwróć uwagę na otoczenie, bliskość alejek i relację z innymi postaciami z tej samej epoki albo kategorii.",
  },
  en: {
    intro: (name: string, years: string) =>
      name + " is one of the Rasos points where it is worth pausing longer than a short map note allows. The years " + years + " frame the biography, but the fuller story begins when the life, the place of memory and the cemetery landscape are read together.",
    museum: (description: string) =>
      "This page gives a calmer, more museum-like account: it explains the person's significance, the Vilnius context and why this grave or memorial point naturally belongs on the walking route. " + description,
    visit:
      "During the visit, treat this point as a separate stop. Notice the surroundings, the nearby paths and the relationship with other people from the same era or category.",
  },
} as const;

export const profileText = {
  pl: {
    guestName: "Gość Rossy",
    favoriteCounter: "ulubionych miejsc",
    quotes: [
      "Pamięć jest mapą, po której wracamy do ludzi i miejsc.",
      "Historia miasta najciszej mówi tam, gdzie zatrzymuje się krok.",
      "Każdy punkt na Rossie jest osobną opowieścią Wilna.",
    ],
    achievements: {
      collector: "Kolekcjoner pamięci",
      planner: "Planer spacerów",
    },
    myPlaces: "Moje miejsca",
    all: "Wszystkie",
    favorites: "Ulubione",
    emptyMyPlaces: "Nie ma jeszcze miejsc w tej sekcji.",
    favoriteBadge: "Ulubione",
    plannerTitle: "Planer spacerów",
    date: "Data",
    time: "Godzina",
    walkType: "Typ spaceru",
    historic: "Historyczny",
    architecture: "Architektura",
    quickWalk: "Szybki spacer",
    fullRoute: "Pełna trasa",
    notes: "Notatki",
    reminder: "Przypomnienie",
    saveWalk: "Zapisz spacer",
    walkSaved: "Spacer zapisany w planerze.",
    reminderMessage: (type: string, time: string) => "Przypomnienie: spacer " + type + " o " + time,
    noNotes: "Bez notatek",
  },
  en: {
    guestName: "Rasos Guest",
    favoriteCounter: "favorite places",
    quotes: [
      "Memory is a map by which we return to people and places.",
      "A city's history speaks most quietly where a step comes to rest.",
      "Every point at Rasos is a separate story of Vilnius.",
    ],
    achievements: {
      collector: "Memory Collector",
      planner: "Walk Planner",
    },
    myPlaces: "My places",
    all: "All",
    favorites: "Favorites",
    emptyMyPlaces: "There are no places in this section yet.",
    favoriteBadge: "Favorite",
    plannerTitle: "Walk planner",
    date: "Date",
    time: "Time",
    walkType: "Walk type",
    historic: "Historical",
    architecture: "Architecture",
    quickWalk: "Quick walk",
    fullRoute: "Full route",
    notes: "Notes",
    reminder: "Reminder",
    saveWalk: "Save walk",
    walkSaved: "Walk saved in the planner.",
    reminderMessage: (type: string, time: string) => "Reminder: " + type + " walk at " + time,
    noNotes: "No notes",
  },
} as const;


export function localizeCategory<T extends { id: string; label: string; description: string }>(
  category: T,
  language: LanguageKey
): T {
  const content = categoryText[category.id];
  if (!content) return category;
  return {
    ...category,
    label: content.label[language],
    description: content.description[language],
  };
}

export function localizePlace<T extends {
  id: number;
  name: string;
  categoryLabel: string;
  description: string;
  shortDescription: string;
}>(
  place: T,
  language: LanguageKey
): T {
  const content = placeText[place.id];
  if (!content) return place;
  return {
    ...place,
    name: content.name?.[language] ?? place.name,
    categoryLabel: content.categoryLabel[language],
    description: content.description[language],
    shortDescription: content.shortDescription[language],
  };
}

export function localizeTimelinePeriod<T extends { year: string; title: string }>(
  period: T,
  language: LanguageKey
): T {
  const title = homeTimelineText[period.year]?.[language];
  return title ? { ...period, title } : period;
}

export function buildPersonBiography<T extends {
  name: string;
  years: string;
  category: string;
  categoryLabel: string;
  description: string;
}>(
  place: T,
  language: LanguageKey
) {
  const categoryText =
    personNarratives[language][place.category as keyof typeof personNarratives.pl] ??
    personNarratives[language].politycy;
  const text = personBiographyText[language];

  return [
    text.intro(place.name, place.years),
    categoryText,
    text.museum(place.description),
    text.visit,
  ];
}
