from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    from .users import authenticate_user, create_user, list_users
except ImportError:  # pragma: no cover - supports running main.py directly
    from users import authenticate_user, create_user, list_users


router = APIRouter(tags=["users"])


class RegisterPayload(BaseModel):
    username: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=4, max_length=120)


class LoginPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=4, max_length=120)


def validate_email(email: str) -> str:
    normalized = email.strip().lower()
    if "@" not in normalized or "." not in normalized.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=422, detail="Podaj poprawny adres email.")
    return normalized


@router.post("/register", status_code=201)
def register(payload: RegisterPayload) -> dict:
    email = validate_email(payload.email)
    try:
        user = create_user(payload.username, email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {
        "message": "Uzytkownik zostal zarejestrowany.",
        "user": user,
    }


@router.post("/login")
def login(payload: LoginPayload) -> dict:
    email = validate_email(payload.email)
    user = authenticate_user(email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Nieprawidlowy email albo haslo.")

    return {
        "message": "Logowanie zakonczone sukcesem.",
        "user": user,
    }


@router.get("/users")
def users() -> list[dict]:
    return list_users()
