from fastapi import APIRouter, Depends, HTTPException, Query, status
from database import supabase
from models import IncidentCreate, IncidentUpdate
from routers.auth import get_current_user

router = APIRouter()


def _get_user_role(user_id: str) -> str:
    """Fetch role from profiles table for a given user UUID."""
    res = supabase.table("profiles") \
        .select("role") \
        .eq("id", user_id) \
        .single() \
        .execute()
    if not res.data:
        return "volunteer"  # safe default
    return res.data.get("role", "volunteer")


# ── POST /incidents/ ──────────────────────────────────────────────────────────
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_incident(
    body: IncidentCreate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["sub"]

    res = supabase.table("incidents").insert({
        "requester_id": user_id,
        "location": f"POINT({body.lng} {body.lat})",
        "status": "reported",
        "description": body.description,
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create incident")

    return res.data[0]


# ── GET /incidents/ ───────────────────────────────────────────────────────────
@router.get("/")
def list_incidents(
    status_filter: str = Query(default=None, alias="status"),
    limit: int = Query(default=20),
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["sub"]
    role = _get_user_role(user_id)

    query = supabase.table("incidents").select("*")

    if role == "admin":
        pass  # sees everything

    elif role == "volunteer":
        query = query.neq("status", "resolved") \
                     .order("urgency_score", desc=True)

    else:  # requester
        query = query.eq("requester_id", user_id)

    if status_filter:
        query = query.eq("status", status_filter)

    res = query.limit(limit).execute()
    return res.data or []


# ── GET /incidents/{incident_id} ──────────────────────────────────────────────
@router.get("/{incident_id}")
def get_incident(
    incident_id: str,
    current_user: dict = Depends(get_current_user)
):
    res = supabase.table("incidents") \
        .select("*") \
        .eq("id", incident_id) \
        .single() \
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Incident not found")

    return res.data


# ── PATCH /incidents/{incident_id} ────────────────────────────────────────────
@router.patch("/{incident_id}")
def update_incident(
    incident_id: str,
    body: IncidentUpdate,
    current_user: dict = Depends(get_current_user)
):
    update_data = {"status": body.status}
    if body.assigned_volunteer_id:
        update_data["assigned_volunteer_id"] = body.assigned_volunteer_id

    res = supabase.table("incidents") \
        .update(update_data) \
        .eq("id", incident_id) \
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Incident not found or no changes made")

    return res.data[0]