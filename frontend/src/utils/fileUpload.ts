/**
 * File upload validation utilities for frontend
 * OWASP 2025: A05: Injection - File Upload Vulnerabilities
 */

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const ALLOWED_SIGNATURE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

// Size limits (in bytes)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024; // 2 MB

// Image dimension limits
export const MAX_IMAGE_WIDTH = 4096;
export const MAX_IMAGE_HEIGHT = 4096;

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSize: number): FileValidationResult {
  if (file.size === 0) {
    return { isValid: false, error: 'El archivo está vacío' };
  }
  
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `El archivo excede el tamaño máximo (${(maxSize / 1024 / 1024).toFixed(1)} MB)` 
    };
  }
  
  return { isValid: true };
}

/**
 * Validate file type using MIME type
 */
export function validateFileType(file: File, allowedTypes: string[]): FileValidationResult {
  if (!file.type) {
    return { isValid: false, error: 'No se pudo determinar el tipo de archivo' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Tipo de archivo no permitido (${file.type})` 
    };
  }
  
  return { isValid: true };
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(
  file: File,
  maxWidth: number = MAX_IMAGE_WIDTH,
  maxHeight: number = MAX_IMAGE_HEIGHT
): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      if (img.width > maxWidth || img.height > maxHeight) {
        resolve({
          isValid: false,
          error: `La imagen excede las dimensiones máximas (${maxWidth}x${maxHeight})`
        });
        return;
      }
      
      if (img.width < 100 || img.height < 100) {
        resolve({
          isValid: false,
          error: 'La imagen es muy pequeña (mín: 100x100)'
        });
        return;
      }
      
      resolve({ isValid: true });
    };
    
    img.onerror = () => {
      resolve({ isValid: false, error: 'El archivo de imagen no es válido o está corrupto' });
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate image file (complete validation)
 */
export async function validateImageUpload(file: File): Promise<FileValidationResult> {
  // 1. Validate file size
  const sizeResult = validateFileSize(file, MAX_IMAGE_SIZE);
  if (!sizeResult.isValid) return sizeResult;
  
  // 2. Validate file type
  const typeResult = validateFileType(file, ALLOWED_IMAGE_TYPES);
  if (!typeResult.isValid) return typeResult;
  
  // 3. Validate dimensions
  const dimResult = await validateImageDimensions(file);
  if (!dimResult.isValid) return dimResult;
  
  return { isValid: true };
}

/**
 * Validate signature image (stricter validation)
 */
export async function validateSignatureUpload(file: File): Promise<FileValidationResult> {
  // 1. Validate file size (stricter for signatures)
  const sizeResult = validateFileSize(file, MAX_SIGNATURE_SIZE);
  if (!sizeResult.isValid) return sizeResult;
  
  // 2. Validate file type
  const typeResult = validateFileType(file, ALLOWED_SIGNATURE_TYPES);
  if (!typeResult.isValid) return typeResult;
  
  // 3. Validate dimensions (stricter for signatures)
  const dimResult = await validateImageDimensions(file, 2000, 2000);
  if (!dimResult.isValid) return dimResult;
  
  return { isValid: true };
}

/**
 * Convert File to Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate and convert signature file
 */
export async function handleSignatureFileUpload(file: File): Promise<{ success: boolean; data?: string; error?: string }> {
  // Validate
  const validation = await validateSignatureUpload(file);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }
  
  // Convert to base64
  try {
    const base64 = await fileToBase64(file);
    return { success: true, data: base64 };
  } catch (error) {
    return { 
      success: false, 
      error: 'Error al procesar el archivo de firma' 
    };
  }
}
