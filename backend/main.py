from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from config import settings
from routers import auth, incidents, volunteers, ai

app = FastAPI(title="VolunteerIQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.frontend_url,  
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(incidents.router, prefix="/incidents")
app.include_router(volunteers.router, prefix="/volunteers")
app.include_router(ai.router, prefix="/ai")


@app.get("/")
def health_check():
    return {"status": "ok"}


# Serverless handler (Vercel / AWS Lambda)
handler = Mangum(app)