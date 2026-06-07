from fastapi import APIRouter

router = APIRouter()


@router.get("/alliances/status", tags=["mitrah"])
async def mitrah_status() -> dict:
    return {"deva": "Mitrah", "domain": "aditya", "status": "planned", "function": "alliance_manager"}
