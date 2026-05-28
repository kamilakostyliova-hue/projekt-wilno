from __future__ import annotations

import hashlib
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from .database import DATABASE_PATH, connection
except ImportError:  # pragma: no cover - supports: python backend/users.py
    from database import DATABASE_PATH, connection


DEMO_USERS = [
    {
        "username": "Kamila",
        "email": "kamila@na-rossie.local",
        "password": "kamila123",
        "role": "admin",
    },
    {
        "username": "Demo Student",
        "email": "demo@na-rossie.local",
        "password": "demo123",
        "role": "user",
    },
    {
        "username": "Opiekun Rossy",
        "email": "opiekun@na-rossie.local",
        "password": "opiekun123",
        "role": "caretaker",
    },
    {
        "username": "Administrator Rossy",
        "email": "admin@na-rossie.local",
        "password": "admin123",
        "role": "admin",
    },
]

ALLOWED_ROLES = {"user", "caretaker", "admin"}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _public_user(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "role": row["role"],
        "created_at": row["created_at"],
    }


def ensure_user_schema(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "role" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")


def initialize_users(database_path: Path | str = DATABASE_PATH) -> None:
    with connection(database_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL
            )
            """
        )
        ensure_user_schema(conn)

        seed_users(conn)


def seed_users(conn: sqlite3.Connection) -> None:
    now = datetime.now(timezone.utc).isoformat()
    for user in DEMO_USERS:
        conn.execute(
            """
            INSERT OR IGNORE INTO users (username, email, password, role, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user["username"],
                user["email"].lower(),
                hash_password(user["password"]),
                user.get("role", "user"),
                now,
            ),
        )
        conn.execute(
            "UPDATE users SET role = ? WHERE lower(email) = lower(?)",
            (user.get("role", "user"), user["email"].lower()),
        )


def list_users(database_path: Path | str = DATABASE_PATH) -> list[dict[str, Any]]:
    initialize_users(database_path)
    with connection(database_path) as conn:
        rows = conn.execute(
            "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]


def get_user_by_email(
    email: str, database_path: Path | str = DATABASE_PATH
) -> sqlite3.Row | None:
    initialize_users(database_path)
    with connection(database_path) as conn:
        return conn.execute(
            "SELECT * FROM users WHERE lower(email) = lower(?)",
            (email.strip().lower(),),
        ).fetchone()


def create_user(
    username: str,
    email: str,
    password: str,
    database_path: Path | str = DATABASE_PATH,
    role: str = "user",
) -> dict[str, Any]:
    initialize_users(database_path)
    normalized_email = email.strip().lower()
    normalized_username = username.strip()
    normalized_role = role if role in ALLOWED_ROLES else "user"

    if get_user_by_email(normalized_email, database_path):
        raise ValueError("Uzytkownik z takim adresem email juz istnieje.")

    with connection(database_path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO users (username, email, password, role, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                normalized_username,
                normalized_email,
                hash_password(password),
                normalized_role,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        row = conn.execute(
            "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
        if row is None:
            raise RuntimeError("Nie udalo sie odczytac zapisanego uzytkownika.")
        return dict(row)


def authenticate_user(
    email: str,
    password: str,
    database_path: Path | str = DATABASE_PATH,
) -> dict[str, Any] | None:
    row = get_user_by_email(email, database_path)
    if row is None:
        return None

    if row["password"] != hash_password(password):
        return None

    return _public_user(row)
