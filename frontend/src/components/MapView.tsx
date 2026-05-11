import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import {
  FaBicycle,
  FaCompass,
  FaCompress,
  FaExpand,
  FaHeart,
  FaCar,
  FaInfoCircle,
  FaLocationArrow,
  FaMapMarkerAlt,
  FaPlay,
  FaRoute,
  FaStop,
  FaWalking,
} from "react-icons/fa";
import Routing from "./Routing";
import {
  transportModes,
  type LatLngTuple,
  type RouteSummary,
  type TransportModeId,
} from "./routingConfig";
import { type SpeechLanguage, useSpeechSynthesis } from "./useSpeechSynthesis";
import "./MapView.css";

export type MapPlace = {
  id: number;
  name: string;
  years: string;
  categoryLabel: string;
  position: LatLngTuple;
  image: string;
  shortDescription: string;
};

type MapViewProps = {
  audioRoutePlaces: MapPlace[];
  center: LatLngTuple;
  endLabel: string | null;
  fallbackDistance: number;
  fallbackTime: number;
  getImageFallback: (name: string) => string;
  hasActiveRoute: boolean;
  favoriteIds: number[];
  onlineMode: boolean;
  places: MapPlace[];
  routeStatus: string;
  routeSummary: RouteSummary | null;
  routeWaypoints: LatLngTuple[];
  selectedPlaceId: number | null;
  startLabel: string;
  transportMode: TransportModeId;
  userLocation: LatLngTuple | null;
  onNavigate: () => void;
  onRouteError: () => void;
  onRouteFound: (summary: RouteSummary) => void;
  onShowDetails: (placeId: number) => void;
  onSelectPlace: (placeId: number) => void;
  onToggleFavorite: (placeId: number) => void;
  onStartWalk: () => void;
  onTransportModeChange: (mode: TransportModeId) => void;
  onUseLocation: () => void;
};

const modeIcons = {
  walk: FaWalking,
  bike: FaBicycle,
  car: FaCar,
} satisfies Record<TransportModeId, typeof FaWalking>;

const formatDistance = (meters: number) =>
  meters >= 1000 ? (meters / 1000).toFixed(1) + " km" : meters + " m";

const formatDuration = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return minutes + " min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? hours + " h " + rest + " min" : hours + " h";
};

const buildAudioInstructions = ({
  distance,
  duration,
  endLabel,
  language,
  places,
  startLabel,
  text,
  transportLabel,
}: {
  distance: number;
  duration: number;
  endLabel: string | null;
  language: SpeechLanguage;
  places: MapPlace[];
  startLabel: string;
  text: Record<string, string>;
  transportLabel: string;
}) => {
  const target = places[0]?.name ?? endLabel ?? text.selectedPoint;
  const opening =
    language === "en-GB"
      ? text.audioIntro + " Start: " + startLabel + ". Mode: " + transportLabel + ". Target: " + target + ". Distance about " + formatDistance(distance) + ", around " + formatDuration(duration) + "."
      : text.audioIntro + " Start: " + startLabel + ". Tryb: " + transportLabel + ". Cel: " + target + ". Trasa ma około " + formatDistance(distance) + " i zajmie około " + formatDuration(duration) + ".";

  const pointInstructions = places.map((place, index) => {
    const direction = index % 3 === 0 ? text.audioFirstStep : index % 3 === 1 ? text.audioLeft : text.audioRight;
    return direction + " " + text.audioNext + ": " + place.name + ". " + place.shortDescription + ". " + text.audioArrived + ".";
  });

  return [opening, ...pointInstructions].join(" ");
};

const markerIcon = (isSelected: boolean, status: "favorite" | "default") =>
  L.divIcon({
    className: "custom-marker-wrapper",
    html:
      '<span class="custom-marker ' +
      (isSelected ? "selected " : "") +
      status +
      '"><span></span></span>',
    iconAnchor: [9, 20],
    iconSize: [18, 22],
    popupAnchor: [0, -18],
  });

