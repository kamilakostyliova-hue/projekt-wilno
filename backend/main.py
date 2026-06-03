from __future__ import annotations

from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .auth import router as auth_router
    from .caretakers import (
        create_care_report,
        create_caretaker_update,
        initialize_caretaker_data,
        list_care_reports,
        list_caretaker_assignments,
        list_caretaker_updates,
        replace_caretaker_assignments,
        update_care_report_status,
    )
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
    from caretakers import (
        create_care_report,
        create_caretaker_update,
        initialize_caretaker_data,
        list_care_reports,
        list_caretaker_assignments,
        list_caretaker_updates,
        replace_caretaker_assignments,
        update_care_report_status,
    )
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


class CaretakerAssignmentUpdate(BaseModel):
    placeIds: list[int] = Field(default_factory=list)
    assignedByEmail: str | None = None


class CaretakerUpdateCreate(BaseModel):
    caretakerEmail: str = Field(..., min_length=5, max_length=120)
    caretakerName: str = Field(..., min_length=2, max_length=120)
    note: str = Field(..., min_length=2, max_length=2000)
    assignedCount: int = Field(default=0, ge=0)
    openTasksCount: int = Field(default=0, ge=0)


class CareReportCreate(BaseModel):
    placeId: int | None = None
    placeName: str = Field(..., min_length=2, max_length=180)
    type: str = Field(..., min_length=2, max_length=80)
    note: str = Field(..., min_length=2, max_length=2000)
    reporterEmail: str | None = Field(default=None, max_length=120)


class CareReportStatusUpdate(BaseModel):
    status: str = Field(..., min_length=2, max_length=40)


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
    initialize_caretaker_data()


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


@app.get("/api/caretakers/assignments")
def caretaker_assignments() -> dict[str, list[int]]:
    return list_caretaker_assignments()


@app.put("/api/caretakers/assignments/{caretaker_email}")
def update_caretaker_assignments(
    caretaker_email: str,
    payload: CaretakerAssignmentUpdate,
) -> dict:
    return replace_caretaker_assignments(
        caretaker_email=caretaker_email,
        place_ids=payload.placeIds,
        assigned_by_email=payload.assignedByEmail,
    )


@app.get("/api/caretakers/updates")
def caretaker_updates(
    caretaker_email: Annotated[str | None, Query(description="Email opiekuna")] = None,
) -> list[dict]:
    return list_caretaker_updates(caretaker_email=caretaker_email)


@app.post("/api/caretakers/updates", status_code=201)
def add_caretaker_update(payload: CaretakerUpdateCreate) -> dict:
    return create_caretaker_update(
        caretaker_email=payload.caretakerEmail,
        caretaker_name=payload.caretakerName,
        note=payload.note,
        assigned_count=payload.assignedCount,
        open_tasks_count=payload.openTasksCount,
    )


@app.get("/api/care-reports")
def care_reports(
    status: Annotated[str | None, Query(description="Status zgloszenia")] = None,
) -> list[dict]:
    return list_care_reports(status=status)


@app.post("/api/care-reports", status_code=201)
def add_care_report(payload: CareReportCreate) -> dict:
    return create_care_report(
        place_id=payload.placeId,
        place_name=payload.placeName,
        report_type=payload.type,
        note=payload.note,
        reporter_email=payload.reporterEmail,
    )


@app.patch("/api/care-reports/{report_id}")
def patch_care_report(report_id: int, payload: CareReportStatusUpdate) -> dict:
    updated = update_care_report_status(report_id, payload.status)
    if updated is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono zgloszenia.")
    return updated


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
