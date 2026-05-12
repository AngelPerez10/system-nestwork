/** Máximo de fotos por orden de servicio / levantamiento (debe coincidir con backend). */
export const MAX_FOTOS_POR_ORDEN = 3;

/** Objetivo de tamaño tras comprimir JPEG antes de subir a R2 (KB). */
export const TARGET_FOTO_COMPRESS_KB = 50;

/**
 * Lado mayor máximo al redimensionar (px). Valores más altos = más nitidez;
 * si no se llega al peso objetivo, el compresor baja este valor en pasos.
 */
export const MAX_FOTO_LONG_EDGE_PX = 1680;
