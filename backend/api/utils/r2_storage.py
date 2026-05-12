"""
Cloudflare R2 (S3-compatible) uploads with tenant-prefixed object keys.

Keys always start with ``{schema_name}/`` so cross-tenant access can be rejected.
"""

from __future__ import annotations

import base64
import binascii
import io
import logging
import re
import uuid
from typing import BinaryIO, Iterable

from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile

from api.modules.users.services import tenant_schema_name
from api.utils.constants import R2_SIGNED_URL_EXPIRES
from api.utils.file_upload import validate_image_upload

logger = logging.getLogger(__name__)


def r2_enabled() -> bool:
    return bool(
        getattr(settings, "R2_BUCKET_NAME", "")
        and getattr(settings, "R2_ACCESS_KEY_ID", "")
        and getattr(settings, "R2_SECRET_ACCESS_KEY", "")
        and getattr(settings, "R2_ACCOUNT_ID", "")
    )


def _endpoint_url() -> str:
    account = getattr(settings, "R2_ACCOUNT_ID", "").strip()
    return f"https://{account}.r2.cloudflarestorage.com"


def _client():
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=_endpoint_url(),
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def tenant_object_prefix() -> str:
    schema = tenant_schema_name().strip()
    if not schema or schema == "public":
        raise PermissionError("Uploads are not allowed from this host/schema.")
    return schema


def _assert_key_belongs_to_tenant(key: str) -> None:
    prefix = tenant_object_prefix() + "/"
    k = (key or "").strip()
    if not k.startswith(prefix):
        raise PermissionError("Object key does not belong to this tenant.")


def upload_image_for_tenant(
    *,
    file_obj: InMemoryUploadedFile | None = None,
    folder: str,
    original_name: str = "photo.jpg",
) -> tuple[str, str]:
    """
    Upload image bytes to R2. Returns (object_key, presigned_get_url).
    """
    if not r2_enabled():
        raise RuntimeError("R2 is not configured (missing env vars).")

    if file_obj is None:
        raise ValueError("No file provided.")

    ok, err = validate_image_upload(file_obj)
    if not ok:
        raise ValueError(err)

    ext = _guess_extension(file_obj.name or original_name, file_obj.content_type or "")
    safe_folder = re.sub(r"[^a-zA-Z0-9_\-/]+", "_", folder.strip("/")).strip("_") or "uploads"
    key = f"{tenant_object_prefix()}/{safe_folder}/{uuid.uuid4().hex}.{ext}"

    file_obj.seek(0)
    body: BinaryIO = file_obj
    extra = {}
    ct = (file_obj.content_type or "").strip()
    if ct:
        extra["ContentType"] = ct

    client = _client()
    bucket = settings.R2_BUCKET_NAME
    client.put_object(Bucket=bucket, Key=key, Body=body.read(), **extra)

    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=R2_SIGNED_URL_EXPIRES,
    )
    return key, url


def delete_object_for_tenant(key: str) -> None:
    if not r2_enabled():
        return
    _assert_key_belongs_to_tenant(key)
    client = _client()
    client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key.strip())


def is_r2_storage_ref(ref: str) -> bool:
    """True if ``ref`` is an object key we store in R2 (not a URL or data URL)."""
    s = (ref or "").strip()
    if not s:
        return False
    return not (
        s.startswith("http://") or s.startswith("https://") or s.startswith("data:")
    )


def delete_tenant_photo_refs(refs: Iterable[str]) -> None:
    """
    Best-effort delete for stored object keys. Skips legacy URLs and logs failures.
    """
    if not r2_enabled():
        return
    for ref in refs:
        s = (ref or "").strip()
        if not is_r2_storage_ref(s):
            continue
        try:
            delete_object_for_tenant(s)
        except PermissionError:
            logger.warning("R2 delete permission denied for key=%s", s)
        except Exception as exc:
            logger.warning("R2 delete failed for key=%s: %s", s, exc)


def signed_url_for_key(key: str, expires: int | None = None) -> str:
    if not r2_enabled():
        raise RuntimeError("R2 is not configured.")
    _assert_key_belongs_to_tenant(key)
    client = _client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET_NAME, "Key": key.strip()},
        ExpiresIn=expires or R2_SIGNED_URL_EXPIRES,
    )


def expand_photo_ref(ref: str) -> str:
    """
    Turn a stored ref into a URL suitable for <img src>.
    Legacy: https://... or data:image/... returned as-is.
    """
    s = (ref or "").strip()
    if not s:
        return ""
    if s.startswith("http://") or s.startswith("https://") or s.startswith("data:"):
        return s
    try:
        return signed_url_for_key(s)
    except Exception as exc:
        logger.warning("Could not sign photo ref: %s", exc)
        return s


def data_url_to_in_memory_file(data_url: str, name: str = "upload.jpg") -> InMemoryUploadedFile:
    raw = (data_url or "").strip()
    if not raw.startswith("data:image/"):
        raise ValueError("Invalid image data URL")
    try:
        header, b64 = raw.split(",", 1)
    except ValueError as exc:
        raise ValueError("Malformed data URL") from exc
    mime = "image/jpeg"
    if ";base64" in header:
        mime_part = header[5 : header.index(";")]
        mime = mime_part.strip() or mime
    try:
        payload = base64.b64decode(b64, validate=False)
    except binascii.Error as exc:
        raise ValueError("Invalid base64 image") from exc
    buf = io.BytesIO(payload)
    return InMemoryUploadedFile(
        buf,
        field_name="image",
        name=name,
        content_type=mime,
        size=len(payload),
        charset=None,
    )


def _guess_extension(filename: str, content_type: str) -> str:
    fn = (filename or "").lower()
    for ext in ("jpg", "jpeg", "png", "gif", "webp"):
        if fn.endswith(f".{ext}"):
            return "jpg" if ext == "jpeg" else ext
    ct = (content_type or "").lower()
    if "png" in ct:
        return "png"
    if "webp" in ct:
        return "webp"
    if "gif" in ct:
        return "gif"
    return "jpg"
