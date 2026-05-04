import { useState, useEffect, useRef } from "react";

import PageMeta from "@/components/common/PageMeta";
import { Link } from "react-router-dom";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { apiUrl } from "@/config/api";
import { PencilIcon, TrashBinIcon } from "@/icons";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import type { Cliente, ClienteContacto } from "@/types/cliente";

import {
  estadosPorPais,
  formatPhoneE164,
  onlyDigits10,
  paisOptions,
  parsePhoneToForm,
} from "./clientesCatalogos";

const cardShellClass =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

const searchInputClass =
  "min-h-[44px] w-full rounded-2xl border border-[#e2d9ca] bg-[#fffdf8] py-2 pl-10 pr-10 text-sm text-[#1c1917] outline-none transition-all placeholder:text-[#7c7a74] focus:border-[#ff801f]/60 focus:ring-4 focus:ring-[#ff801f]/12 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c]/70 dark:focus:ring-[#fb923c]/20 sm:min-h-[46px] sm:pl-11";

const claudeHeroHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.85rem,2.8vw,2.6rem)] font-medium leading-[1.2] tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc]";

const claudeSectionHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.4rem,2vw,2rem)] font-medium leading-[1.2] text-gray-900 dark:text-white";

const claudeBodyClass =
  "text-base font-normal leading-[1.6] text-[#57534e] dark:text-[#b7c1d1]";

const claudeCaptionClass = "text-sm font-normal leading-relaxed text-[#57534e] dark:text-[#8ea0b8]";

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

const claudeSansStyle = { fontFamily: "Outfit, sans-serif" } as const;

const claudeLabelClass =
  "[font-family:'Arial','Helvetica_Neue',Helvetica,sans-serif] text-xs font-medium leading-[1.6] tracking-[0.12px]";

const modalPanelClass =
  "rounded-2xl border border-[#ecdcc8] bg-[#fffdfa] p-4 shadow-[0_18px_40px_-28px_rgba(28,25,23,0.35)] dark:border-[#334155] dark:bg-[#0f172a]/80 sm:p-5";

const modalSectionTitleClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b7b69] dark:text-[#8ea0b8]";

const modalTextareaClass =
  "w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 py-2 text-sm text-[#1c1917] shadow-theme-xs outline-none transition-colors placeholder:text-[#78716c] focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20 resize-none";

const modalTabBaseClass = `rounded-xl px-3.5 py-2.5 ${claudeLabelClass} transition-all`;

let clientesPagePermissionsInFlight: Promise<any> | null = null;
let clientesPagePermissionsLastFetchAt = 0;
const CLIENTES_PAGE_PERMS_TTL_MS = 2 * 60 * 1000;

const selectLikeClassName =
  "h-10 w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 text-sm text-[#1c1917] outline-none transition-colors focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20";

const formatApiErrors = (txt: string) => {
  if (!txt) return "";
  try {
    const data = JSON.parse(txt);
    if (data && typeof data === 'object') {
      return Object.entries(data)
        .map(([k, v]) => {
          if (Array.isArray(v)) return `${k}: ${v.join(', ')}`;
          if (typeof v === 'string') return `${k}: ${v}`;
          return `${k}: ${JSON.stringify(v)}`;
        })
        .join("\n");
    }
  } catch {
    // ignore
  }
  return txt;
};

const isGoogleMapsLink = (value: string | null | undefined) => {
  if (!value) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (!(s.startsWith('http://') || s.startsWith('https://'))) return false;
  try {
    const u = new URL(s);
    const host = (u.hostname || '').toLowerCase();
    const href = u.href.toLowerCase();
    if (host === 'maps.app.goo.gl') return true;
    if (host.endsWith('google.com') && href.includes('/maps')) return true;
    return false;
  } catch {
    return false;
  }
};

type ClienteTipo = 'EMPRESA' | 'PERSONA_FISICA' | 'PROVEEDOR';

const trimOrEmpty = (value: unknown) => String(value ?? "").trim();
const toNumberOr = (value: unknown, fallback: number | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildClientePayload = (
  formData: any,
  fixedTipo?: ClienteTipo
): Record<string, unknown> => ({
  no_cliente: trimOrEmpty(formData.no_cliente),
  clave: trimOrEmpty(formData.clave),
  representante: trimOrEmpty(formData.representante),
  nombre: trimOrEmpty(formData.nombre),
  telefono: formatPhoneE164(formData.telefono_pais, formData.telefono),
  celular: trimOrEmpty(formData.celular),
  direccion: trimOrEmpty(formData.direccion),
  correo: trimOrEmpty(formData.correo),
  calle: trimOrEmpty(formData.calle),
  numero_exterior: trimOrEmpty(formData.numero_exterior),
  interior: trimOrEmpty(formData.interior),
  colonia: trimOrEmpty(formData.colonia),
  codigo_postal: trimOrEmpty(formData.codigo_postal),
  ciudad: trimOrEmpty(formData.ciudad),
  pais: trimOrEmpty(formData.pais),
  estado: trimOrEmpty(formData.estado),
  localidad: trimOrEmpty(formData.localidad),
  municipio: trimOrEmpty(formData.municipio),
  rfc: trimOrEmpty(formData.rfc),
  curp: trimOrEmpty(formData.curp),
  notas: trimOrEmpty(formData.notas),
  aplica_retenciones: !!formData.aplica_retenciones,
  desglosar_ieps: !!formData.desglosar_ieps,
  numero_precio: trimOrEmpty(formData.numero_precio || "1"),
  limite_credito: toNumberOr(formData.limite_credito, 0),
  dias_credito: toNumberOr(formData.dias_credito, 0),
  descuento_pct: toNumberOr(formData.descuento_pct, null),
  portal_web: trimOrEmpty(formData.portal_web),
  nombre_facturacion: trimOrEmpty(formData.nombre_facturacion),
  numero_facturacion: trimOrEmpty(formData.numero_facturacion),
  domicilio_facturacion: trimOrEmpty(formData.domicilio_facturacion),
  calle_envio: trimOrEmpty(formData.calle_envio),
  numero_envio: trimOrEmpty(formData.numero_envio),
  colonia_envio: trimOrEmpty(formData.colonia_envio),
  codigo_postal_envio: trimOrEmpty(formData.codigo_postal_envio),
  pais_envio: trimOrEmpty(formData.pais_envio),
  estado_envio: trimOrEmpty(formData.estado_envio),
  ciudad_envio: trimOrEmpty(formData.ciudad_envio),
  tipo: fixedTipo || formData.tipo || "EMPRESA",
  is_prospecto: !!formData.is_prospecto,
});

const getNoClienteLabelByTipo = (tipo?: ClienteTipo) => {
  if (tipo === "EMPRESA") return "No. de Empresa";
  if (tipo === "PERSONA_FISICA") return "No. de Persona";
  if (tipo === "PROVEEDOR") return "No. de Proveedor";
  return "No. de Cliente";
};

type ClientesPageProps = {
  fixedTipo?: ClienteTipo;
};

const ClientesPage = ({ fixedTipo }: ClientesPageProps) => {
  const viewPlural = fixedTipo === 'EMPRESA'
    ? 'Empresas'
    : fixedTipo === 'PROVEEDOR'
      ? 'Proveedores'
      : fixedTipo === 'PERSONA_FISICA'
        ? 'Personas Físicas'
        : 'Clientes';

  const viewSingular = fixedTipo === 'EMPRESA'
    ? 'Empresa'
    : fixedTipo === 'PROVEEDOR'
      ? 'Proveedor'
      : fixedTipo === 'PERSONA_FISICA'
        ? 'Persona Física'
        : 'Cliente';

  const nombreColHeader = fixedTipo === 'EMPRESA'
    ? 'Empresa'
    : fixedTipo === 'PROVEEDOR'
      ? 'Proveedor'
      : fixedTipo === 'PERSONA_FISICA'
        ? 'Persona'
        : 'Empresa';

  const noClienteLabel = getNoClienteLabelByTipo(fixedTipo);

  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());

  const canClientesView = permissions?.clientes?.view !== false;
  const canClientesCreate = !!permissions?.clientes?.create;
  const canClientesEdit = !!permissions?.clientes?.edit;
  const canClientesDelete = !!permissions?.clientes?.delete;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const clientesFetchInFlightRef = useRef(false);
  const lastClientesFetchKeyRef = useRef<string>("");
  const clientesRequestSeqRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Alert state
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  // Form state
  const [activeTab, setActiveTab] = useState<"general" | "more">("general");
  const [modalError, setModalError] = useState<string>("");
  const [, setDocumentFile] = useState<File | null>(null);
  const [, setDeletedContactIds] = useState<number[]>([]);
  const [, setContactos] = useState<ClienteContacto[]>([
    { nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" },
  ]);

  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const zoomRef = useRef<number>(15);
  const mapContainerId = "clientes-leaflet-map";

  const [formData, setFormData] = useState<any>({
    nombre: "",
    telefono_pais: "MX",
    telefono: "",
    direccion: "",

    correo: "",
    calle: "",
    numero_exterior: "",
    interior: "",
    colonia: "",
    codigo_postal: "",
    ciudad: "",
    pais: "México",
    estado: "",
    localidad: "",
    municipio: "",
    rfc: "",
    curp: "",
    aplica_retenciones: false,
    desglosar_ieps: false,
    numero_precio: "1",
    limite_credito: "",
    dias_credito: "",
    notas: "",
    descuento_pct: null,

    portal_web: "",
    nombre_facturacion: "",
    numero_facturacion: "",
    domicilio_facturacion: "",

    calle_envio: "",
    numero_envio: "",
    colonia_envio: "",
    codigo_postal_envio: "",
    pais_envio: "México",
    estado_envio: "",
    ciudad_envio: "",
    tipo: fixedTipo || "EMPRESA",
    is_prospecto: false,
  });

  useEffect(() => {
    if (!fixedTipo) return;
    setFormData((prev: any) => ({ ...prev, tipo: fixedTipo }));
  }, [fixedTipo]);

  const estadosOptions = estadosPorPais[formData.pais || "México"] || estadosPorPais["México"] || [];
  const getToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };

  useEffect(() => {
    if (!showMapModal) {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { }
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const initFromDireccion = () => {
      const d = (formData.direccion || '').trim();
      const m = d.match(/q=([\-\d\.]+),([\-\d\.]+)/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setSelectedLocation({ lat, lng });
          return true;
        }
      }
      const m2 = d.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (m2) {
        const lat = parseFloat(m2[1]);
        const lng = parseFloat(m2[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setSelectedLocation({ lat, lng });
          return true;
        }
      }
      return false;
    };

    const ensureLeaflet = async () => {
      const w: any = window as any;
      if (w.L) return w.L;
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }
      await new Promise<void>((resolve, reject) => {
        if (document.getElementById('leaflet-js')) return resolve();
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Leaflet load error'));
        document.body.appendChild(script);
      });
      return (window as any).L;
    };

    (async () => {
      try {
        const L = await ensureLeaflet();

        const had = initFromDireccion();
        if (!had && !selectedLocation) {
          setSelectedLocation({ lat: 19.0653, lng: -104.2831 });
        }

        const container = document.getElementById(mapContainerId);
        if (!container) return;

        const center = selectedLocation || { lat: 19.0653, lng: -104.2831 };
        const map = L.map(container).setView([center.lat, center.lng], zoomRef.current || 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        map.on('zoomend', () => {
          try { zoomRef.current = map.getZoom(); } catch { }
        });
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setSelectedLocation({ lat, lng });
        });
        mapRef.current = map;

        if (selectedLocation) {
          markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
        }
      } catch {
        setAlert({ show: true, variant: 'error', title: 'Error de mapa', message: 'No se pudo cargar el mapa interactivo.' });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      }
    })();
  }, [showMapModal]);

  useEffect(() => {
    const L: any = (window as any).L;
    if (!mapRef.current || !selectedLocation || !L) return;
    const map = mapRef.current;
    const currentZoom = typeof zoomRef.current === 'number' ? zoomRef.current : map.getZoom?.() || 15;
    map.setView([selectedLocation.lat, selectedLocation.lng], currentZoom);
    if (markerRef.current) {
      markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
    } else {
      markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
    }
  }, [selectedLocation]);

  useEffect(() => {
    const sync = () => setPermissions(getPermissionsFromStorage());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const now = Date.now();
    if (now - clientesPagePermissionsLastFetchAt < CLIENTES_PAGE_PERMS_TTL_MS) return;

    try {
      const storedAtRaw = localStorage.getItem('permissions_fetched_at') || sessionStorage.getItem('permissions_fetched_at');
      const storedAt = storedAtRaw ? Number(storedAtRaw) : 0;
      if (storedAt && now - storedAt < CLIENTES_PAGE_PERMS_TTL_MS) {
        return;
      }
    } catch { }

    const load = async () => {
      try {
        if (clientesPagePermissionsInFlight) {
          await clientesPagePermissionsInFlight;
          return;
        }

        clientesPagePermissionsLastFetchAt = Date.now();
        clientesPagePermissionsInFlight = (async () => {
          const res = await fetch(apiUrl('/api/me/permissions/'), {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store' as RequestCache,
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) return data;

          const p = JSON.stringify(data?.permissions || {});
          localStorage.setItem('permissions', p);
          sessionStorage.setItem('permissions', p);
          const at = String(Date.now());
          localStorage.setItem('permissions_fetched_at', at);
          sessionStorage.setItem('permissions_fetched_at', at);
          setPermissions(data?.permissions || {});
          window.dispatchEvent(new Event('permissions:updated'));
          return data;
        })();

        await clientesPagePermissionsInFlight;
      } catch {
        // ignore
      } finally {
        clientesPagePermissionsInFlight = null;
      }
    };
    load();
  }, []);

  const fetchClientes = async (page = 1, search = "") => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const requestSeq = ++clientesRequestSeqRef.current;
    try {
      const query = new URLSearchParams({
        page: String(page),
        search: search.trim(),
        ordering: 'idx',
      });
      if (fixedTipo) query.set('tipo', fixedTipo);
      const res = await fetch(apiUrl(`/api/clientes/?${query.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => ({ results: [], count: 0 }));
      if (requestSeq !== clientesRequestSeqRef.current) return;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Sesión o permisos",
            message: "No tienes permiso para consultar clientes de este espacio.",
          });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3500);
        }
        setClientes([]);
        setTotalCount(0);
        return;
      }
      if (data && data.results) {
        setClientes(data.results);
        setTotalCount(data.count || 0);
      } else {
        setClientes([]);
        setTotalCount(0);
      }
    } catch {
      if (requestSeq !== clientesRequestSeqRef.current) return;
      setClientes([]);
      setTotalCount(0);
    } finally {
      if (requestSeq !== clientesRequestSeqRef.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canClientesView) {
      setLoading(false);
      return;
    }
    const key = `${currentPage}::${debouncedSearch.trim()}::${fixedTipo || ''}`;
    if (clientesFetchInFlightRef.current && lastClientesFetchKeyRef.current === key) return;
    lastClientesFetchKeyRef.current = key;
    clientesFetchInFlightRef.current = true;
    Promise.resolve(fetchClientes(currentPage, debouncedSearch)).finally(() => {
      clientesFetchInFlightRef.current = false;
    });
  }, [canClientesView, currentPage, debouncedSearch, fixedTipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!editingCliente && !canClientesCreate) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }

    if (editingCliente && !canClientesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }

    // Validación de campos requeridos
    const missingFields: string[] = [];
    if (!formData.nombre?.trim()) missingFields.push('Empresa');
    if (!formData.telefono?.trim() || !onlyDigits10(formData.telefono)) missingFields.push('Teléfono (10 dígitos)');

    if (missingFields.length > 0) {
      setModalError(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
      return;
    }

    const token = getToken();
    if (!token) {
      setModalError("Sesión inválida. Inicia sesión de nuevo.");
      return;
    }
    const url = editingCliente ? apiUrl(`/api/clientes/${editingCliente.id}/`) : apiUrl('/api/clientes/');
    const method = editingCliente ? 'PUT' : 'POST';
    const clienteNombre = formData.nombre;
    const isEditing = !!editingCliente;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildClientePayload(formData, fixedTipo)),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setModalError("No autorizado para crear/editar clientes en esta empresa.");
          return;
        }
        const txt = await response.text().catch(() => '');
        setModalError(formatApiErrors(txt) || 'No se pudo guardar el cliente.');
        return;
      }

      const saved = await response.json().catch(() => null);
      const clienteId = saved?.id || editingCliente?.id;
      if (!clienteId) {
        setModalError('No se pudo obtener el ID del cliente guardado.');
        return;
      }

      await fetchClientes(currentPage, debouncedSearch);
      setShowModal(false);
      setFormData({
        nombre: "",
        telefono_pais: "MX",
        telefono: "",
        direccion: "",
        correo: "",
        calle: "",
        numero_exterior: "",
        interior: "",
        colonia: "",
        codigo_postal: "",
        ciudad: "",
        pais: "México",
        estado: "",
        notas: "",
        descuento_pct: null,
        portal_web: "",
        nombre_facturacion: "",
        numero_facturacion: "",
        domicilio_facturacion: "",
        calle_envio: "",
        numero_envio: "",
        colonia_envio: "",
        codigo_postal_envio: "",
        pais_envio: "México",
        estado_envio: "",
        ciudad_envio: "",
        tipo: fixedTipo || "EMPRESA",
        is_prospecto: false,
        numero_precio: "1",
      });
      setContactos([{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]);
      setDeletedContactIds([]);
      setDocumentFile(null);
      setActiveTab('general');
      setEditingCliente(null);

      setAlert({
        show: true,
        variant: 'success',
        title: isEditing ? 'Cliente Actualizado' : 'Cliente Creado',
        message: isEditing
          ? `El cliente "${clienteNombre}" ha sido actualizado exitosamente.`
          : `El cliente "${clienteNombre}" ha sido creado exitosamente.`,
      });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setModalError(String(error));
    }
  };

  const handleDeleteClick = (cliente: Cliente) => {
    if (!canClientesDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setClienteToDelete(cliente);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return;
    const token = getToken();
    if (!token) {
      setAlert({ show: true, variant: "error", title: "Sesión inválida", message: "Inicia sesión nuevamente." });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      return;
    }
    try {
      const response = await fetch(apiUrl(`/api/clientes/${clienteToDelete.id}/`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.status === 401 || response.status === 403) {
        setAlert({
          show: true,
          variant: "error",
          title: "No autorizado",
          message: "No puedes eliminar clientes fuera de tus permisos o empresa.",
        });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
        return;
      }
      if (response.ok) {
        await fetchClientes(currentPage, debouncedSearch);
        setShowDeleteModal(false);
        setAlert({
          show: true,
          variant: "success",
          title: "Cliente Eliminado",
          message: `El cliente "${clienteToDelete?.nombre}" ha sido eliminado exitosamente.`
        });
        setClienteToDelete(null);
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setClienteToDelete(null);
  };

  const handleEdit = (cliente: Cliente) => {
    if (!canClientesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingCliente(cliente);
    setModalError("");
    setActiveTab("general");
    setDeletedContactIds([]);
    setDocumentFile(null);

    const phoneParsed = parsePhoneToForm(cliente.telefono);
    setFormData({
      ...formData,
      nombre: cliente.nombre || "",
      telefono_pais: phoneParsed.phoneCountry,
      telefono: phoneParsed.phoneNational,
      direccion: cliente.direccion || "",
      correo: cliente.correo || "",
      calle: cliente.calle || "",
      numero_exterior: cliente.numero_exterior || "",
      interior: cliente.interior || "",
      colonia: cliente.colonia || "",
      codigo_postal: cliente.codigo_postal || "",
      ciudad: cliente.ciudad || "",
      pais: cliente.pais || "México",
      estado: cliente.estado || "",
      notas: cliente.notas || "",
      descuento_pct: cliente.descuento_pct ?? null,
      portal_web: cliente.portal_web || "",
      nombre_facturacion: cliente.nombre_facturacion || "",
      numero_facturacion: cliente.numero_facturacion || "",
      domicilio_facturacion: cliente.domicilio_facturacion || "",
      calle_envio: cliente.calle_envio || "",
      numero_envio: cliente.numero_envio || "",
      colonia_envio: cliente.colonia_envio || "",
      codigo_postal_envio: cliente.codigo_postal_envio || "",
      pais_envio: cliente.pais_envio || "México",
      estado_envio: cliente.estado_envio || "",
      ciudad_envio: cliente.ciudad_envio || "",
      tipo: fixedTipo || cliente.tipo || "EMPRESA",
      is_prospecto: cliente.is_prospecto || false,
      numero_precio: cliente.numero_precio || "1",
    });

    const cs = (cliente.contactos || []).map((c: any) => ({
      id: c.id,
      nombre_apellido: c.nombre_apellido || "",
      titulo: c.titulo || "",
      area_puesto: c.area_puesto || "",
      celular: c.celular || "",
      correo: c.correo || "",
      is_principal: c.is_principal,
    }));
    setContactos(cs.length ? cs : [{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setModalError("");
    setActiveTab("general");
    setDeletedContactIds([]);
    setDocumentFile(null);
    setContactos([{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]);
    setFormData({
      nombre: "",
      telefono_pais: "MX",
      telefono: "",
      direccion: "",
      correo: "",
      calle: "",
      numero_exterior: "",
      interior: "",
      colonia: "",
      codigo_postal: "",
      ciudad: "",
      pais: "México",
      estado: "",
      notas: "",
      descuento_pct: null,
      portal_web: "",
      nombre_facturacion: "",
      numero_facturacion: "",
      domicilio_facturacion: "",
      calle_envio: "",
      numero_envio: "",
      colonia_envio: "",
      codigo_postal_envio: "",
      pais_envio: "México",
      estado_envio: "",
      ciudad_envio: "",
      tipo: fixedTipo || "EMPRESA",
      is_prospecto: false,
      numero_precio: "1",
    });
  };

  const openCreate = () => {
    setEditingCliente(null);
    setModalError("");
    setActiveTab("general");
    setDeletedContactIds([]);
    setDocumentFile(null);
    setContactos([{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]);
    setFormData({
      nombre: "",
      telefono_pais: "MX",
      telefono: "",
      direccion: "",
      correo: "",
      calle: "",
      numero_exterior: "",
      interior: "",
      colonia: "",
      codigo_postal: "",
      ciudad: "",
      pais: "México",
      estado: "",
      notas: "",
      descuento_pct: null,
      portal_web: "",
      nombre_facturacion: "",
      numero_facturacion: "",
      domicilio_facturacion: "",
      calle_envio: "",
      numero_envio: "",
      colonia_envio: "",
      codigo_postal_envio: "",
      pais_envio: "México",
      estado_envio: "",
      ciudad_envio: "",
      tipo: fixedTipo || "EMPRESA",
      is_prospecto: false,
      numero_precio: "1",
    });
    setShowModal(true);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClientes = clientes;



  const handleConfirmMap = () => {
    if (!selectedLocation) {
      setShowMapModal(false);
      return;
    }
    const { lat, lng } = selectedLocation;
    setFormData({ ...formData, direccion: `https://www.google.com/maps?q=${lat},${lng}` });
    setShowMapModal(false);
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
      <div
        className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-5 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-6 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]"
        style={claudeSansStyle}
      >
        <PageMeta
          title={`${viewPlural} | Sistema Grupo Intrax GPS`}
          description={`Gestión de ${viewPlural.toLowerCase()} para el sistema de administración Grupo Intrax GPS`}
        />

        {alert.show && (
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            showLink={false}
          />
        )}

        {!canClientesView ? (
          <div className="rounded-3xl border border-[#e7ded0] bg-[#fffdfa] px-4 py-10 text-center text-sm text-[#57534e] shadow-[0_20px_50px_-36px_rgba(28,25,23,0.2)] dark:border-[#273244] dark:bg-[#111827]/80 dark:text-[#b7c1d1] sm:px-6">
            No tienes permiso para ver {viewPlural}.
          </div>
        ) : (
          <>
            <nav
              className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]"
              aria-label="Migas de pan"
            >
              <Link
                to="/"
                className="rounded-md px-1.5 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
              >
                Inicio
              </Link>
              <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
                /
              </span>
              <span className="text-[#44403c] dark:text-[#cbd5e1]">{viewPlural}</span>
            </nav>

            <header className={`relative flex w-full flex-col gap-4 ${cardShellClass} p-4 sm:p-6`}>
              <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6" />
              <div className="relative z-[1] flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.3995 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.3995 6.75 6.5Z"
                      fill="currentColor"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.25 18.5714C4.25 15.6325 6.63249 13.25 9.57143 13.25H14.4286C17.3675 13.25 19.75 15.6325 19.75 18.5714C19.75 20.8792 17.8792 22.75 15.5714 22.75H8.42857C6.12081 22.75 4.25 20.8792 4.25 18.5714Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]">
                    Contactos de negocio
                  </p>
                  <h1 className={`mt-0.5 ${claudeHeroHeadingClass}`}>{viewPlural}</h1>
                  <p className={`mt-1 max-w-2xl ${claudeBodyClass}`}>
                    Consulta, crea y edita registros con{" "}
                    <span className="font-medium text-[#ea580c] dark:text-[#fb923c]">contactos</span>, dirección y datos fiscales.
                  </p>
                  <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
                </div>
              </div>
            </header>

            <div className="grid w-full grid-cols-1 gap-2 sm:gap-3 lg:max-w-md">
              <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#273244] dark:bg-[#111a2b]/90 sm:p-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-white/90 text-[#ea580c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#fb923c] sm:h-10 sm:w-10">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                      <path d="M20 22a8 8 0 1 0-16 0" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]">
                      Total {viewPlural}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-xl">{totalCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
              <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#64748b] sm:left-3.5"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Buscar ${viewPlural.toLowerCase()}…`}
                  className={searchInputClass}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!canClientesCreate) {
                    setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para crear clientes." });
                    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
                    return;
                  }
                  openCreate();
                }}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff801f] px-5 py-2.5 text-sm font-semibold text-black shadow-none transition-colors hover:bg-[#ff6a00] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/35 active:brightness-95 sm:w-auto sm:min-h-0 lg:shrink-0"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Nuevo {viewSingular}
              </button>
            </div>

            <div className="mt-1">
              <ComponentCard
                compact
                title={`Listado de ${viewPlural.toLowerCase()}`}
                desc="En pantallas pequeñas desplázate horizontalmente para ver todas las columnas."
                className="overflow-hidden border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)]"
              >
                <p className="mb-2 flex items-center gap-1.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8] sm:hidden">
                  <span className="inline-block h-px w-4 bg-[#ea580c]/70 dark:bg-[#fb923c]/70" aria-hidden />
                  Desliza horizontalmente para ver el listado completo
                </p>
                <div className="-mx-1 overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fcfaf6]/90 dark:border-[#273244] dark:bg-[#0f172a]/50 sm:mx-0 sm:bg-transparent sm:dark:bg-transparent">
                  <div className="touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] px-1 pb-1 sm:px-0 sm:pb-0">
                    <Table className="w-full min-w-[920px] table-fixed sm:min-w-0 xl:min-w-full">
                      <TableHeader className="sticky top-0 z-10 border-b border-[#e7ded0] bg-[#fcfaf6]/95 text-[11px] font-semibold text-[#1c1917] dark:border-[#334155] dark:bg-[#111a2b]/95 dark:text-[#f8fafc]">
                        <TableRow>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[64px] text-gray-700 dark:text-gray-300">ID</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[170px] text-gray-700 dark:text-gray-300">{nombreColHeader}</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[120px] text-gray-700 dark:text-gray-300">Ciudad</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[120px] text-gray-700 dark:text-gray-300">Teléfono</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[160px] text-gray-700 dark:text-gray-300">Contacto</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[210px] text-gray-700 dark:text-gray-300">Dirección</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-center w-[96px] text-gray-700 dark:text-gray-300">Acciones</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-[#f5f0e8] text-[12px] text-[#44403c] dark:divide-[#334155]/80 dark:text-[#e5e7eb]">
                        {loading ? (
                          <TableRow>
                            <TableCell className="px-1.5 py-3" colSpan={7}>Cargando...</TableCell>
                          </TableRow>
                        ) : currentClientes.length === 0 ? (
                          <TableRow>
                            <TableCell className="px-1.5 py-2" colSpan={7}>
                              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No hay {viewPlural.toLowerCase()}.</div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentClientes.map((cliente, idx) => (
                            <TableRow key={cliente.id} className="transition-colors hover:bg-[#fffdf8] dark:hover:bg-[#1e293b]/50">
                              <TableCell className="px-1.5 py-1 whitespace-nowrap tabular-nums font-semibold text-gray-900 dark:text-white">{startIndex + idx + 1000}</TableCell>
                              <TableCell className="px-1.5 py-1 text-gray-900 dark:text-white truncate">
                                <span className="block truncate" title={cliente.nombre}>{cliente.nombre}</span>
                              </TableCell>
                              <TableCell className="px-1.5 py-1 whitespace-nowrap">
                                {(() => {
                                  const ciudad = cliente.ciudad || '';
                                  const estado = cliente.estado || '';
                                  if (!ciudad && !estado) return <span className="text-gray-500">-</span>;
                                  return (
                                    <div className="leading-tight">
                                      <div className="text-gray-900 dark:text-white truncate" title={ciudad || ''}>{ciudad || '-'}</div>
                                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={estado || ''}>{estado || '-'}</div>
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="px-1.5 py-1 whitespace-nowrap">
                                <a href={`tel:${cliente.telefono}`} className="text-[#ff801f] hover:text-[#ff6a00] dark:text-[#ffa057] dark:hover:text-[#ffb174] hover:underline">
                                  {cliente.telefono}
                                </a>
                              </TableCell>
                              <TableCell className="px-1.5 py-1">
                                {(() => {
                                  const principal = (cliente.contactos || []).find((c: any) => !!(c as any)?.is_principal) || (cliente.contactos || [])[0];
                                  const nombre = (principal as any)?.nombre_apellido || '';
                                  const correo = (principal as any)?.correo || '';
                                  if (!nombre && !correo) return <span className="text-gray-500">-</span>;
                                  return (
                                    <div className="leading-tight">
                                      <div className="text-gray-900 dark:text-white truncate" title={nombre || ''}>{nombre || '-'}</div>
                                      {correo ? (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={correo}>{correo}</div>
                                      ) : (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400">-</div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="px-1.5 py-1">
                                {isGoogleMapsLink(cliente.direccion) ? (
                                  <a
                                    href={cliente.direccion}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[#ff801f] dark:text-[#ffa057] hover:underline"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                      <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    Ver ubicación
                                  </a>
                                ) : (
                                  <span className="block truncate" title={cliente.direccion}>{cliente.direccion}</span>
                                )}
                              </TableCell>
                              <TableCell className="px-1.5 py-1 text-center">
                                <div className="inline-flex items-center gap-1 rounded-lg border border-[#e7ded0]/80 bg-[#fcfaf6] px-1.5 py-1 dark:border-[#334155] dark:bg-[#0f172a]/80">
                                  {canClientesEdit && (
                                    <button
                                      onClick={() => handleEdit(cliente)}
                                      className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-[#ff801f]/50 hover:text-[#ff801f] active:scale-[0.97] dark:border-[#334155] dark:bg-[#111a2b] dark:hover:border-[#ff801f]/50 sm:h-7 sm:w-7 sm:rounded"
                                      title="Editar"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canClientesDelete && (
                                    <button
                                      onClick={() => handleDeleteClick(cliente)}
                                      className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-error-400 hover:text-error-600 active:scale-[0.97] dark:border-[#334155] dark:bg-[#111a2b] dark:hover:border-error-500 sm:h-7 sm:w-7 sm:rounded"
                                      title="Eliminar"
                                    >
                                      <TrashBinIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Paginación */}
                {!loading && totalCount > 0 && currentClientes.length > 0 && (
                  <div className="border-t border-[#e7ded0] px-4 py-3 dark:border-[#334155]/80 sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Mostrando <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> a{" "}
                        <span className="font-medium text-gray-900 dark:text-white">{Math.min(endIndex, totalCount)}</span> de{" "}
                        <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> clientes
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* First Page */}
                          {currentPage > 3 && (
                            <>
                              <button
                                onClick={() => setCurrentPage(1)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white dark:border-[#334155] dark:bg-[#111a2b] text-sm font-medium text-gray-700 dark:text-[#f0f0f0] hover:bg-gray-50 dark:hover:bg-white/[0.06]"
                              >
                                1
                              </button>
                              {currentPage > 4 && <span className="px-1 text-gray-400">...</span>}
                            </>
                          )}

                          {/* Page Numbers */}
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              if (totalPages <= 5) return true;
                              return Math.abs(page - currentPage) <= 2;
                            })
                            .map(page => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${currentPage === page
                                  ? 'border-[#ff801f]/30 bg-[#ff801f] text-black'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]'
                                  }`}
                              >
                                {page}
                              </button>
                            ))}

                          {/* Last Page */}
                          {currentPage < totalPages - 2 && (
                            <>
                              {currentPage < totalPages - 3 && <span className="px-1 text-gray-400">...</span>}
                              <button
                                onClick={() => setCurrentPage(totalPages)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                              >
                                {totalPages}
                              </button>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </ComponentCard>
            </div>

          </>
        )}

        {/* Modal Crear/Editar */}
        <Modal
          mobileBottomSheet
          isOpen={showModal}
          onClose={handleCloseModal}
          closeOnBackdropClick={false}
          className="w-full max-w-5xl overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_30px_90px_-45px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b]"
        >
          <div className="bg-[#fffdfa] dark:bg-[#111a2b]">
            <header className="relative shrink-0 border-b border-[#e7ded0] bg-gradient-to-r from-[#fcfaf6] via-[#fffaf3] to-[#fffdfa] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-none dark:from-[#111827] dark:via-[#111827] dark:to-[#111827] sm:pr-16">
              <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.3995 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.3995 6.75 6.5Z"
                      fill="currentColor"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.25 18.5714C4.25 15.6325 6.63249 13.25 9.57143 13.25H14.4286C17.3675 13.25 19.75 15.6325 19.75 18.5714C19.75 20.8792 17.8792 22.75 15.5714 22.75H8.42857C6.12081 22.75 4.25 20.8792 4.25 18.5714Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className={sectionLabelClass}>Contactos · {viewPlural}</p>
                  <h3 className={`mt-1 ${claudeSectionHeadingClass}`}>
                    {editingCliente ? `Editar ${viewSingular}` : `Nuevo ${viewSingular}`}
                  </h3>
                  <p className={claudeCaptionClass}>
                    Captura y revisa los datos antes de guardar
                  </p>
                </div>
              </div>
            </header>

            {/* Body */}
            <form onSubmit={handleSubmit} className="custom-scrollbar max-h-[78vh] space-y-4 overflow-y-auto p-4 sm:p-5">
              {modalError && (
                <Alert
                  variant={String(modalError).startsWith('Campos requeridos faltantes:') ? 'warning' : 'error'}
                  title={String(modalError).startsWith('Campos requeridos faltantes:') ? 'Faltan campos' : 'Error'}
                  message={modalError}
                  showLink={false}
                />
              )}

              <div className="inline-flex items-center gap-1 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0f172a]/80">
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className={`${modalTabBaseClass} border ${activeTab === 'general'
                    ? 'border-[#ff801f]/30 bg-[#ff801f] text-black shadow-sm'
                    : 'border-transparent bg-transparent text-gray-700 hover:bg-white dark:text-[#e5e7eb] dark:hover:bg-white/[0.06]'
                    }`}
                >
                  Datos Básicos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('more')}
                  className={`${modalTabBaseClass} border ${activeTab === 'more'
                    ? 'border-[#ff801f]/30 bg-[#ff801f] text-black shadow-sm'
                    : 'border-transparent bg-transparent text-gray-700 hover:bg-white dark:text-[#e5e7eb] dark:hover:bg-white/[0.06]'
                    }`}
                >
                  Datos Facturación
                </button>
              </div>

              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className={`${modalPanelClass} space-y-4`}>
                    <p className={modalSectionTitleClass}>Información Comercial</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>{noClienteLabel}</Label>
                        <Input value={formData.no_cliente || ""} onChange={(e) => setFormData({ ...formData, no_cliente: e.target.value })} />
                      </div>
                      <div>
                        <Label>Clave</Label>
                        <Input value={formData.clave || ""} onChange={(e) => setFormData({ ...formData, clave: e.target.value })} />
                      </div>
                      <div>
                        <Label>Prospecto</Label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, is_prospecto: !formData.is_prospecto })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_prospecto ? "bg-[#ff801f]" : "bg-gray-300 dark:bg-[#334155]"}`}
                          aria-pressed={!!formData.is_prospecto}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${formData.is_prospecto ? "translate-x-5" : "translate-x-1"}`} />
                        </button>
                        <span className="ml-2 text-xs font-medium text-[#8b7b69] dark:text-[#8ea0b8]">
                          {formData.is_prospecto ? "Sí" : "No"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Representante</Label>
                        <Input value={formData.representante || ""} onChange={(e) => setFormData({ ...formData, representante: e.target.value })} />
                      </div>
                      <div>
                        <Label>Nombre</Label>
                        <Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>RFC</Label>
                        <Input value={formData.rfc} onChange={(e) => setFormData({ ...formData, rfc: e.target.value })} />
                      </div>
                      <div>
                        <Label>CURP</Label>
                        <Input value={formData.curp} onChange={(e) => setFormData({ ...formData, curp: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Teléfono</Label>
                        <Input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: (e.target.value || "").replace(/\D/g, "") })} />
                      </div>
                      <div>
                        <Label>Celular</Label>
                        <Input value={formData.celular || ""} onChange={(e) => setFormData({ ...formData, celular: (e.target.value || "").replace(/\D/g, "") })} />
                      </div>
                    </div>

                    <div>
                      <Label>Correo</Label>
                      <Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} />
                    </div>

                    <div>
                      <Label>Comentario</Label>
                      <textarea
                        rows={4}
                        value={formData.notas}
                        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                        className={modalTextareaClass}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>No. de Precio</Label>
                        <select value={formData.numero_precio || "1"} onChange={(e) => setFormData({ ...formData, numero_precio: e.target.value })} className={selectLikeClassName}>
                          <option value="1">Precio 1</option>
                          <option value="2">Precio 2</option>
                          <option value="3">Precio 3</option>
                        </select>
                      </div>
                      <div>
                        <Label>Límite Crédito</Label>
                        <Input type="number" value={formData.limite_credito} onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })} />
                      </div>
                      <div>
                        <Label>Días crédito</Label>
                        <Input type="number" value={formData.dias_credito} onChange={(e) => setFormData({ ...formData, dias_credito: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'more' && (
                <div className="space-y-4">
                  <div className={`${modalPanelClass} space-y-4`}>
                    <p className={modalSectionTitleClass}>Información Fiscal</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><Label>RFC</Label><Input value={formData.rfc_fiscal || ""} onChange={(e) => setFormData({ ...formData, rfc_fiscal: e.target.value })} /></div>
                      <div><Label>idCIF</Label><Input value={formData.idcif || ""} onChange={(e) => setFormData({ ...formData, idcif: e.target.value })} /></div>
                      <div><Label>Razón Social</Label><Input value={formData.razon_social || ""} onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })} /></div>
                      <div><Label>CURP</Label><Input value={formData.curp_fiscal || ""} onChange={(e) => setFormData({ ...formData, curp_fiscal: e.target.value })} /></div>
                      <div><Label>Régimen Fiscal</Label><Input value={formData.regimen_fiscal || ""} onChange={(e) => setFormData({ ...formData, regimen_fiscal: e.target.value })} /></div>
                      <div><Label>Uso CFDI</Label><Input value={formData.uso_cfdi || ""} onChange={(e) => setFormData({ ...formData, uso_cfdi: e.target.value })} /></div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <Label>Domicilio</Label>
                        <button
                          type="button"
                          onClick={() => setShowMapModal(true)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#ff801f] transition-colors hover:text-[#ff6a00] dark:text-[#fb923c] dark:hover:text-[#fdba74]"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Seleccionar en mapa
                        </button>
                      </div>
                      <div className="relative">
                        <textarea
                          rows={3}
                          value={formData.direccion}
                          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                          className={`${modalTextareaClass} pr-12`}
                          placeholder="Dirección, coordenadas o URL de Google Maps"
                        />
                        {!!formData.direccion?.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              const direccion = String(formData.direccion || "").trim();
                              if (isGoogleMapsLink(direccion) || direccion.includes("google.com/maps") || direccion.includes("maps.app.goo.gl")) {
                                window.open(direccion, "_blank");
                                return;
                              }
                              const coordMatch = direccion.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                              if (coordMatch) {
                                const lat = coordMatch[1];
                                const lng = coordMatch[2];
                                window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
                                return;
                              }
                              const query = encodeURIComponent(direccion);
                              window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-[#fff3e8] p-1.5 text-[#ff801f] transition-colors hover:bg-[#ffe2cc] dark:bg-[#7c2d12]/30 dark:text-[#fb923c] dark:hover:bg-[#9a3412]/35"
                            title="Abrir en Google Maps"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><Label>No. Ext</Label><Input value={formData.numero_exterior} onChange={(e) => setFormData({ ...formData, numero_exterior: e.target.value })} /></div>
                      <div><Label>No. Int</Label><Input value={formData.interior} onChange={(e) => setFormData({ ...formData, interior: e.target.value })} /></div>
                      <div><Label>Código Postal</Label><Input value={formData.codigo_postal} onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })} /></div>
                      <div><Label>Colonia</Label><Input value={formData.colonia} onChange={(e) => setFormData({ ...formData, colonia: e.target.value })} /></div>
                      <div><Label>Ciudad</Label><Input value={formData.ciudad} onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })} /></div>
                      <div><Label>Localidad</Label><Input value={formData.localidad} onChange={(e) => setFormData({ ...formData, localidad: e.target.value })} /></div>
                      <div>
                        <Label>Estado</Label>
                        <select value={formData.estado || ""} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className={selectLikeClassName}>
                          <option value="">Seleccione</option>
                          {estadosOptions.map((est) => <option key={est} value={est}>{est}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>País</Label>
                        <select value={formData.pais || "México"} onChange={(e) => {
                          const pais = e.target.value;
                          const nextEstados = estadosPorPais[pais] || estadosPorPais["México"] || [];
                          const nextEstado = nextEstados.includes(formData.estado) ? formData.estado : "";
                          setFormData({ ...formData, pais, estado: nextEstado });
                        }} className={selectLikeClassName}>
                          {paisOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="sticky bottom-[-1rem] z-20 -mx-4 border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 shadow-[0_-10px_24px_-20px_rgba(28,25,23,0.55)] before:absolute before:-bottom-3 before:left-0 before:h-3 before:w-full before:bg-[#fcfaf6] before:content-[''] dark:border-[#334155] dark:bg-[#0f172a] dark:before:bg-[#0f172a] sm:-mx-5 sm:bottom-[-1.25rem] sm:px-5">
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                    </svg>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[12px] bg-[#ff801f] text-black hover:bg-[#ff6a00] focus:ring-2 focus:ring-[#ff801f]/30"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M5 12l4 4L19 6" strokeLinecap="round" />
                    </svg>
                    {editingCliente ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>

        {/* Modal Mapa */}
        <Modal
          mobileBottomSheet
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          className="w-[94vw] max-w-3xl overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-xl dark:border-[#273244] dark:bg-[#111a2b]"
        >
          <div>
            <div className="border-b border-[#e7ded0] bg-[#fcfaf6] px-5 pb-4 pt-5 dark:border-[#273244] dark:bg-[#0f172a]/70">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#fff3e8] dark:bg-[#7c2d12]/30">
                  <svg className="w-5 h-5 text-[#ff801f] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">Seleccionar Ubicación</h5>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Haz clic en el mapa para seleccionar la Ubicación</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="overflow-hidden rounded-xl border border-[#e7ded0] dark:border-[#334155]">
                <div id={mapContainerId} className="w-full" style={{ height: 420 }} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {selectedLocation ? (
                    <span>Lat: {selectedLocation.lat.toFixed(6)} | Lng: {selectedLocation.lng.toFixed(6)}</span>
                  ) : (
                    <span>Selecciona un punto en el mapa</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMapModal(false)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedLocation}
                    onClick={handleConfirmMap}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] bg-[#ff801f] text-black hover:bg-[#ff6a00] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Usar Ubicación
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal de Confirmación de Eliminación */}
        {
          clienteToDelete && (
            <Modal
              mobileBottomSheet
              isOpen={showDeleteModal}
              onClose={handleCancelDelete}
              className="w-[94vw] max-w-md overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-xl dark:border-[#273244] dark:bg-[#111a2b]"
            >
              <div>
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Eliminar {viewSingular}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Esta acción no se puede deshacer
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    ¿Estás seguro de que deseas eliminar al cliente{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {clienteToDelete.nombre}
                    </span>
                    ?
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20">
                    <p className="text-xs text-red-800 dark:text-red-300">
                      <strong>Advertencia:</strong> Todos los datos asociados a este cliente serán eliminados permanentemente.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-[#e7ded0] bg-[#fcfaf6] px-6 py-4 dark:border-[#273244] dark:bg-[#0f172a]/70">
                  <button
                    onClick={handleCancelDelete}
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:border-[#334155] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
                  >
                    <TrashBinIcon className="w-4 h-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            </Modal>
          )
        }
      </div>
    </div>
  );
};

export default ClientesPage;
