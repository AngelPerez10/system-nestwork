"""Serialize orden photo fields: storage refs vs signed display URLs."""

from __future__ import annotations

from typing import Any

from api.utils.constants import MAX_FOTOS_POR_ORDEN
from api.utils.r2_storage import expand_photo_ref


def migrate_row_fotos_refs(row: dict[str, Any]) -> None:
    """Ensure ``fotos_refs`` exists (migrate legacy ``fotos_urls`` storage)."""
    if isinstance(row.get("fotos_refs"), list):
        return
    fu = row.get("fotos_urls")
    if isinstance(fu, list):
        row["fotos_refs"] = list(fu)
    else:
        row["fotos_refs"] = []


def normalize_fotos_refs_list(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        if isinstance(item, str) and item.strip():
            out.append(item.strip())
    return out


def assert_max_fotos(refs: list[str]) -> None:
    if len(refs) > MAX_FOTOS_POR_ORDEN:
        raise ValueError(f"Máximo {MAX_FOTOS_POR_ORDEN} fotos por orden.")


def orden_public_dict(row: dict[str, Any]) -> dict[str, Any]:
    """API shape: ``fotos_refs`` canonical, ``fotos_urls`` expanded for <img>."""
    data = dict(row)
    migrate_row_fotos_refs(data)
    refs = normalize_fotos_refs_list(data.get("fotos_refs"))
    data["fotos_refs"] = refs
    data["fotos_urls"] = [expand_photo_ref(r) for r in refs]
    data.pop("fotos_urls_storage", None)
    return data


def strip_legacy_fotos_urls_from_store(row: dict[str, Any]) -> None:
    """Persist only ``fotos_refs`` in cache payload."""
    row.pop("fotos_urls", None)
