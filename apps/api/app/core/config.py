from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_base_url: str = "http://localhost:8080"
    database_url: str = "sqlite:///./data/app.db"
    api_token_secret: str = "change-me"
    trusted_proxy: str = "127.0.0.1"
    export_path: str = "./data/exports"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
