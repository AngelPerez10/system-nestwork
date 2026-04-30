export function CotizacionSaveStatus({
  isAutoSaving,
  lastAutoSavedAt,
}: {
  isAutoSaving: boolean;
  lastAutoSavedAt: number | null;
}) {
  if (!lastAutoSavedAt && !isAutoSaving) return null;
  return (
    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
      {isAutoSaving
        ? "Guardando cambios..."
        : `Borrador guardado: ${new Date(lastAutoSavedAt || Date.now()).toLocaleTimeString("es-MX")}`}
    </p>
  );
}
