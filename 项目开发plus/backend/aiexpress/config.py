"""配置加载"""
import os
import yaml
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ClaudeConfig:
    cli_path: str = "claude"
    model: str = "claude-opus-4-6"
    effort: str = "high"        # low | medium | high
    timeout: int = 600
    max_retries: int = 2


@dataclass
class OutputConfig:
    base_dir: str = "./outputs"


@dataclass
class ServerConfig:
    gateway_port: int = 8001
    frontend_port: int = 3000
    nginx_port: int = 2026


@dataclass
class AppConfig:
    claude: ClaudeConfig = field(default_factory=ClaudeConfig)
    output: OutputConfig = field(default_factory=OutputConfig)
    server: ServerConfig = field(default_factory=ServerConfig)


def load_config(config_path: str | None = None) -> AppConfig:
    """从 config.yaml 加载配置"""
    if config_path is None:
        # 向上查找 config.yaml
        for d in [Path.cwd(), Path.cwd().parent, Path.cwd().parent.parent]:
            p = d / "config.yaml"
            if p.exists():
                config_path = str(p)
                break

    if config_path and os.path.exists(config_path):
        with open(config_path) as f:
            raw = yaml.safe_load(f) or {}
        return AppConfig(
            claude=ClaudeConfig(**raw.get("claude", {})),
            output=OutputConfig(**raw.get("output", {})),
            server=ServerConfig(**raw.get("server", {})),
        )

    return AppConfig()


# 全局配置单例
config = load_config()
