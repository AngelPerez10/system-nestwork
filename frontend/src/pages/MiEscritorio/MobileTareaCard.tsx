import { PencilIcon, TrashBinIcon } from "../../icons";

interface MobileTareaCardProps {
  tarea: any;
  idx: number;
  startIndex: number;
  formatDate: (date: string) => string;
  onDescripcion: (tarea: any) => void;
  onFotos: (tarea: any) => void;
  onEdit?: (tarea: any) => void;
  onDelete?: (tarea: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  onChangeEstado?: (tarea: any, estado: "TODO" | "EN_PROGRESO" | "HECHO") => void;
}

export function MobileTareaCard({
  tarea,
  idx,
  startIndex,
  formatDate,
  onDescripcion,
  onFotos,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  onChangeEstado,
}: MobileTareaCardProps) {
  const usuarioNombre = tarea.usuario_asignado_full_name || tarea.usuario_asignado_username || "-";
  const initial = usuarioNombre && usuarioNombre !== "-" ? String(usuarioNombre).slice(0, 1).toUpperCase() : "-";
  const fotosCount = Array.isArray(tarea.fotos_urls) ? tarea.fotos_urls.length : 0;

  const currentEstado = (tarea.estado === "BACKLOG" ? "TODO" : (tarea.estado || "TODO")) as "TODO" | "EN_PROGRESO" | "HECHO";

  return (
    <div className="bg-white dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-white/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{tarea.id ?? startIndex + idx + 1}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{formatDate(tarea.fecha_creacion)}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onDescripcion(tarea)}
            className="p-1.5 text-gray-500 hover:text-blue-600"
            title="Descripción"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="M14 2v4h4" />
              <path d="M8 10h8" />
              <path d="M8 14h8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onFotos(tarea)}
            className="p-1.5 text-gray-500 hover:text-blue-600"
            title="Fotos"
          >
            <div className="relative">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              {fotosCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[10px] leading-4 text-center">
                  {fotosCount}
                </span>
              )}
            </div>
          </button>
          {canEdit && onEdit && (
            <button type="button" onClick={() => onEdit(tarea)} className="p-1.5 text-gray-500 hover:text-brand-600" title="Editar">
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
          {canDelete && onDelete && (
            <button type="button" onClick={() => onDelete(tarea)} className="p-1.5 text-gray-500 hover:text-red-600" title="Eliminar">
              <TrashBinIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 text-xs font-semibold">
          {initial}
        </span>
        <div className="min-w-0">
          <div className="font-medium text-gray-900 dark:text-white truncate">{usuarioNombre}</div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">{String(tarea.descripcion || "-")}</div>
        </div>
      </div>

      {onChangeEstado && (
        <div className="pt-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Estado
          </label>
          <select
            value={currentEstado}
            onChange={(e) => onChangeEstado(tarea, e.target.value as "TODO" | "EN_PROGRESO" | "HECHO")}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 outline-none transition-colors focus:border-brand-400 dark:border-white/15 dark:bg-[#151d28] dark:text-gray-200"
          >
            <option value="TODO">Por hacer</option>
            <option value="EN_PROGRESO">En proceso</option>
            <option value="HECHO">Hecho</option>
          </select>
        </div>
      )}
    </div>
  );
}

interface MobileTareaListProps {
  tareas: any[];
  startIndex: number;
  loading: boolean;
  formatDate: (date: string) => string;
  onDescripcion: (tarea: any) => void;
  onFotos: (tarea: any) => void;
  onEdit?: (tarea: any) => void;
  onDelete?: (tarea: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  onChangeEstado?: (tarea: any, estado: "TODO" | "EN_PROGRESO" | "HECHO") => void;
}

export function MobileTareaList({
  tareas,
  startIndex,
  loading,
  formatDate,
  onDescripcion,
  onFotos,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  onChangeEstado,
}: MobileTareaListProps) {
  return (
    <div className="md:hidden space-y-2">
      {tareas.map((tarea, idx) => (
        <MobileTareaCard
          key={tarea.id ?? idx}
          tarea={tarea}
          idx={idx}
          startIndex={startIndex}
          formatDate={formatDate}
          onDescripcion={onDescripcion}
          onFotos={onFotos}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
          onChangeEstado={onChangeEstado}
        />
      ))}
      {!loading && tareas.length === 0 && <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">Sin tareas</div>}
    </div>
  );
}
