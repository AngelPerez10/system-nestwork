"""
Secure file upload utilities with MIME type validation, size limits, and malware scanning.
OWASP 2025: A05: Injection - File Upload Vulnerabilities
"""
import io
import logging
from typing import Optional, Tuple

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image

logger = logging.getLogger(__name__)

# Allowed MIME types for different file categories
ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
]

ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

ALLOWED_SIGNATURE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
]

# Size limits (in bytes)
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_SIGNATURE_SIZE = 2 * 1024 * 1024  # 2 MB

# Image dimension limits
MAX_IMAGE_WIDTH = 4096
MAX_IMAGE_HEIGHT = 4096
MIN_IMAGE_WIDTH = 100
MIN_IMAGE_HEIGHT = 100


class SecureFileValidator:
    """
    Validates uploaded files for security threats.
    
    Security features:
    - MIME type validation (not just extension)
    - File size limits
    - Image dimension validation
    - Malicious content detection
    - Extension whitelisting
    """
    
    def __init__(
        self,
        allowed_types: list,
        max_size: int,
        validate_dimensions: bool = False,
        max_width: int = MAX_IMAGE_WIDTH,
        max_height: int = MAX_IMAGE_HEIGHT,
    ):
        self.allowed_types = allowed_types
        self.max_size = max_size
        self.validate_dimensions = validate_dimensions
        self.max_width = max_width
        self.max_height = max_height
    
    def validate(self, file: InMemoryUploadedFile) -> Tuple[bool, str]:
        """
        Validate uploaded file.
        
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        # 1. Validate file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > self.max_size:
            logger.warning(
                f"File size exceeded: {file_size} bytes (max: {self.max_size})"
            )
            return False, f"El archivo excede el tamaño máximo permitido ({self.max_size / 1024 / 1024:.1f} MB)"
        
        if file_size == 0:
            logger.warning("Empty file upload attempt")
            return False, "El archivo está vacío"
        
        # 2. Validate extension
        file_extension = self._get_extension(file.name).lower()
        allowed_extensions = self._get_allowed_extensions()
        
        if file_extension not in allowed_extensions:
            logger.warning(
                f"Invalid file extension: {file_extension}"
            )
            return False, f"Tipo de archivo no permitido (.${file_extension})"
        
        # 3. Validate MIME type (CRITICAL - don't trust extension)
        mime_type = self._detect_mime_type(file)
        
        if mime_type not in self.allowed_types:
            logger.warning(
                f"Invalid MIME type: {mime_type} (file: {file.name})"
            )
            return False, "El tipo de archivo no es válido"
        
        # 4. Validate image dimensions if required
        if self.validate_dimensions:
            is_valid, error = self._validate_image_dimensions(file)
            if not is_valid:
                return is_valid, error
        
        # 5. Check for malicious content
        is_valid, error = self._check_malicious_content(file)
        if not is_valid:
            return is_valid, error
        
        return True, ""
    
    def _get_extension(self, filename: str) -> str:
        """Extract file extension from filename."""
        if '.' not in filename:
            return ''
        return filename.split('.')[-1]
    
    def _get_allowed_extensions(self) -> list:
        """Get allowed extensions based on MIME types."""
        extension_map = {
            'image/jpeg': ['jpg', 'jpeg'],
            'image/png': ['png'],
            'image/gif': ['gif'],
            'image/webp': ['webp'],
            'image/svg+xml': ['svg'],
            'application/pdf': ['pdf'],
            'application/msword': ['doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
            'application/vnd.ms-excel': ['xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
        }
        
        extensions = []
        for mime_type in self.allowed_types:
            if mime_type in extension_map:
                extensions.extend(extension_map[mime_type])
        
        return extensions
    
    def _detect_mime_type(self, file: InMemoryUploadedFile) -> str:
        """
        Detect actual MIME type using file magic bytes.
        SECURITY: Don't trust Content-Type header or file extension.
        """
        file.seek(0)
        header = file.read(16)  # Read first 16 bytes
        file.seek(0)  # Reset
        
        # Check magic bytes for common formats
        if header.startswith(b'\xff\xd8\xff'):
            return 'image/jpeg'
        elif header.startswith(b'\x89PNG\r\n\x1a\n'):
            return 'image/png'
        elif header.startswith(b'GIF87a') or header.startswith(b'GIF89a'):
            return 'image/gif'
        elif header.startswith(b'RIFF') and header[8:12] == b'WEBP':
            return 'image/webp'
        elif header.startswith(b'%PDF'):
            return 'application/pdf'
        elif header.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
            return 'application/msword'  # OLE format (doc, xls)
        elif header.startswith(b'PK\x03\x04'):
            # Office Open XML (docx, xlsx) - need to check further
            file.seek(0)
            content = file.read()
            file.seek(0)
            if b'word/' in content:
                return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            elif b'xl/' in content:
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        # Fallback to content-type if magic bytes not recognized
        # WARNING: This is less secure, use only for allowed types
        content_type = file.content_type
        if content_type in self.allowed_types:
            logger.warning(f"MIME type detection fallback to Content-Type: {content_type}")
            return content_type
        
        return 'unknown'
    
    def _validate_image_dimensions(self, file: InMemoryUploadedFile) -> Tuple[bool, str]:
        """Validate image dimensions to prevent DoS attacks."""
        try:
            file.seek(0)
            with Image.open(file) as img:
                width, height = img.size
                
                if width > self.max_width or height > self.max_height:
                    logger.warning(
                        f"Image dimensions too large: {width}x{height} "
                        f"(max: {self.max_width}x{self.max_height})"
                    )
                    return False, f"La imagen excede las dimensiones máximas ({self.max_width}x{self.max_height})"
                
                if width < self.MIN_IMAGE_WIDTH or height < self.MIN_IMAGE_HEIGHT:
                    logger.warning(
                        f"Image dimensions too small: {width}x{height}"
                    )
                    return False, f"La imagen es muy pequeña (mín: {self.MIN_IMAGE_WIDTH}x{self.MIN_IMAGE_HEIGHT})"
                
                # Check for bomb images (decompression bomb)
                img.verify()
                
        except Exception as e:
            logger.error(f"Error validating image: {e}")
            return False, "El archivo de imagen no es válido o está corrupto"
        
        file.seek(0)  # Reset file pointer
        return True, ""
    
    def _check_malicious_content(self, file: InMemoryUploadedFile) -> Tuple[bool, str]:
        """
        Check for malicious content patterns.
        NOTE: For production, integrate with ClamAV or similar antivirus.
        """
        file.seek(0)
        content = file.read(8192)  # Check first 8KB
        file.seek(0)
        
        # Check for PHP tags in non-PHP files (common webshell pattern)
        if b'<?php' in content or b'<?=' in content:
            logger.warning("Potential PHP webshell detected")
            return False, "El archivo contiene contenido sospechoso"
        
        # Check for script tags in images
        if b'<script' in content:
            logger.warning("Potential XSS attack in file")
            return False, "El archivo contiene contenido sospechoso"
        
        # Check for null bytes (path traversal attempt)
        if b'\x00' in content[:1024]:
            logger.warning("Null byte detected in file")
            return False, "El archivo contiene bytes inválidos"
        
        return True, ""


def validate_image_upload(file: InMemoryUploadedFile) -> Tuple[bool, str]:
    """
    Validate image upload with security checks.
    OWASP 2025: A05: Injection
    """
    validator = SecureFileValidator(
        allowed_types=ALLOWED_IMAGE_TYPES,
        max_size=MAX_IMAGE_SIZE,
        validate_dimensions=True,
    )
    return validator.validate(file)


def validate_document_upload(file: InMemoryUploadedFile) -> Tuple[bool, str]:
    """
    Validate document upload with security checks.
    OWASP 2025: A05: Injection
    """
    validator = SecureFileValidator(
        allowed_types=ALLOWED_DOCUMENT_TYPES,
        max_size=MAX_DOCUMENT_SIZE,
        validate_dimensions=False,
    )
    return validator.validate(file)


def validate_signature_upload(file: InMemoryUploadedFile) -> Tuple[bool, str]:
    """
    Validate signature image upload (stricter validation).
    OWASP 2025: A05: Injection
    """
    validator = SecureFileValidator(
        allowed_types=ALLOWED_SIGNATURE_TYPES,
        max_size=MAX_SIGNATURE_SIZE,
        validate_dimensions=True,
        max_width=2000,  # Smaller max for signatures
        max_height=2000,
    )
    return validator.validate(file)
