from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import time
from collections import defaultdict
from math import radians, sin, cos, sqrt, atan2

from routers.auth import get_current_user
from database import supabase
from nlp.scorer import score_incident

router = APIRouter(prefix="/ai", tags=["AI"])

# ─────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    incident_id: str
    description: str


class ScoreResponse(BaseModel):
    incident_id: str
    urgency_score: int
    category: str


class TextScoreRequest(BaseModel):
    text: str


class TextScoreResponse(BaseModel):
    urgency_score: int
    category: str


class MatchVolunteerRequest(BaseModel):
    incident_id: str
    auto_assign: bool = True   # safer control


class VolunteerMatch(BaseModel):
    volunteer_id: str
    name: str
    skills: list[str]
    distance_km: float


# ─────────────────────────────────────────────────────────────
# Rate Limiter
# ─────────────────────────────────────────────────────────────

_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 10
RATE_WINDOW = 60


def check_rate_limit(ip: str):
    now = time.time()
    window_start = now - RATE_WINDOW

    _rate_limit_store[ip] = [
        t for t in _rate_limit_store[ip] if t > window_start
    ]

    if len(_rate_limit_store[ip]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Max 10 requests/minute."
        )

    _rate_limit_store[ip].append(now)


# ─────────────────────────────────────────────────────────────
# Utility Functions
# ─────────────────────────────────────────────────────────────

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


CATEGORY_SKILLS: dict[str, list[str]] = {
    "medical": ["first aid", "medical", "nurse"],
    "logistics": ["logistics", "driving", "truck"],
    "food": ["food distribution", "cooking", "logistics"],
}


def skill_match(vol_skills: list[str], required: list[str]) -> bool:
    vol_skills_lower = [s.lower() for s in vol_skills]
    return any(req.lower() in vol_skills_lower for req in required)


# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/score-incident", response_model=ScoreResponse)
async def score_incident_endpoint(
    body: ScoreRequest,
    current_user=Depends(get_current_user)
):
    if not body.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty.")

    result = score_incident(body.description)

    if "urgency_score" not in result or "category" not in result:
        raise HTTPException(status_code=500, detail="Invalid scorer output")

    try:
        response = (
            supabase.table("incidents")
            .update({
                "urgency_score": result["urgency_score"],
                "category": result["category"],
                "status": "ai_scored"
            })
            .eq("id", body.incident_id)
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Database update failed")

    if not response.data:
        raise HTTPException(status_code=404, detail="Incident not found")

    return ScoreResponse(
        incident_id=body.incident_id,
        urgency_score=result["urgency_score"],
        category=result["category"]
    )


@router.post("/score-text", response_model=TextScoreResponse)
async def score_text_endpoint(body: TextScoreRequest, request: Request):
    client_ip = request.headers.get("x-forwarded-for", request.client.host)
    check_rate_limit(client_ip)

    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    result = score_incident(text)

    return TextScoreResponse(
        urgency_score=result["urgency_score"],
        category=result["category"]
    )


@router.post("/match-volunteer", response_model=list[VolunteerMatch])
async def match_volunteer(
    body: MatchVolunteerRequest,
    current_user=Depends(get_current_user),
):
    # ── Admin guard ──
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")

    # ── Fetch incident ──
    try:
        inc_resp = (
            supabase.table("incidents")
            .select("id, category, location")  # FIX BUG-09: location is a PostGIS POINT, not lat/lng columns
            .eq("id", body.incident_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch incident")

    if not inc_resp.data:
        raise HTTPException(status_code=404, detail="Incident not found.")

    incident = inc_resp.data
    category = (incident.get("category") or "").lower()

    # FIX BUG-09: Parse PostGIS "POINT(lng lat)" string instead of reading non-existent columns
    inc_lat, inc_lon = None, None
    location_str = incident.get("location") or ""
    if location_str.upper().startswith("POINT("):
        try:
            coords = location_str[6:-1].split()  # strip "POINT(" and ")"
            inc_lon = float(coords[0])
            inc_lat = float(coords[1])
        except (IndexError, ValueError):
            pass  # leave as None; distance will be inf for all volunteers

    # ── Fetch volunteers ──
    try:
        vol_resp = (
            supabase.table("profiles")  # FIX BUG-09: was "volunteers", correct table is "profiles"
            .select("id, full_name, skills, latitude, longitude")
            .eq("role", "volunteer")   # FIX BUG-09: filter to volunteers only
            .eq("is_online", True)
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch volunteers")

    volunteers = vol_resp.data or []
    if not volunteers:
        return []

    # ── Skill filtering ──
    required_skills = CATEGORY_SKILLS.get(category)

    if required_skills:
        filtered = [
            v for v in volunteers
            if skill_match(v.get("skills") or [], required_skills)
        ]
        if not filtered:
            filtered = volunteers
    else:
        filtered = volunteers

    # ── Distance ranking ──
    def compute_distance(v):
        if None in (inc_lat, inc_lon, v.get("latitude"), v.get("longitude")):
            return float("inf")
        return haversine(inc_lat, inc_lon, v["latitude"], v["longitude"])

    ranked = sorted(filtered, key=compute_distance)
    top3 = ranked[:3]

    # ── Auto-assign ──
    if body.auto_assign and top3:
        try:
            supabase.table("incidents").update({
                "assigned_volunteer_id": top3[0]["id"],
                "status": "assigned",
            }).eq("id", body.incident_id).execute()
        except Exception:
            pass  # don't fail request if assignment fails

    # ── Response ──
    return [
        VolunteerMatch(
            volunteer_id=v["id"],
            name=v.get("full_name", ""),
            skills=v.get("skills") or [],
            distance_km=round(compute_distance(v), 2)
        )
        for v in top3
    ]