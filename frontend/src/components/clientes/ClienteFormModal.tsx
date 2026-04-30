import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { apiUrl } from "@/config/api";
import { formatApiErrors } from "@/utils/apiUtils";
import { Cliente } from "@/types/cliente";
import {
    estadosPorPais,
    formatPhoneE164,
    onlyDigits10,
    paisOptions,
    parsePhoneToForm,
} from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";

interface ClienteFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (cliente: Cliente) => void;
    editingCliente?: Cliente | null;
    permissions?: any;
}

const getNoClienteLabelByTipo = (tipo?: string) => {
    if (tipo === "EMPRESA") return "No. de Empresa";
    if (tipo === "PERSONA_FISICA") return "No. de Persona";
    if (tipo === "PROVEEDOR") return "No. de Proveedor";
    return "No. de Cliente";
};

const selectLikeClassName =
    "h-10 w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 text-sm text-[#1c1917] shadow-theme-xs outline-none transition-colors focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20";

const sectionLabelClass =
    "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

const claudeSectionHeadingClass =
    "[font-family:Georgia,'Times_New_Roman',serif] text-[25px] font-medium leading-[1.2] text-gray-900 dark:text-[#f0f0f0]";

const claudeCaptionClass =
    "text-sm font-normal leading-[1.43] text-[#57534e] dark:text-[#8ea0b8]";

const claudeLabelClass =
    "text-xs font-medium leading-[1.6] tracking-[0.12px]";
const claudeSansStyle = { fontFamily: "Outfit, sans-serif" } as const;

const modalPanelClass =
    "rounded-2xl border border-[#ecdcc8] bg-[#fffdfa] p-4 shadow-[0_18px_40px_-28px_rgba(28,25,23,0.35)] dark:border-[#334155] dark:bg-[#0f172a]/80 sm:p-5";

const modalSectionTitleClass =
    "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b7b69] dark:text-[#8ea0b8]";

const modalTextareaClass =
    "w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 py-2 text-sm text-[#1c1917] shadow-theme-xs outline-none transition-colors placeholder:text-[#78716c] focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20 resize-none";

const modalTabBaseClass = `rounded-xl px-3.5 py-2.5 ${claudeLabelClass} transition-all`;

