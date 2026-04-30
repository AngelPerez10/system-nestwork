import { useRef, useEffect, useState, useCallback } from 'react';
import { validateSignatureUpload } from '../../../utils/fileUpload';
import { useAlertLocal } from '../../../hooks/useAlertLocal';

interface SignaturePadProps {
  value?: string;
  onChange: (signature: string) => void;
  label?: string;
  width?: number;
  height?: number;
  disabled?: boolean;
  onFileUpload?: (file: File) => void;
}

export default function SignaturePad({
  value,
  onChange,
  label,
  width = 400,
  height = 200,
  disabled = false,
  onFileUpload
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { showAlert } = useAlertLocal();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Validate file using security utilities
      const validation = await validateSignatureUpload(file);
      
      if (!validation.isValid) {
        showAlert('error', 'Error al subir firma', validation.error || 'Error al subir firma');
        setIsUploading(false);
        return;
      }

      // Read file as DataURL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onChange(result);
        setIsEmpty(false);
        
        // Call parent callback if provided
        onFileUpload?.(file);
        
        showAlert('success', 'Firma cargada', 'Firma cargada exitosamente');
        setIsUploading(false);
      };
      reader.onerror = () => {
        showAlert('error', 'Error de lectura', 'Error al leer el archivo');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showAlert(
        'error',
        'Error al procesar',
        error instanceof Error ? error.message : 'Error al procesar firma'
      );
      setIsUploading(false);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onChange, onFileUpload, showAlert]);

  const triggerFileInput = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawImageContain = (img: HTMLImageElement) => {
      // Clear first
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) {
        ctx.drawImage(img, 0, 0);
        return;
      }

      const scale = Math.min(cw / iw, ch / ih);
      const w = Math.max(1, Math.floor(iw * scale));
      const h = Math.max(1, Math.floor(ih * scale));
      const x = Math.floor((cw - w) / 2);
      const y = Math.floor((ch - h) / 2);
      ctx.drawImage(img, x, y, w, h);
    };

    // Configurar canvas
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Cargar firma existente
    if (value) {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Allow cross-origin images
      img.onload = () => {
        drawImageContain(img);
        setIsEmpty(false);
      };
      img.src = value;
    }

    // Agregar event listeners nativos para touch con passive: false
    const handleTouchStart = (e: TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.touches[0].clientX - rect.left) * scaleX;
      const y = (e.touches[0].clientY - rect.top) * scaleY;

      setIsDrawing(true);
      setIsEmpty(false);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.touches[0].clientX - rect.left) * scaleX;
      const y = (e.touches[0].clientY - rect.top) * scaleY;

      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      setIsDrawing(false);
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [value, isDrawing, onChange]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Guardar firma como base64
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const clear = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange('');
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      {/* Hidden file input for signature upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className={`border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-white touch-none ${disabled ? 'cursor-not-allowed opacity-75 grayscale-[0.5]' : 'cursor-crosshair'}`}
          style={{ maxWidth: '100%', height: 'auto' }}
        />

        {!isEmpty && !disabled && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              Limpiar
            </button>
            
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={isUploading}
              className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        )}
      </div>

      {isEmpty && (
        <div className="mt-1 flex items-center gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Dibuja tu firma aquí o{' '}
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={disabled || isUploading}
              className="text-orange-600 hover:text-orange-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              sube una imagen
            </button>
          </p>
          {isUploading && (
            <span className="text-xs text-orange-600">Procesando...</span>
          )}
        </div>
      )}

      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        Formatos: PNG, JPG. Máx. 2MB. Mín. 200x50px
      </p>
    </div>
  );
}
