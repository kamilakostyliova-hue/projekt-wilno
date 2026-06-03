from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from .database import DATABASE_PATH, connection
except ImportError:  # pragma: no cover - supports: python backend/caretakers.py
    from database import DATABASE_PATH, connection


def initialize_caretaker_data(database_path: Path | str = DATABASE_PATH) -> None:
    with connection(database_path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS caretaker_assignments (
                caretaker_email TEXT NOT NULL,
                place_id INTEGER NOT NULL,
                assigned_by_email TEXT,
                assigned_at TEXT NOT NULL,
                PRIMARY KEY (caretaker_email, place_id)
            );

            CREATE TABLE IF NOT EXISTS caretaker_updates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                caretaker_email TEXT NOT NULL,
                caretaker_name TEXT NOT NULL,
                note TEXT NOT NULL,
                assigned_count INTEGER NOT NULL DEFAULT 0,
                open_tasks_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS care_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                place_id INTEGER,
                place_name TEXT NOT NULL,
                type TEXT NOT NULL,
                note TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'new',
                reporter_email TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT
            );
            """
        )


def list_caretaker_assignments(
    database_path: Path | str = DATABASE_PATH,
) -> dict[str, list[int]]:
    initialize_caretaker_data(database_path)
    with connection(database_path) as conn:
        rows = conn.execute(
            """
            SELECT caretaker_email, place_id
            FROM caretaker_assignments
            ORDER BY caretaker_email, place_id
            """
        ).fetchall()

    assignments: dict[str, list[int]] = {}
    for row in rows:
        assignments.setdefault(row["caretaker_email"], []).append(row["place_id"])
    return assignments


def replace_caretaker_assignments(
    caretaker_email: str,
    place_ids: list[int],
    assigned_by_email: str | None = None,
    database_path: Path | str = DATABASE_PATH,
) -> dict[str, Any]:
    initialize_caretaker_data(database_path)
    normalized_email = caretaker_email.strip().lower()
    normalized_place_ids = sorted({int(place_id) for place_id in place_ids if int(place_id) > 0})
    assigned_at = datetime.now(timezone.utc).isoformat()

    with connection(database_path) as conn:
        conn.execute(
            "DELETE FROM caretaker_assignments WHERE lower(caretaker_email) = lower(?)",
            (normalized_email,),
        )
        conn.executemany(
            """
            INSERT INTO caretaker_assignments
                (caretaker_email, place_id, assigned_by_email, assigned_at)
            VALUES (?, ?, ?, ?)
            """,
            [
                (normalized_email, place_id, assigned_by_email, assigned_at)
                for place_id in normalized_place_ids
            ],
        )

    return {
        "caretakerEmail": normalized_email,
        "placeIds": normalized_place_ids,
        "assignedByEmail": assigned_by_email,
        "assignedAt": assigned_at,
    }


def _update_from_row(row: Any) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "caretakerEmail": row["caretaker_email"],
        "caretakerName": row["caretaker_name"],
        "note": row["note"],
        "assignedCount": row["assigned_count"],
        "openTasksCount": row["open_tasks_count"],
        "createdAt": row["created_at"],
    }


def list_caretaker_updates(
    caretaker_email: str | None = None,
    database_path: Path | str = DATABASE_PATH,
) -> list[dict[str, Any]]:
    initialize_caretaker_data(database_path)
    params: tuple[Any, ...] = ()
    sql = "SELECT * FROM caretaker_updates"
    if caretaker_email:
        sql += " WHERE lower(caretaker_email) = lower(?)"
        params = (caretaker_email.strip().lower(),)
    sql += " ORDER BY created_at DESC, id DESC"

    with connection(database_path) as conn:
        rows = conn.execute(sql, params).fetchall()
        return [_update_from_row(row) for row in rows]


def create_caretaker_update(
    caretaker_email: str,
    caretaker_name: str,
    note: str,
    assigned_count: int,
    open_tasks_count: int,
    database_path: Path | str = DATABASE_PATH,
) -> dict[str, Any]:
    initialize_caretaker_data(database_path)
    created_at = datetime.now(timezone.utc).isoformat()

    with connection(database_path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO caretaker_updates
                (caretaker_email, caretaker_name, note, assigned_count, open_tasks_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                caretaker_email.strip().lower(),
                caretaker_name.strip(),
                note.strip(),
                max(0, int(assigned_count)),
                max(0, int(open_tasks_count)),
                created_at,
            ),
        )
        row = conn.execute(
            "SELECT * FROM caretaker_updates WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
        if row is None:
            raise RuntimeError("Nie udalo sie odczytac zapisanego raportu opiekuna.")
        return _update_from_row(row)


def _care_report_from_row(row: Any) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "placeId": row["place_id"],
        "placeName": row["place_name"],
        "type": row["type"],
        "note": row["note"],
        "status": row["status"],
        "reporterEmail": row["reporter_email"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_care_reports(
    status: str | None = None,
    database_path: Path | str = DATABASE_PATH,
) -> list[dict[str, Any]]:
    initialize_caretaker_data(database_path)
    params: tuple[Any, ...] = ()
    sql = "SELECT * FROM care_reports"
    if status:
        sql += " WHERE status = ?"
        params = (status,)
    sql += " ORDER BY created_at DESC, id DESC"

    with connection(database_path) as conn:
        rows = conn.execute(sql, params).fetchall()
        return [_care_report_from_row(row) for row in rows]


def create_care_report(
    place_id: int | None,
    place_name: str,
    report_type: str,
    note: str,
    reporter_email: str | None = None,
    database_path: Path | str = DATABASE_PATH,
) -> dict[str, Any]:
    initialize_caretaker_data(database_path)
    created_at = datetime.now(timezone.utc).isoformat()

    with connection(database_path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO care_reports
                (place_id, place_name, type, note, status, reporter_email, created_at)
            VALUES (?, ?, ?, ?, 'new', ?, ?)
            """,
            (
                place_id,
                place_name.strip(),
                report_type.strip(),
                note.strip(),
                reporter_email.strip().lower() if reporter_email else None,
                created_at,
            ),
        )
        row = conn.execute(
            "SELECT * FROM care_reports WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
        if row is None:
            raise RuntimeError("Nie udalo sie odczytac zapisanego zgloszenia.")
        return _care_report_from_row(row)


def update_care_report_status(
    report_id: int,
    status: str,
    database_path: Path | str = DATABASE_PATH,
) -> dict[str, Any] | None:
    initialize_caretaker_data(database_path)
    updated_at = datetime.now(timezone.utc).isoformat()

    with connection(database_path) as conn:
        conn.execute(
            """
            UPDATE care_reports
            SET status = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, updated_at, report_id),
        )
        row = conn.execute("SELECT * FROM care_reports WHERE id = ?", (report_id,)).fetchone()
        return _care_report_from_row(row) if row is not None else None
