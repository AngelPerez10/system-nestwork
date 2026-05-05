export interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  activo?: boolean;
}

export interface Orden {
  id: number;
  idx: number;
  folio?: string | null;
  cliente_id: number | null;
  cliente: string;
  direccion: string;
  telefono_cliente: string;
  problematica: string;
  servicios_realizados: string[];
  status: "pendiente" | "resuelto";
  comentario_tecnico: string;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_finalizacion: string;
  hora_termino: string;
  nombre_encargado: string;
  nombre_cliente: string;
  tecnico_asignado?: number | null;
  quien_instalo?: number | null;
  quien_entrego?: number | null;
  tecnico_asignado_username?: string;
  tecnico_asignado_full_name?: string;
  firma_encargado_url: string;
  firma_cliente_url: string;
  fotos_urls: string[];
  pdf_url?: string;
  fecha_creacion: string;
  tipo_orden?: "servicio_tecnico" | "levantamiento" | string;
}

export interface Usuario {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}
