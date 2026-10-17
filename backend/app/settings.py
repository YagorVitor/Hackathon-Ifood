from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    client_id: str
    client_secret: str
    redirect_uri: str
    scopes: str
    mcp_url: str

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            client_id=os.getenv("IFOOD_CLIENT_ID", "").strip(),
            client_secret=os.getenv("IFOOD_CLIENT_SECRET", "").strip(),
            redirect_uri=os.getenv(
                "IFOOD_REDIRECT_URI", "http://localhost:8000/auth/callback"
            ).strip(),
            scopes=os.getenv("IFOOD_SCOPES", "mcp.discovery search.read").strip(),
            mcp_url=os.getenv(
                "IFOOD_MCP_URL", "https://consumer-mcp.ifood.com.br/marketplace"
            ).strip(),
        )

    def validate_oauth(self) -> None:
        if not self.client_id or not self.client_secret:
            raise RuntimeError(
                "Configure IFOOD_CLIENT_ID e IFOOD_CLIENT_SECRET no arquivo .env."
            )
