from __future__ import annotations

from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .auth import router as auth_router
    from .database import (
        ERROR_MESSAGES,
        build_offline_bundle,
        create_person_with_grave,
        get_person,
        initialize_database,
        list_graves,
        list_persons,
        navigation_to_person,
    )
    from .users import initialize_users
except ImportError:  # pragma: no cover - supports: python backend/main.py
    from auth import router as auth_router
    from database import (
        ERROR_MESSAGES,
        build_offline_bundle,
        create_person_with_grave,
        get_person,
        initialize_database,
        list_graves,
        list_persons,
        navigation_to_person,
    )
    from users import initialize_users


class GraveCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    sector: str = Field(..., min_length=3)


class PersonCreate(BaseModel):
    full_name: str = Field(..., min_length=3)
    birth_year: int
    death_year: int
    description: str = Field(..., min_length=80)
    sources: list[str] = Field(..., min_length=1)
    grave: GraveCreate


app = FastAPI(
    title="Na Rossie API",
    version="1.0.0",
    description="Backend udostępnia dane osób historycznych, grobów, walidację oraz paczkę offline.",
)

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    initialize_database()
    initialize_users()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/persons")
def persons(
    query: Annotated[str | None, Query(description="Fragment imienia lub nazwiska")] = None,
    limit: Annotated[int | None, Query(ge=1, le=50)] = None,
) -> list[dict]:
    return list_persons(query=query, limit=limit)


@app.get("/api/persons/top")
def top_persons() -> list[dict]:
    return list_persons(limit=11)


@app.get("/api/persons/{person_id}")
def person_details(person_id: int) -> dict:
    person = get_person(person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono osoby.")
    return person


@app.post("/api/persons", status_code=201)
def create_person(payload: PersonCreate) -> dict:
    try:
        return create_person_with_grave(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/graves")
def graves() -> list[dict]:
    return list_graves()


@app.get("/api/navigation/distance")
def navigation_distance(
    person_id: int,
    from_lat: Annotated[float, Query(ge=-90, le=90)],
    from_lng: Annotated[float, Query(ge=-180, le=180)],
) -> dict:
    try:
        return navigation_to_person(person_id, from_lat, from_lng)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/offline-bundle")
def offline_bundle() -> dict:
    return build_offline_bundle()


@app.get("/api/messages")
def messages() -> dict[str, str]:
    return ERROR_MESSAGES
