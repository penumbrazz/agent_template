from fastapi import APIRouter

from app.api.endpoints import auth, health, llm_model, provider

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(provider.router)
api_router.include_router(llm_model.router)
