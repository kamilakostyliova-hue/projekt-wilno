from __future__ import annotations

import json
import math
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from .seed_data import DEMO_PERSONS
except ImportError:  # pragma: no cover - supports running main.py directly
    from seed_data import DEMO_PERSONS


DATABASE_PATH = Path(__file__).with_name("rossa.sqlite3")

ERROR_MESSAGES = {
    "gps_unavailable": "Brak GPS: nie można odczytać aktualnej pozycji użytkownika.",
    "gps_low_accuracy": "Niska dokładność GPS: pozycja może być przybliżona.",
    "offline": "Brak internetu: używane są lokalne dane Top 10/11 i przybliżona nawigacja.",
    "missing_coordinates": "Brak współrzędnych grobu: obiekt nie może zostać zapisany.",
}


def connect(database_path: Path | str = DATABASE_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(database_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def connection(database_path: Path | str = DATABASE_PATH):
    conn = connect(database_path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def initialize_database(database_path: Path | str = DATABASE_PATH, force: bool = False) -> None:
    path = Path(database_path)
    if force and path.exists():
        path.unlink()

    with connection(path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS persons (
                id INTEGER PRIMARY KEY,
                full_name TEXT NOT NULL UNIQUE,
                birth_year INTEGER NOT NULL,
                death_year INTEGER NOT NULL,
                description TEXT NOT NULL,
                sources TEXT NOT NULL,
                display_order INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS graves (
                id INTEGER PRIMARY KEY,
                person_id INTEGER NOT NULL UNIQUE,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                sector TEXT NOT NULL,
                FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS poi (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                type TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )

        count = conn.execute("SELECT COUNT(*) FROM persons").fetchone()[0]
        if count == 0:
            seed_database(conn)


def seed_database(conn: sqlite3.Connection) -> None:
    for index, item in enumerate(DEMO_PERSONS, start=1):
        conn.execute(
            """
            INSERT INTO persons
                (id, full_name, birth_year, death_year, description, sources, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["full_name"],
                item["birth_year"],
                item["death_year"],
                item["description"],
                json.dumps(item["sources"], ensure_ascii=False),
                index,
            ),
        )
        grave = item["grave"]
        conn.execute(
            """
            INSERT INTO graves (id, person_id, latitude, longitude, sector)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                grave["id"],
                item["id"],
                grave["latitude"],
                grave["longitude"],
                grave["sector"],
            ),
        )

    conn.execute(
        """
        INSERT INTO poi (id, name, latitude, longitude, type)
        VALUES (1, 'Wejście na Cmentarz Na Rossie', 54.66842, 25.30236, 'entrance')
        """
    )


def _person_from_row(row: sqlite3.Row, grave: sqlite3.Row | None = None) -> dict[str, Any]:
    payload = {
        "id": row["id"],
        "full_name": row["full_name"],
        "birth_year": row["birth_year"],
        "death_year": row["death_year"],
        "description": row["description"],
        "sources": json.loads(row["sources"]),
    }
    if grave is not None:
        payload["grave"] = {
            "id": grave["id"],
            "person_id": grave["person_id"],
            "latitude": grave["latitude"],
            "longitude": grave["longitude"],
            "sector": grave["sector"],
        }
    return payload


def list_persons(query: str | None = None, limit: int | None = None, database_path: Path | str = DATABASE_PATH) -> list[dict[str, Any]]:
    initialize_database(database_path)
    params: list[Any] = []
    sql = "SELECT * FROM persons"
    if query:
        sql += " WHERE lower(full_name) LIKE ?"
        params.append(f"%{query.lower()}%")
    sql += " ORDER BY display_order"
    if limit:
        sql += " LIMIT ?"
        params.append(limit)

    with connection(database_path) as conn:
        rows = conn.execute(sql, params).fetchall()
        result = []
        for row in rows:
            grave = conn.execute("SELECT * FROM graves WHERE person_id = ?", (row["id"],)).fetchone()
            result.append(_person_from_row(row, grave))
        return result


def get_person(person_id: int, database_path: Path | str = DATABASE_PATH) -> dict[str, Any] | None:
    initialize_database(database_path)
    with connection(database_path) as conn:
        row = conn.execute("SELECT * FROM persons WHERE id = ?", (person_id,)).fetchone()
        if row is None:
            return None
        grave = conn.execute("SELECT * FROM graves WHERE person_id = ?", (person_id,)).fetchone()
        return _person_from_row(row, grave)


def list_graves(database_path: Path | str = DATABASE_PATH) -> list[dict[str, Any]]:
    initialize_database(database_path)
    with connection(database_path) as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM graves ORDER BY person_id").fetchall()]


def list_pois(database_path: Path | str = DATABASE_PATH) -> list[dict[str, Any]]:
    initialize_database(database_path)
    with connection(database_path) as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM poi ORDER BY id").fetchall()]


def _sentence_count(text: str) -> int:
    return len([part for part in text.replace("!", ".").replace("?", ".").split(".") if part.strip()])


def create_person_with_grave(payload: dict[str, Any], database_path: Path | str = DATABASE_PATH) -> dict[str, Any]:
    grave = payload.get("grave") or {}
    if grave.get("latitude") is None or grave.get("longitude") is None:
        raise ValueError(ERROR_MESSAGES["missing_coordinates"])
    if not payload.get("sources"):
        raise ValueError("Każda osoba musi mieć przynajmniej jedno źródło historyczne.")
    if _sentence_count(payload.get("description", "")) < 3:
        raise ValueError("Opis historyczny musi mieć minimum 3 zdania.")

    initialize_database(database_path)
    with connection(database_path) as conn:
        next_order = conn.execute("SELECT COALESCE(MAX(display_order), 0) + 1 FROM persons").fetchone()[0]
        cursor = conn.execute(
            """
            INSERT INTO persons (full_name, birth_year, death_year, description, sources, display_order)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                payload["full_name"],
                payload["birth_year"],
                payload["death_year"],
                payload["description"],
                json.dumps(payload["sources"], ensure_ascii=False),
                next_order,
            ),
        )
        person_id = int(cursor.lastrowid)
        conn.execute(
            """
            INSERT INTO graves (person_id, latitude, longitude, sector)
            VALUES (?, ?, ?, ?)
            """,
            (
                person_id,
                grave["latitude"],
                grave["longitude"],
                grave.get("sector") or "Lokalizacja przybliżona",
            ),
        )
    created = get_person(person_id, database_path)
    if created is None:
        raise RuntimeError("Nie udało się odczytać zapisanego obiektu.")
    return created


def distance_meters(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> int:
    earth_radius = 6371000
    lat1 = math.radians(from_lat)
    lat2 = math.radians(to_lat)
    d_lat = math.radians(to_lat - from_lat)
    d_lng = math.radians(to_lng - from_lng)
    h = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2
    return round(2 * earth_radius * math.asin(math.sqrt(h)))


def bearing_degrees(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> int:
    lat1 = math.radians(from_lat)
    lat2 = math.radians(to_lat)
    d_lng = math.radians(to_lng - from_lng)
    x = math.sin(d_lng) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lng)
    return round((math.degrees(math.atan2(x, y)) + 360) % 360)


def direction_label(bearing: int) -> str:
    labels = [
        (22.5, "idź na północ"),
        (67.5, "idź na północny wschód"),
        (112.5, "idź na wschód"),
        (157.5, "idź na południowy wschód"),
        (202.5, "idź na południe"),
        (247.5, "idź na południowy zachód"),
        (292.5, "idź na zachód"),
        (337.5, "idź na północny zachód"),
        (360.0, "idź na północ"),
    ]
    for limit, label in labels:
        if bearing < limit:
            return label
    return "idź na północ"


def navigation_to_person(person_id: int, from_lat: float, from_lng: float, database_path: Path | str = DATABASE_PATH) -> dict[str, Any]:
    person = get_person(person_id, database_path)
    if not person or "grave" not in person:
        raise KeyError("Nie znaleziono osoby lub lokalizacji grobu.")
    grave = person["grave"]
    bearing = bearing_degrees(from_lat, from_lng, grave["latitude"], grave["longitude"])
    return {
        "person_id": person_id,
        "full_name": person["full_name"],
        "distance_meters": distance_meters(from_lat, from_lng, grave["latitude"], grave["longitude"]),
        "bearing_degrees": bearing,
        "direction": direction_label(bearing),
        "target": grave,
    }


def build_offline_bundle(database_path: Path | str = DATABASE_PATH) -> dict[str, Any]:
    persons = list_persons(database_path=database_path)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "persons": persons,
        "graves": list_graves(database_path),
        "poi": list_pois(database_path),
        "map": {
            "provider": "OpenStreetMap",
            "library": "Leaflet",
            "strategy": "Service Worker cache-first for map tiles and images, network-first for app shell.",
            "fallback_tile": "/offline-tile.svg",
        },
        "messages": ERROR_MESSAGES,
    }
