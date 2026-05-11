# Na Rossie

Aplikacja turystyczno-historyczna dla Cmentarza Na Rossie w Wilnie. Projekt składa się z frontendu React + TypeScript oraz backendu FastAPI z trwałą bazą SQLite.

## Zakres

- Lista 10+ wybranych osób historycznych.
- Karty osób z opisem historycznym, źródłami i lokalizacją grobu.
- Mapa OpenStreetMap/Leaflet z markerami grobów.
- Geolokalizacja użytkownika i przybliżona nawigacja do grobu.
- Tryb offline: service worker, lokalna paczka danych i fallback kafelków/obrazów.
- Backend waliduje dane i przygotowuje paczkę /api/offline-bundle.
- Testy automatyczne dla wymagań projektowych.

## Architektura

Frontend:

- frontend/src - aplikacja React + TypeScript.
- frontend/public/sw.js - service worker dla trybu offline.
- frontend/public/manifest.webmanifest - manifest PWA.

Backend:

- backend/main.py - FastAPI i endpointy REST.
- backend/database.py - logika bazy, walidacja, odległość i paczka offline.
- backend/seed_data.py - demonstracyjne dane osób i grobów.
- backend/rossa.sqlite3 - tworzona automatycznie trwała baza SQLite.
- backend/tests - testy automatyczne.

SQLite zostało użyte zamiast PostgreSQL/PostGIS, bo projekt demonstracyjny działa lokalnie na jednym komputerze i nie wymaga instalacji serwera bazy. Dane lokalizacyjne są przechowywane jako latitude i longitude, a obliczanie odległości wykonuje backend.

## Model danych

PERSON: id, full_name, birth_year, death_year, description, sources.

GRAVE: id, person_id, latitude, longitude, sector.

POI: id, name, latitude, longitude, type.

## Endpointy API

- GET /health
- GET /api/persons
- GET /api/persons/top
- GET /api/persons/{person_id}
- POST /api/persons
- GET /api/graves
- GET /api/navigation/distance?person_id=1&from_lat=54.66842&from_lng=25.30236
- GET /api/offline-bundle
- GET /api/messages

## Uruchomienie

Backend:

cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload

Frontend:

cd frontend
npm install
npm run dev

Domyślnie frontend ma proxy /api do http://127.0.0.1:8000.

## Tryb offline

Frontend rejestruje public/sw.js. Service worker cache'uje shell aplikacji, obrazy i odwiedzone kafelki OpenStreetMap. Backend wystawia /api/offline-bundle, czyli paczkę osób, grobów, POI, komunikatów błędów i opisu strategii mapy offline. Frontend zapisuje tę paczkę w localStorage pod kluczem rossa-backend-offline-bundle, żeby dane Top 10/11 były dostępne także bez internetu.

## Testy

python -m unittest discover -s backend/tests

Testy obejmują:

- działanie bez GPS przez czytelne komunikaty,
- dostępność listy Top 10/11 offline,
- blokadę zapisu bez współrzędnych,
- obecność źródeł historycznych,
- poprawne liczenie odległości,
- komunikaty błędów i strukturę paczki offline.