export const ClienteFormModal: React.FC<ClienteFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editingCliente,
    permissions,
}) => {
    const noClienteLabel = getNoClienteLabelByTipo(editingCliente?.tipo);
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
        tipo: "EMPRESA",
        is_prospecto: false,
    });

    const [activeTab, setActiveTab] = useState<'general' | 'more'>('general');
    const [modalError, setModalError] = useState("");
    const [saving, setSaving] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const zoomRef = useRef<number>(15);
    const mapContainerId = "clientes-modal-leaflet-map";

    const canClientesCreate = !!permissions?.clientes?.create;

    useEffect(() => {
        if (isOpen && editingCliente) {
            const parsed = parsePhoneToForm(editingCliente.telefono);
            setFormData({
                ...editingCliente,
                telefono_pais: parsed.phoneCountry,
                telefono: parsed.phoneNational,
                descuento_pct: editingCliente.descuento_pct ?? null,
                limite_credito: editingCliente.limite_credito ?? "",
                dias_credito: editingCliente.dias_credito ?? "",
                numero_precio: editingCliente.numero_precio || "1",
                is_prospecto: editingCliente.is_prospecto || false,
            });
            setActiveTab('general');
            setModalError("");
        } else if (isOpen) {
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
                tipo: "EMPRESA",
                is_prospecto: false,
            });
            setActiveTab('general');
            setModalError("");
        }
    }, [isOpen, editingCliente]);

    // MAP LOGIC
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
            } catch (err) {
                console.error("Map error:", err);
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

    const handleConfirmMap = () => {
        if (selectedLocation) {
            setFormData({
                ...formData,
                direccion: `https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`
            });
            setShowMapModal(false);
        }
    };

    const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError("");

        if (!editingCliente && !canClientesCreate && permissions) {
            // Only check if permissions object is provided
        }

        // Validación de campos requeridos
        const missingFields: string[] = [];
        if (!formData.nombre?.trim()) missingFields.push(formData.tipo === 'PERSONA_FISICA' ? 'Persona Física' : formData.tipo === 'PROVEEDOR' ? 'Proveedor' : 'Empresa');
        if (!formData.telefono?.trim() || !onlyDigits10(formData.telefono)) missingFields.push('Teléfono (10 dígitos)');

        if (missingFields.length > 0) {
            setModalError(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
            return;
        }

        setSaving(true);
        const token = getToken();
        const url = editingCliente ? apiUrl(`/api/clientes/${editingCliente.id}/`) : apiUrl('/api/clientes/');
        const method = editingCliente ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    telefono: formatPhoneE164(formData.telefono_pais, formData.telefono),
                    descuento_pct: formData.descuento_pct === '' ? null : formData.descuento_pct,
                    limite_credito: formData.limite_credito === "" ? 0 : formData.limite_credito,
                    dias_credito: formData.dias_credito === "" ? 0 : formData.dias_credito,
                })
            });

            if (!response.ok) {
                const txt = await response.text().catch(() => '');
                setModalError(formatApiErrors(txt) || 'No se pudo guardar el cliente.');
                setSaving(false);
                return;
            }

            const saved = await response.json().catch(() => null);
            const clienteId = saved?.id || editingCliente?.id;

            if (!clienteId) {
                setModalError('No se pudo obtener el ID del cliente guardado.');
                setSaving(false);
                return;
            }

            onSuccess(saved);
            onClose();
        } catch (error) {
            console.error('Error al guardar cliente:', error);
            setModalError(String(error));
        } finally {
            setSaving(false);
        }
    };

    const estadosOptions = estadosPorPais[formData.pais] || estadosPorPais["México"] || [];
    const isGoogleMapsUrl = (value: string | null | undefined) => {
        if (!value) return false;
        const s = String(value).trim();
        if (!(s.startsWith('http://') || s.startsWith('https://'))) return false;
        return s.includes('google.com/maps') || s.includes('maps.app.goo.gl');
    };


    return (
        <Modal mobileBottomSheet isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className="w-full max-w-5xl overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_30px_90px_-45px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b]">
            <div>
                <header className="relative shrink-0 border-b border-[#e7ded0] bg-gradient-to-r from-[#fcfaf6] via-[#fffaf3] to-[#fffdfa] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-none dark:from-[#111827] dark:via-[#111827] dark:to-[#111827] sm:pr-16">
                    <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
                    <div className="flex items-start gap-3">
                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#ff801f] text-black shadow-sm">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                        <div className="min-w-0">
                            <p className={sectionLabelClass}>Contactos · Clientes</p>
                            <h3 className={`mt-1 ${claudeSectionHeadingClass}`}>
                                {editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
                            </h3>
                            <p className={claudeCaptionClass}>
                                Captura y revisa los datos antes de guardar
                            </p>
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="custom-scrollbar max-h-[78vh] space-y-4 overflow-y-auto p-4 sm:p-5" style={claudeSansStyle}>
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
                                    <div><Label>{noClienteLabel}</Label><Input value={formData.no_cliente || ""} onChange={(e) => setFormData({ ...formData, no_cliente: e.target.value })} /></div>
                                    <div><Label>Clave</Label><Input value={formData.clave || ""} onChange={(e) => setFormData({ ...formData, clave: e.target.value })} /></div>
                                    <div>
                                        <Label>Prospecto</Label>
                                        <button type="button" onClick={() => setFormData({ ...formData, is_prospecto: !formData.is_prospecto })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_prospecto ? "bg-[#ff801f]" : "bg-gray-300 dark:bg-[#334155]"}`}
                                            aria-pressed={!!formData.is_prospecto}>
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${formData.is_prospecto ? "translate-x-5" : "translate-x-1"}`} />
                                        </button>
                                        <span className="ml-2 text-xs font-medium text-[#8b7b69] dark:text-[#8ea0b8]">
                                            {formData.is_prospecto ? "Sí" : "No"}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div><Label>Representante</Label><Input value={formData.representante || ""} onChange={(e) => setFormData({ ...formData, representante: e.target.value })} /></div>
                                    <div><Label>Nombre</Label><Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} /></div>
                                    <div><Label>RFC</Label><Input value={formData.rfc} onChange={(e) => setFormData({ ...formData, rfc: e.target.value })} /></div>
                                    <div><Label>CURP</Label><Input value={formData.curp} onChange={(e) => setFormData({ ...formData, curp: e.target.value })} /></div>
                                    <div><Label>Teléfono</Label><Input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: (e.target.value || "").replace(/\D/g, "") })} /></div>
                                    <div><Label>Celular</Label><Input value={formData.celular || ""} onChange={(e) => setFormData({ ...formData, celular: (e.target.value || "").replace(/\D/g, "") })} /></div>
                                </div>
                                <div><Label>Correo</Label><Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} /></div>
                                <div><Label>Comentario</Label><textarea rows={4} value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} className={modalTextareaClass} /></div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div><Label>No. de Precio</Label><select value={formData.numero_precio || "1"} onChange={(e) => setFormData({ ...formData, numero_precio: e.target.value })} className={selectLikeClassName}><option value="1">Precio 1</option><option value="2">Precio 2</option><option value="3">Precio 3</option></select></div>
                                    <div><Label>Límite Crédito</Label><Input type="number" value={formData.limite_credito} onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })} /></div>
                                    <div><Label>Días crédito</Label><Input type="number" value={formData.dias_credito} onChange={(e) => setFormData({ ...formData, dias_credito: e.target.value })} /></div>
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
                                                    if (isGoogleMapsUrl(direccion) || direccion.includes("google.com/maps") || direccion.includes("maps.app.goo.gl")) {
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
                                            {estadosOptions.map((est: string) => (<option key={est} value={est}>{est}</option>))}
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
                                            {paisOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="sticky bottom-[-1rem] z-20 -mx-4 border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 shadow-[0_-10px_24px_-20px_rgba(28,25,23,0.55)] before:absolute before:-bottom-3 before:left-0 before:h-3 before:w-full before:bg-[#fcfaf6] before:content-[''] dark:border-[#334155] dark:bg-[#0f172a] dark:before:bg-[#0f172a] sm:-mx-5 sm:bottom-[-1.25rem] sm:px-5">
                        <div className="flex flex-col justify-end gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#e2d9ca] bg-white px-4 py-2.5 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06] sm:w-auto"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                            </svg>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium bg-[#ff801f] text-black hover:bg-[#ff6a00] focus:ring-2 focus:ring-[#ff801f]/30 disabled:opacity-50 transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M5 12l4 4L19 6" strokeLinecap="round" />
                            </svg>
                            {saving ? "Guardando..." : (editingCliente ? "Actualizar" : "Guardar")}
                        </button>
                        </div>
                    </div>
                </form>

                {/* Sub-Modal Mapa */}
                <Modal
                    mobileBottomSheet
                    isOpen={showMapModal}
                    onClose={() => setShowMapModal(false)}
                    className="w-[94vw] max-w-3xl p-0 overflow-hidden"
                >
                    <div className="bg-white dark:bg-[#111a2b]">
                        <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-[#334155]">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ff801f]/10 dark:bg-[#ff801f]/15">
                                    <svg className="w-5 h-5 text-[#ff801f] dark:text-[#ffa057]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">Seleccionar Ubicación</h5>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Haz clic en el mapa para seleccionar la ubicación</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="rounded-lg border border-gray-200 dark:border-[#334155] overflow-hidden shadow-theme-xs">
                                <div id={mapContainerId} className="w-full" style={{ height: 420 }} />
                            </div>

                            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                    {selectedLocation ? (
                                        <a
                                            href={`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#fff3e8] dark:bg-[#7c2d12]/30 text-[#ff801f] dark:text-[#fb923c] hover:bg-[#ffe2cc] dark:hover:bg-[#9a3412]/35 transition-colors"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                            </svg>
                                            <span>{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</span>
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </a>
                                    ) : (
                                        <span>Selecciona un punto en el mapa</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowMapModal(false)}
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06] transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!selectedLocation}
                                        onClick={handleConfirmMap}
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] font-medium bg-[#ff801f] text-black hover:bg-[#ff6a00] disabled:opacity-50 transition-colors"
                                    >
                                        Usar ubicación
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            </div>
        </Modal>
    );
};