const userLocationIcon = L.divIcon({
  className: "user-location-wrapper",
  html: '<span class="user-location-marker"><span></span></span>',
  iconAnchor: [15, 15],
  iconSize: [30, 30],
});

function MapView({
  audioRoutePlaces,
  center,
  endLabel,
  fallbackDistance,
  fallbackTime,
  getImageFallback,
  hasActiveRoute,
  favoriteIds,
  onlineMode,
  onNavigate,
  onRouteError,
  onRouteFound,
  onShowDetails,
  onSelectPlace,
  onToggleFavorite,
  onStartWalk,
  onTransportModeChange,
  onUseLocation,
  places,
  routeStatus,
  routeSummary,
  routeWaypoints,
  selectedPlaceId,
  startLabel,
  transportMode,
  userLocation,
}: MapViewProps) {
  const { i18n, t } = useTranslation();
  const modeConfig = transportModes[transportMode];
  const ActiveModeIcon = modeIcons[transportMode];
  const activeDistance = routeSummary?.distance ?? fallbackDistance;
  const activeTime = routeSummary?.time ?? fallbackTime;
  const hasRoute = routeWaypoints.length > 1;
  const audioLanguage: SpeechLanguage = i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "pl-PL";
  const speech = useSpeechSynthesis();
  const audioActive = speech.status !== "idle";
  const audioSupported = speech.supported;
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getMarkerStatus = (placeId: number): "favorite" | "default" => {
    if (favoriteIds.includes(placeId)) return "favorite";
    return "default";
  };

  const mapKey = useMemo(
    () =>
      (selectedPlaceId ?? "empty") +
      "-" +
      transportMode +
      "-" +
      hasRoute +
      "-" +
      (userLocation?.join(",") ?? "gate"),
    [hasRoute, selectedPlaceId, transportMode, userLocation]
  );

  const toggleAudioWalk = () => {
    const audioCopy = {
      audioArrived: t("map.audioArrived"),
      audioFirstStep: t("map.audioFirstStep"),
      audioIntro: t("map.audioIntro"),
      audioLeft: t("map.audioLeft"),
      audioNext: t("map.audioNext"),
      audioRight: t("map.audioRight"),
      selectedPoint: t("map.selectedPoint"),
    };

    if (audioActive) {
      speech.stop();
      return;
    }

    if (!hasActiveRoute) {
      onNavigate();
    }

    speech.speak(
      buildAudioInstructions({
        distance: activeDistance,
        duration: activeTime,
        endLabel,
        language: audioLanguage,
        places: audioRoutePlaces,
        startLabel,
        text: audioCopy,
        transportLabel: t(`transport.${transportMode}`),
      }),
      audioLanguage,
      {
        label: t("map.audioTitle"),
        rate: 0.9,
        pitch: 1.02,
      }
    );
  };

  return (
    <section className={"map premium-map " + (isFullscreen ? "is-fullscreen" : "")} aria-label={t("map.aria")}>
      <div className="map-premium-head">
        <div>
          <span className="eyebrow">{t("map.premium")}</span>
          <h3>{t("map.title")}</h3>
        </div>

        <div className="transport-switcher" aria-label={t("map.transportAria")}>
          {(Object.keys(transportModes) as TransportModeId[]).map((mode) => {
            const Icon = modeIcons[mode];

            return (
              <button
                className={transportMode === mode ? "active" : ""}
                key={mode}
                onClick={() => onTransportModeChange(mode)}
                type="button"
              >
                <Icon />
                {t(`transport.${mode}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="map-premium-actions">
        <button onClick={onStartWalk} type="button">
          <FaWalking /> {t("map.startWalk")}
        </button>
        <button onClick={onNavigate} type="button">
          <FaRoute /> {t("map.route")}
        </button>
        <button onClick={onUseLocation} type="button">
          <FaLocationArrow /> {t("map.myLocation")}
        </button>
        <button onClick={() => setIsFullscreen((current) => !current)} type="button">
          {isFullscreen ? <FaCompress /> : <FaExpand />} {isFullscreen ? t("map.exitFullscreen") : t("map.fullscreen")}
        </button>
      </div>

      <div className="map-canvas">
        <MapContainer
          center={center}
          key={mapKey}
          maxZoom={20}
          zoom={17}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {onlineMode && hasRoute && (
            <Routing
              mode={transportMode}
              onRouteError={onRouteError}
              onRouteFound={onRouteFound}
              waypoints={routeWaypoints}
            />
          )}

          {userLocation && (
            <Marker icon={userLocationIcon} position={userLocation}>
              <Popup className="premium-popup">
                <div className="location-tooltip">
                  <strong>{t("map.yourLocation")}</strong>
                  <small>{t("map.routeStart")}</small>
                </div>
              </Popup>
            </Marker>
          )}

          {places.map((place) => (
            <Marker
              eventHandlers={{
                click: () => onSelectPlace(place.id),
                mouseout: (event) => {
                  (event.target as L.Marker).closePopup();
                },
                mouseover: (event) => {
                  (event.target as L.Marker).openPopup();
                },
              }}
              icon={markerIcon(place.id === selectedPlaceId, getMarkerStatus(place.id))}
              key={place.id}
              position={place.position}
            >
              <Popup className="premium-popup">
                <div className="marker-tooltip-card">
                  <img
                    alt={place.name}
                    onError={(event) => {
                      event.currentTarget.src = getImageFallback(place.name);
                    }}
                    src={place.image}
                  />
                  <span>
                    <strong>{place.name}</strong>
                    <small>{place.years}</small>
                    <em>{place.categoryLabel}</em>
                    <p>{place.shortDescription}</p>
                    <div className="tooltip-status-row">
                      {favoriteIds.includes(place.id) && <b className="favorite"><FaHeart /> {t("map.favorite")}</b>}
                    </div>
                    <div className="tooltip-actions">
                      <button onClick={() => onShowDetails(place.id)} type="button"><FaInfoCircle /> {t("map.details")}</button>
                      <button onClick={() => onToggleFavorite(place.id)} type="button"><FaHeart /></button>
                    </div>
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="map-legend" aria-label={t("map.legend")}>
          <span>
            <i className="legend-dot" /> {t("map.place")}
          </span>
          <span>
            <i className="legend-dot selected" /> {t("map.selected")}
          </span>
          <span>
            <i className="legend-line" style={{ borderColor: modeConfig.color }} /> {t("map.routeLine")}
          </span>
          {userLocation && (
            <span>
              <i className="legend-user" /> {t("map.you")}
            </span>
          )}
        </div>

        <div className="map-compass" aria-label={t("map.compass")}>
          <FaCompass />
          <strong>N</strong>
        </div>

        <div className={"map-audio-panel " + (audioActive ? "active" : "")}>
          <span>{t("map.audioTitle")}</span>
          <button disabled={!audioSupported} onClick={toggleAudioWalk} type="button">
            {audioActive ? <FaStop /> : <FaPlay />}
            {audioActive ? t("map.stopAudioWalk") : t("map.startAudioWalk")}
          </button>
        </div>
      </div>

      <div className="route-info-card">
        <div>
          <FaMapMarkerAlt />
          <span>
            <small>{t("map.start")}</small>
            <strong>{startLabel}</strong>
          </span>
        </div>
        <div>
          <FaRoute />
          <span>
            <small>{t("map.destination")}</small>
            <strong>{endLabel ?? t("map.choosePlace")}</strong>
          </span>
        </div>
        <div>
          <ActiveModeIcon />
          <span>
            <small>{t("map.mode")}</small>
            <strong>{t(`transport.${transportMode}`)}</strong>
          </span>
        </div>
        <div>
          <small>{t("map.distance")}</small>
          <strong>{hasRoute ? formatDistance(activeDistance) : "—"}</strong>
        </div>
        <div>
          <small>{t("map.time")}</small>
          <strong>{hasRoute ? formatDuration(activeTime) : "—"}</strong>
        </div>
        <p>{hasActiveRoute ? routeStatus : t("map.chooseAndRoute")}</p>
      </div>
    </section>
  );
}

export default MapView;
