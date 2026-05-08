import { useMemo, useState } from "react";

export interface OrdenFormData {
  folio: string;
  cliente_id: number | null;
  contacto_id: number | null;
  cliente: string;
  direccion: string;
  telefono_cliente: string;
  nombre_cliente: string;
  problematica: string;
  servicios_realizados: string[];
  status: "pendiente" | "resuelto";
  comentario_tecnico: string;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_finalizacion: string;
  hora_termino: string;
  nombre_encargado: string;
  tecnico_asignado: number | null;
  quien_instalo: number | null;
  quien_entrego: number | null;
  firma_encargado_url: string;
  firma_cliente_url: string;
  /** URLs firmadas o data URLs para <img src> */
  fotos_urls: string[];
  /** Claves R2 u otros refs persistidos en backend (paralelo a fotos_urls). */
  fotos_refs: string[];
}

interface UseOrdenesFormParams {
  defaultFirmaEncargadoUrl?: string;
}

export const createEmptyOrdenFormData = (defaultFirmaEncargadoUrl = ""): OrdenFormData => ({
  folio: "",
  cliente_id: null,
  contacto_id: null,
  cliente: "",
  direccion: "",
  telefono_cliente: "",
  nombre_cliente: "",
  problematica: "",
  servicios_realizados: [],
  status: "pendiente",
  comentario_tecnico: "",
  fecha_inicio: new Date().toISOString().split("T")[0],
  hora_inicio: "",
  fecha_finalizacion: "",
  hora_termino: "",
  nombre_encargado: "",
  tecnico_asignado: null,
  quien_instalo: null,
  quien_entrego: null,
  firma_encargado_url: defaultFirmaEncargadoUrl,
  firma_cliente_url: "",
  fotos_urls: [],
  fotos_refs: [],
});

export function useOrdenesForm({ defaultFirmaEncargadoUrl = "" }: UseOrdenesFormParams = {}) {
  const [formData, setFormData] = useState<OrdenFormData>(() => createEmptyOrdenFormData(defaultFirmaEncargadoUrl));

  const resetForm = () => {
    setFormData(createEmptyOrdenFormData(defaultFirmaEncargadoUrl));
  };

  const helpers = useMemo(
    () => ({
      resetForm,
    }),
    [defaultFirmaEncargadoUrl],
  );

  return {
    formData,
    setFormData,
    ...helpers,
  };
}
