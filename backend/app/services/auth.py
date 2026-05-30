from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Return the bcrypt hash of the given password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with an optional custom expiration delta."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode a JWT access token, returning the payload or None on failure."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT refresh token with version tracking."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh", "tv": data.get("tv", 0)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_refresh_token(token: str) -> Optional[dict]:
    """Decode a JWT refresh token, returning the payload or None if invalid."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None


def register_user(db: Session, user_in: UserCreate) -> User:
    """Register a new user.

    Args:
        db: The database session.
        user_in: User registration data.

    Returns:
        The newly created User instance.

    Raises:
        ValueError: If the username or email is already registered.
    """
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise ValueError("Username already registered")
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise ValueError("Email already registered")
    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, user_in: UserLogin) -> User:
    """Authenticate a user by username and password.

    Args:
        db: The database session.
        user_in: Login credentials.

    Returns:
        The authenticated User instance.

    Raises:
        ValueError: If credentials are incorrect or the account is disabled.
    """
    user = db.query(User).filter(User.username == user_in.username).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise ValueError("Incorrect username or password")
    if not user.is_active:
        raise ValueError("User account is disabled")
    return user


def refresh_user_token(db: Session, refresh_token: str) -> dict:
    """Refresh authentication tokens using a valid refresh token.

    Args:
        db: The database session.
        refresh_token: The JWT refresh token string.

    Returns:
        A dict with new access_token, refresh_token, token_type,
        and expires_in.

    Raises:
        ValueError: If the refresh token is invalid, expired, or revoked.
    """
    payload = decode_refresh_token(refresh_token)
    if payload is None:
        raise ValueError("Invalid or expired refresh token")
    user_id = payload.get("sub")
    if user_id is None:
        raise ValueError("Invalid refresh token payload")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise ValueError("User not found or inactive")
    token_version = payload.get("tv", 0)
    if token_version != user.token_version:
        raise ValueError("Token has been revoked")
    access_token = create_access_token(data={"sub": user.id})
    new_refresh = create_refresh_token(data={"sub": user.id, "tv": user.token_version})
    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def revoke_refresh_token(db: Session, refresh_token: str) -> None:
    """Revoke a refresh token by incrementing the user's token version."""
    payload = decode_refresh_token(refresh_token)
    if payload:
        user_id = payload.get("sub")
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.token_version += 1
                db.commit()
