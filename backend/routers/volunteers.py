from fastapi import APIRouter, Depends, HTTPException, Query, status
from database import supabase
from models import VolunteerStatusUpdate, TaskUpdateCreate
from routers.auth import get_current_user, get_admin_user

router = APIRouter()


def _get_user_role(user_id: str) -> str:
    """Fetch role from profiles table for a given user UUID."""
    res = supabase.table("profiles") \
        .select("role") \
        .eq("id", user_id) \
        .single() \
        .execute()
    if not res.data:
        return "volunteer"
    return res.data.get("role", "volunteer")


# ── PATCH /volunteers/status ──────────────────────────────────────────────────
@router.patch("/status")
def update_volunteer_status(
    body: VolunteerStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["sub"]

    role = _get_user_role(user_id)
    if role != "volunteer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only volunteers can update their status"
        )

    res = supabase.table("profiles") \
        .update({"is_online": body.is_online}) \
        .eq("id", user_id) \
        .execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update status")

    return res.data[0]


# ── GET /volunteers/online ────────────────────────────────────────────────────
@router.get("/online")
def get_online_volunteers(
    current_user: dict = Depends(get_admin_user)
):
    res = supabase.table("profiles") \
        .select("*") \
        .eq("role", "volunteer") \
        .eq("is_online", True) \
        .execute()

    return res.data or []


# ── GET /volunteers/nearest ───────────────────────────────────────────────────
@router.get("/nearest")
def get_nearest_volunteers(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(default=5),
    current_user: dict = Depends(get_current_user)
):
    radius_meters = radius_km * 1000

    res = supabase.rpc("get_nearest_volunteers", {
        "lat": lat,
        "lng": lng,
        "radius_meters": radius_meters
    }).execute()

    if res.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch nearest volunteers")

    return res.data or []


# ── POST /volunteers/task-update ──────────────────────────────────────────────
@router.post("/task-update", status_code=status.HTTP_201_CREATED)
def create_task_update(
    body: TaskUpdateCreate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["sub"]

    role = _get_user_role(user_id)
    if role != "volunteer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only volunteers can submit task updates"
        )

    res = supabase.table("task_updates").insert({
        "incident_id": body.incident_id,
        "volunteer_id": user_id,
        "action": body.action
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create task update")

    if body.action == "completed":
        supabase.table("incidents") \
            .update({"status": "resolved"}) \
            .eq("id", body.incident_id) \
            .execute()

    return res.data[0]