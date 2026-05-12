"""Shared defaults for DJANGO_SETTINGS_MODULE (Render shell vs local dev)."""

from __future__ import annotations

import os


def default_django_settings_module() -> str:
    """
    Render sets RENDER=true on web services. If DJANGO_SETTINGS_MODULE is unset,
    use production settings there so gunicorn does not accidentally load development.
    """
    render = (os.environ.get("RENDER") or "").strip().lower()
    if render in ("1", "true", "yes", "on"):
        return "config.settings.production"
    return "config.settings.development"
