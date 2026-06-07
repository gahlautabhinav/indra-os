from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.config import settings
from indra.database import get_db
from indra.models.user import User

_ALLOWED_ALGORITHMS = frozenset({"HS256", "RS256"})
_DUMMY_HASH = "$2b$12$eImiTXuWVxfM37uY4JANjQ=="  # bcrypt sentinel for timing parity

if settings.jwt_algorithm not in _ALLOWED_ALGORITHMS:
    raise ValueError(f"Invalid JWT_ALGORITHM '{settings.jwt_algorithm}'. Must be HS256 or RS256.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserContext(BaseModel):
    id: str
    email: str
    role: str


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(payload: dict[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    data = {**payload, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserContext:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_token(credentials.credentials)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return UserContext(id=str(user.id), email=user.email, role=user.role)


def require_role(minimum_role: str):
    role_rank = {"viewer": 0, "user": 1, "admin": 2}

    async def _check(current_user: UserContext = Depends(get_current_user)) -> UserContext:
        if role_rank.get(current_user.role, -1) < role_rank.get(minimum_role, 99):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{minimum_role}' required",
            )
        return current_user

    return _check


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()

    # Always run bcrypt comparison to prevent email enumeration via timing delta
    candidate_hash = user.hashed_password if user else _DUMMY_HASH
    password_ok = _verify_password(body.password, candidate_hash)

    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = _create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )
