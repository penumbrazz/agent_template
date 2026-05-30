from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import TokenWithExpiry, UserCreate, UserLogin, UserRead
from app.services.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    refresh_user_token,
    register_user,
    revoke_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_TOKEN_KEY = "refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Set the refresh token as an HttpOnly cookie on the response."""
    response.set_cookie(
        key=REFRESH_TOKEN_KEY,
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=f"{settings.API_PREFIX}/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Clear the refresh token cookie from the response."""
    response.set_cookie(
        key=REFRESH_TOKEN_KEY,
        value="",
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=0,
        path=f"{settings.API_PREFIX}/auth",
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)) -> User:
    """Register a new user account."""
    try:
        return register_user(db, user_in)
    except ValueError as e:
        if "Username" in str(e):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
        if "Email" in str(e):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenWithExpiry)
@limiter.limit("10/minute")
def login(request: Request, response: Response, user_in: UserLogin, db: Session = Depends(get_db)) -> dict:
    """Authenticate a user and return JWT tokens."""
    try:
        user = authenticate_user(db, user_in)
    except ValueError as e:
        if "disabled" in str(e):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    access_token = create_access_token(data={"sub": user.id})
    refresh = create_refresh_token(data={"sub": user.id, "tv": user.token_version})
    _set_refresh_cookie(response, refresh)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/refresh", response_model=TokenWithExpiry)
@limiter.limit("20/minute")
def refresh(
    request: Request,
    response: Response,
    refresh_token: Optional[str] = Cookie(None, alias=REFRESH_TOKEN_KEY),
    db: Session = Depends(get_db),
) -> dict:
    """Exchange a valid refresh token for new JWT tokens."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    try:
        result = refresh_user_token(db, refresh_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        )
    _set_refresh_cookie(response, result.pop("refresh_token"))
    return result


@router.post("/logout")
def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(None, alias=REFRESH_TOKEN_KEY),
    db: Session = Depends(get_db),
) -> dict:
    """Revoke the refresh token and clear the cookie."""
    _clear_refresh_cookie(response)
    if refresh_token:
        revoke_refresh_token(db, refresh_token)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the currently authenticated user."""
    return current_user
