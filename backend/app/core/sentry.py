import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import settings

_SAMPLE_RATE_MAP = {
    "development": 1.0,
    "staging": 0.5,
    "production": 0.2,
}


def init_sentry() -> bool:
    if not settings.SENTRY_DSN:
        return False
    rate = settings.SENTRY_TRACES_SAMPLE_RATE or _SAMPLE_RATE_MAP.get(
        settings.ENVIRONMENT, 0.2
    )
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=settings.VERSION,
        traces_sample_rate=rate,
        integrations=[FastApiIntegration()],
    )
    return True
