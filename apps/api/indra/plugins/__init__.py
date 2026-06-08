from .adapters.antigravity import AntigravityPlugin
from .adapters.claude_code import ClaudeCodePlugin
from .adapters.codex_cli import CodexCliPlugin
from .adapters.gemini_cli import GeminiCliPlugin
from .adapters.kiro_cli import KiroCliPlugin
from .adapters.opencode import OpenCodePlugin
from .manager import plugin_manager

__all__ = [
    "plugin_manager",
    "AntigravityPlugin",
    "ClaudeCodePlugin",
    "CodexCliPlugin",
    "GeminiCliPlugin",
    "KiroCliPlugin",
    "OpenCodePlugin",
]
