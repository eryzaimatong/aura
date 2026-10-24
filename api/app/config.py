from pydantic_settings import BaseSettings, SettingsConfigDict

APP_VERSION = "0.1.0"

# Must match web/src/lib/policy.ts — a scan needs consent to the current notice.
POLICY_VERSION = "2026-10"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Vite dev server, plus the origins the Capacitor webview uses on Android and iOS.
    cors_origins: str = "http://localhost:5173,https://localhost,http://localhost,capacitor://localhost"

    # Same project URL and publishable (anon) key the web app uses. The API acts as the
    # signed-in user, so RLS applies to every query — no service-role key needed here.
    supabase_url: str = ""
    supabase_publishable_key: str = ""

    # Interactive API docs (/docs, /redoc, /openapi.json). Off unless switched on, so a
    # deployed API doesn't publish its whole surface; set EXPOSE_DOCS=true locally.
    expose_docs: bool = False

    # Seconds of clock difference tolerated on login tokens. Servers keep synced clocks, so 60 is
    # plenty in production; raise it locally only if your computer's clock drifts (JWT_LEEWAY_S).
    jwt_leeway_s: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"


settings = Settings()
