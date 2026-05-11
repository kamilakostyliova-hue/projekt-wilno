import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import {
  FaArrowLeft,
  FaBookmark,
  FaCheckCircle,
  FaExpand,
  FaHeart,
  FaMapMarkerAlt,
  FaRoute,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import AudioGuide from "./AudioGuide";
import type { SpeechLanguage } from "./useSpeechSynthesis";
import { buildPersonBiography, getSpeechLanguageKey, personText } from "../i18n/domain";
import "./PersonDetailPage.css";

export type PersonPagePlace = {
  id: number;
  name: string;
  years: string;
  category: string;
  tags?: string[];
  categoryLabel: string;
  position: [number, number];
  image: string;
  gallery?: string[];
  description: string;
  shortDescription: string;
  source: string;
  rating: number;
};

type PersonDetailPageProps = {
  language: SpeechLanguage;
  notesKey: string;
  place: PersonPagePlace;
  relatedPlaces: PersonPagePlace[];
  isFavorite: boolean;
  onBack: () => void;
  onLanguageChange: (language: SpeechLanguage) => void;
  onOpenPerson: (placeId: number) => void;
  onRoute: () => void;
  onSaveRoute: () => void;
  onShowOnMap: () => void;
  onToggleFavorite: () => void;
};

const graveIcon = L.divIcon({
  className: "person-mini-marker-wrap",
  html: '<span class="person-mini-marker"></span>',
  iconAnchor: [8, 22],
  iconSize: [18, 24],
  popupAnchor: [0, -18],
});

function PersonDetailPage({
  language,
  notesKey,
  place,
  relatedPlaces,
  isFavorite,
  onBack,
  onLanguageChange,
  onOpenPerson,
  onRoute,
  onSaveRoute,
  onShowOnMap,
  onToggleFavorite,
}: PersonDetailPageProps) {
  const languageKey = getSpeechLanguageKey(language);
  const copy = personText[languageKey];
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [note, setNote] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(notesKey) ?? ""
  );

  useEffect(() => {
    setNote(typeof window === "undefined" ? "" : window.localStorage.getItem(notesKey) ?? "");
  }, [notesKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(notesKey, note);
    }
  }, [note, notesKey]);

  const gallery = useMemo(() => {
    const images = place.gallery?.length ? place.gallery : [place.image];
    return images.filter(
      (image, index, list): image is string =>
        Boolean(image) && list.indexOf(image) === index
    );
  }, [place.gallery, place.image]);
  const biographySections = useMemo(() => buildPersonBiography(place, languageKey), [place, languageKey]);

  return (
    <main className="person-page">
      <section className="person-hero person-hero-side-photo">
        <div className="person-hero-content">
          <button className="person-back" onClick={onBack} type="button">
            <FaArrowLeft /> {copy.back}
          </button>
          <span className="eyebrow">{copy.details}</span>
          <h1>{place.name}</h1>
          <p>{place.years}</p>
          <div className="person-hero-badges">
            <span>{place.categoryLabel}</span>
            {isFavorite && <span><FaHeart /> {copy.favorite}</span>}
          </div>
        </div>
        <figure className="person-hero-photo">
          <img alt={place.name} src={place.image} />
        </figure>
      </section>

      <section className="person-actions" aria-label={copy.actions}>
        <button className={isFavorite ? "active" : ""} onClick={onToggleFavorite} type="button">
          <FaHeart /> {isFavorite ? copy.removeFavorite : copy.addFavorite}
        </button>
        <button onClick={onRoute} type="button">
          <FaRoute /> {copy.route}
        </button>
        <button onClick={onSaveRoute} type="button">
          <FaSave /> {copy.saveRoute}
        </button>
      </section>

      <section className="person-grid">
        <article className="person-panel person-bio">
          <span className="eyebrow">{copy.bioEyebrow}</span>
          <h2>{copy.bioTitle}</h2>
          {biographySections.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="person-facts">
            <span><strong>{copy.period}</strong>{place.years}</span>
            <span><strong>{copy.category}</strong>{place.categoryLabel}</span>
            <span><strong>{copy.source}</strong>{place.source}</span>
          </div>
        </article>

        <article className="person-panel person-audio">
          <AudioGuide language={language} onLanguageChange={onLanguageChange} place={place} showLanguageSwitch={false} />
          <div className="person-audio-context" aria-label="Informacje o przewodniku audio">
            <span>
              <FaCheckCircle />
              <strong>{copy.calmNarration}</strong>
              <small>{copy.calmNarrationText}</small>
            </span>
            <span>
              <FaRoute />
              <strong>{copy.routeAudio}</strong>
              <small>{copy.routeAudioText}</small>
            </span>
            <span>
              <FaBookmark />
              <strong>{copy.appLanguage}</strong>
              <small>{copy.appLanguageText.replace("{{language}}", language === "en-GB" ? "English" : "Polski")}</small>
            </span>
          </div>
        </article>
      </section>

      <section className="person-panel person-gallery">
        <div>
          <span className="eyebrow">{copy.gallery}</span>
          <h2>{copy.visualMaterials}</h2>
        </div>
        <div className="person-gallery-grid">
          {gallery.map((image, index) => (
            <button key={image + index} onClick={() => setLightboxImage(image)} type="button">
              <img alt={place.name} src={image} />
              <span><FaExpand /> {copy.open}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="person-grid">
        <article className="person-panel person-map">
          <div>
            <span className="eyebrow">{copy.graveLocation}</span>
            <h2>{copy.miniMap}</h2>
          </div>
          <div className="person-mini-map">
            <MapContainer center={place.position} zoom={18} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                subdomains="abcd"
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <Marker icon={graveIcon} position={place.position}>
                <Popup>{place.name}</Popup>
              </Marker>
            </MapContainer>
          </div>
          <div className="person-map-actions">
            <button onClick={onShowOnMap} type="button"><FaMapMarkerAlt /> {copy.showOnMap}</button>
            <button onClick={onRoute} type="button"><FaRoute /> {copy.route}</button>
          </div>
        </article>

        <article className="person-panel person-notes">
          <span className="eyebrow">{copy.privateNotes}</span>
          <h2>{copy.userComments}</h2>
          <textarea
            onChange={(event) => setNote(event.target.value)}
            placeholder={copy.notePlaceholder}
            value={note}
          />
        </article>
      </section>

      <section className="person-panel related-people">
        <div>
          <span className="eyebrow">{copy.relatedEyebrow}</span>
          <h2>{copy.relatedTitle}</h2>
        </div>
        <div className="related-slider">
          {relatedPlaces.map((related) => (
            <button key={related.id} onClick={() => onOpenPerson(related.id)} type="button">
              <img alt={related.name} src={related.image} />
              <span>
                <strong>{related.name}</strong>
                <small>{related.years}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {lightboxImage && (
        <div className="person-lightbox" role="dialog" aria-modal="true">
          <button aria-label={copy.closeGallery} onClick={() => setLightboxImage(null)} type="button">
            <FaTimes />
          </button>
          <img alt={place.name} src={lightboxImage} />
        </div>
      )}
    </main>
  );
}

export default PersonDetailPage;
