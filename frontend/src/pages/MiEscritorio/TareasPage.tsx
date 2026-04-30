import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { useDropzone } from "react-dropzone";
import { apiUrl } from "@/config/api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import { MobileTareaList } from "./MobileTareaCard";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

const cardShellClass =
    "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

const searchInputClass =
    "min-h-[46px] w-full rounded-2xl border border-[#e2d9ca] bg-[#fffdf8] py-2 pl-11 pr-10 text-sm text-[#1c1917] outline-none transition-all placeholder:text-[#7c7a74] focus:border-[#ff801f]/60 focus:ring-4 focus:ring-[#ff801f]/12 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c]/70 dark:focus:ring-[#fb923c]/20";

const sectionLabelClass =
    "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

const modalFieldLabelClass =
    "mb-1.5 block [font-family:'Arial','Helvetica_Neue',Helvetica,sans-serif] text-xs font-medium leading-[1.6] tracking-[0.12px] text-gray-700 dark:text-gray-300 sm:text-sm";

const claudeHeroHeadingClass =
    "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.85rem,2.8vw,2.6rem)] font-medium leading-[1.2] tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc]";

const claudeSectionHeadingClass =
    "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.4rem,2vw,2rem)] font-medium leading-[1.2] text-gray-900 dark:text-white";

const claudeSubheadingClass =
    "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.1rem,1.3vw,1.25rem)] font-medium leading-[1.2] text-gray-900 dark:text-white";

const claudeBodyClass = "text-base font-normal leading-[1.6] text-[#57534e] dark:text-[#b7c1d1]";

const claudeSansStyle = { fontFamily: "Outfit, sans-serif" } as const;

const modalUsuarioInputClass =
    "block w-full min-h-[44px] rounded-xl border border-[#e2d9ca] bg-[#fffdfa] py-2.5 pl-8 pr-[5.25rem] text-sm text-[#1c1917] outline-none transition-all placeholder:text-[#78716c] focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8]";

const modalTextareaClass =
    "w-full min-h-[7.5rem] rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 py-2.5 text-sm text-[#1c1917] outline-none transition-all placeholder:text-[#78716c] focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] resize-none";

/** Panel interior del modal: superficie limpia con borde sutil */
const modalPanelClass =
    "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#273244] dark:bg-[#111a2b] sm:p-5";

const modalRequiredMark = "ml-0.5 text-gray-400 dark:text-gray-500";

let tareasPagePermissionsInFlight: Promise<any> | null = null;
let tareasPagePermissionsLastFetchAt = 0;
const TAREAS_PAGE_PERMS_TTL_MS = 2 * 60 * 1000;

let tareasPageUsuariosInFlight: Promise<any> | null = null;
let tareasPageTareasInFlight: Promise<any> | null = null;

interface Tarea {
    id: number;
    usuario_asignado: number | null;
    usuario_asignado_username?: string;
    usuario_asignado_full_name?: string;
    estado?: "BACKLOG" | "TODO" | "EN_PROGRESO" | "HECHO";
    orden?: number;
    descripcion: string;
    fotos_urls: string[];
    fecha_creacion: string;
    fecha_actualizacion: string;
    creado_por?: number;
    creado_por_username?: string;
}

interface Usuario {
    id: number;
    username?: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff?: boolean;
    is_superuser?: boolean;
}

/** Texto del campo Usuario en el modal (misma lógica que al elegir en la lista). */
function labelForUsuarioAsignado(tarea: Tarea, lista: Usuario[]) {
    if (!tarea.usuario_asignado) return "";
    const u = lista.find((x) => x.id === tarea.usuario_asignado);
    if (u) {
        return u.first_name || u.last_name
            ? `${u.first_name} ${u.last_name}`.trim()
            : u.username || u.email || "";
    }
    const full = tarea.usuario_asignado_full_name?.trim();
    if (full) return full;
    if (tarea.usuario_asignado_username) return tarea.usuario_asignado_username;
    return "";
}

export default function TareasPage() {
    const getPermissionsFromStorage = () => {
        try {
            const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    };

    const getToken = () => {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    };

    const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());

    const canTareasView = permissions?.tareas?.view !== false;
    const canTareasCreate = !!permissions?.tareas?.create;
    const canTareasEdit = !!permissions?.tareas?.edit;
    const canTareasDelete = !!permissions?.tareas?.delete;

    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [descripcionModal, setDescripcionModal] = useState<{ open: boolean; content: string }>({ open: false, content: '' });
    const [fotosModal, setFotosModal] = useState<{ open: boolean; urls: string[] }>({ open: false, urls: [] });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tareaToDelete, setTareaToDelete] = useState<Tarea | null>(null);
    const [editingTarea, setEditingTarea] = useState<Tarea | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; index: number | null; url: string | null }>({
        open: false,
        index: null,
        url: null
    });

    const [alert, setAlert] = useState<{
        show: boolean;
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    }>({ show: false, variant: "success", title: "", message: "" });

    const [modalAlert, setModalAlert] = useState<{
        show: boolean;
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    }>({ show: false, variant: "success", title: "", message: "" });
    const [helpOpen, setHelpOpen] = useState(false);
    const helpRef = useRef<HTMLDivElement | null>(null);

    const [formData, setFormData] = useState({
        usuario_asignado: null as number | null,
        descripcion: "",
        fotos_urls: [] as string[],
    });
    const [usuarioOpen, setUsuarioOpen] = useState(false);
    const [usuarioSearch, setUsuarioSearch] = useState('');

    useEffect(() => {
        fetchTareas();
        fetchUsuarios();
    }, []);

    useEffect(() => {
        const sync = () => setPermissions(getPermissionsFromStorage());
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);

    useEffect(() => {
        const closeOnOutside = (event: MouseEvent) => {
            if (!helpRef.current) return;
            if (!helpRef.current.contains(event.target as Node)) setHelpOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setHelpOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutside);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnOutside);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    useEffect(() => {
        const token = getToken();
        if (!token) return;
        const now = Date.now();
        if (now - tareasPagePermissionsLastFetchAt < TAREAS_PAGE_PERMS_TTL_MS) return;

        try {
            const storedAtRaw = localStorage.getItem('permissions_fetched_at') || sessionStorage.getItem('permissions_fetched_at');
            const storedAt = storedAtRaw ? Number(storedAtRaw) : 0;
            if (storedAt && now - storedAt < TAREAS_PAGE_PERMS_TTL_MS) {
                return;
            }
        } catch { }

        const load = async () => {
            try {
                if (tareasPagePermissionsInFlight) {
                    await tareasPagePermissionsInFlight;
                    return;
                }

                tareasPagePermissionsLastFetchAt = Date.now();
                tareasPagePermissionsInFlight = (async () => {
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

                await tareasPagePermissionsInFlight;
            } catch {
                // ignore
            } finally {
                tareasPagePermissionsInFlight = null;
            }
        };

        load();
    }, []);

    const compressImage = async (
        file: File,
        maxSizeKB: number,
        maxWidth: number = 1400,
        maxHeight: number = 1400
    ): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = (height / width) * maxWidth;
                            width = maxWidth;
                        } else {
                            width = (width / height) * maxHeight;
                            height = maxHeight;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    let quality = 0.9;
                    const compress = () => {
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    reject(new Error('Error al comprimir la imagen'));
                                    return;
                                }
                                const sizeKB = blob.size / 1024;
                                if (sizeKB <= maxSizeKB || quality <= 0.1) {
                                    const r = new FileReader();
                                    r.readAsDataURL(blob);
                                    r.onloadend = () => resolve(r.result as string);
                                } else {
                                    quality -= 0.1;
                                    compress();
                                }
                            },
                            'image/jpeg',
                            quality
                        );
                    };
                    compress();
                };
                img.onerror = () => reject(new Error('Error al cargar la imagen'));
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
        });
    };

    const onDropPhotos = async (acceptedFiles: File[]) => {
        const current = Array.isArray(formData.fotos_urls) ? formData.fotos_urls : [];
        const remainingSlots = 2 - current.length;
        if (remainingSlots <= 0) return;
        const files = acceptedFiles.slice(0, remainingSlots).filter(f => f.type.startsWith('image/'));
        const urls: string[] = [];
        for (const file of files) {
            try {
                const compressed = await compressImage(file, 50, 1400, 1400);
                const token = getToken();
                const resp = await fetch(apiUrl('/api/tareas/upload-image/'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ data_url: compressed, folder: 'tareas/fotos' }),
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.url) urls.push(data.url as string);
                }
            } catch {
                // ignorar individualmente
            }
        }
        if (urls.length) {
            setFormData({ ...formData, fotos_urls: [...current, ...urls] });
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropPhotos,
        accept: {
            'image/png': [],
            'image/jpeg': [],
            'image/webp': [],
            'image/svg+xml': [],
        },
    });

    const getPublicIdFromUrl = (url: string): string | null => {
        try {
            const u = new URL(url);
            const parts = u.pathname.split('/');
            const uploadIdx = parts.findIndex(p => p === 'upload');
            if (uploadIdx === -1) return null;
            const after = parts.slice(uploadIdx + 1);
            const startIdx = after.length && /^v\d+$/i.test(after[0]) ? 1 : 0;
            const pathParts = after.slice(startIdx);
            if (!pathParts.length) return null;
            const last = pathParts[pathParts.length - 1];
            const dot = last.lastIndexOf('.');
            pathParts[pathParts.length - 1] = dot > 0 ? last.substring(0, dot) : last;
            return pathParts.join('/');
        } catch {
            return null;
        }
    };

    const handleDeletePhoto = async (index: number, url: string) => {
        const publicId = getPublicIdFromUrl(url);
        const updated = (Array.isArray(formData.fotos_urls) ? formData.fotos_urls : []).filter((_, i) => i !== index);
        try {
            const token = getToken();
            if (publicId) {
                await fetch(apiUrl('/api/tareas/delete-image/'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ public_id: publicId }),
                });
            }
        } catch (e) {
            console.error('Error al eliminar foto:', e);
        } finally {
            setFormData({ ...formData, fotos_urls: updated });
            setConfirmDelete({ open: false, index: null, url: null });
        }
    };

    const openDescripcionModal = (t: Tarea) => {
        setDescripcionModal({ open: true, content: t.descripcion || '-' });
    };

    const openFotosModal = (t: Tarea) => {
        const urls = Array.isArray(t.fotos_urls) ? t.fotos_urls : [];
        setFotosModal({ open: true, urls });
    };

    const fetchUsuarios = async () => {
        try {
            const token = getToken();
            if (!token) return;

            if (tareasPageUsuariosInFlight) {
                await tareasPageUsuariosInFlight;
                return;
            }

            tareasPageUsuariosInFlight = (async () => {
                const response = await fetch(apiUrl("/api/users/accounts/"), {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
                    setUsuarios(rows);
                }
            })();

            await tareasPageUsuariosInFlight;
            return;
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
        } finally {
            tareasPageUsuariosInFlight = null;
        }
    };

    const fetchTareas = async () => {
        try {
            if (!canTareasView) {
                setTareas([]);
                setLoading(false);
                return;
            }
            const token = getToken();
            if (!token) {
                setTareas([]);
                setLoading(false);
                return;
            }

            if (tareasPageTareasInFlight) {
                await tareasPageTareasInFlight;
                return;
            }

            tareasPageTareasInFlight = (async () => {
                const response = await fetch(apiUrl("/api/tareas/"), {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setTareas(Array.isArray(data) ? data : []);
                } else {
                    setTareas([]);
                }
            })();

            await tareasPageTareasInFlight;
            return;
        } catch (error) {
            console.error("Error al cargar tareas:", error);
            setTareas([]);
        } finally {
            tareasPageTareasInFlight = null;
            setLoading(false);
        }
    };

    const validateForm = () => {
        const missing: string[] = [];
        if (!formData.usuario_asignado) missing.push('Usuario Asignado');
        if (!formData.descripcion?.trim()) missing.push('Descripción');
        return { ok: missing.length === 0, missing };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEditing = !!editingTarea;
        if (isEditing && !canTareasEdit) {
            setModalAlert({
                show: true,
                variant: 'error',
                title: 'Sin permiso',
                message: 'No tienes permisos para editar tareas.'
            });
            setTimeout(() => setModalAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }
        if (!isEditing && !canTareasCreate) {
            setModalAlert({
                show: true,
                variant: 'error',
                title: 'Sin permiso',
                message: 'No tienes permisos para crear tareas.'
            });
            setTimeout(() => setModalAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }
        const token = getToken();

        const { ok, missing } = validateForm();
        if (!ok) {
            setModalAlert({
                show: true,
                variant: 'warning',
                title: 'Campos requeridos',
                message: `Faltan: ${missing.join(', ')}`
            });
            setTimeout(() => setModalAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }

        try {
            const url = editingTarea
                ? apiUrl(`/api/tareas/${editingTarea.id}/`)
                : apiUrl("/api/tareas/");
            const method = editingTarea ? "PUT" : "POST";

            const payload: any = { ...formData };
            const toNullIfEmpty = (v: any) => (typeof v === 'string' && v.trim() === '' ? null : v);
            payload.descripcion = toNullIfEmpty(payload.descripcion);

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                await fetchTareas();
                setShowModal(false);
                setFormData({
                    usuario_asignado: null,
                    descripcion: "",
                    fotos_urls: [],
                });
                setEditingTarea(null);

                setAlert({
                    show: true,
                    variant: "success",
                    title: isEditing ? "Tarea Actualizada" : "Tarea Creada",
                    message: isEditing
                        ? `La tarea ha sido actualizada exitosamente.`
                        : `La tarea ha sido creada exitosamente.`
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            } else {
                let errorMsg = 'Error al guardar la tarea';
                try {
                    const errorData = await response.json();
                    console.error('Error del servidor:', errorData);
                    errorMsg = (errorData?.detail || JSON.stringify(errorData)) || errorMsg;
                } catch {
                    errorMsg = await response.text();
                }
                setAlert({
                    show: true,
                    variant: "error",
                    title: "Error al guardar",
                    message: errorMsg
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
            }
        } catch (error) {
            console.error("Error al guardar tarea:", error);
            setAlert({
                show: true,
                variant: "error",
                title: "Error",
                message: String(error)
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        }
    };

    const handleDeleteClick = (tarea: Tarea) => {
        if (!canTareasDelete) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'Sin permiso',
                message: 'No tienes permisos para eliminar tareas.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }
        setTareaToDelete(tarea);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!tareaToDelete) return;
        if (!canTareasDelete) {
            setShowDeleteModal(false);
            setTareaToDelete(null);
            return;
        }

        const token = getToken();
        try {
            const response = await fetch(apiUrl(`/api/tareas/${tareaToDelete.id}/`), {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchTareas();
                setShowDeleteModal(false);

                setAlert({
                    show: true,
                    variant: "success",
                    title: "Tarea Eliminada",
                    message: `La tarea ha sido eliminada exitosamente.`
                });
                setTareaToDelete(null);
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            }
        } catch (error) {
            console.error("Error al eliminar tarea:", error);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setTareaToDelete(null);
    };

    const handleEdit = (tarea: Tarea) => {
        if (!canTareasEdit) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'Sin permiso',
                message: 'No tienes permisos para editar tareas.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }
        setEditingTarea(tarea);
        setUsuarioSearch(labelForUsuarioAsignado(tarea, usuarios));
        setUsuarioOpen(false);
        setFormData({
            usuario_asignado: tarea.usuario_asignado || null,
            descripcion: tarea.descripcion || "",
            fotos_urls: Array.isArray(tarea.fotos_urls) ? tarea.fotos_urls : [],
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({
            usuario_asignado: null,
            descripcion: "",
            fotos_urls: [],
        });
        setEditingTarea(null);
        setUsuarioSearch('');
        setUsuarioOpen(false);
    };

    const selectUsuario = (usuario: Usuario | null) => {
        if (usuario) {
            setFormData({
                ...formData,
                usuario_asignado: usuario.id,
            });
            const nombre = usuario.first_name || usuario.last_name
                ? `${usuario.first_name} ${usuario.last_name}`.trim()
                : usuario.username || usuario.email;
            setUsuarioSearch(nombre);
        } else {
            setFormData({
                ...formData,
                usuario_asignado: null,
            });
            setUsuarioSearch('');
        }
        setUsuarioOpen(false);
    };

    /** Si la lista de usuarios llega después de abrir edición, rellenar el campo vacío. */
    useEffect(() => {
        if (!showModal || !editingTarea?.usuario_asignado) return;
        const label = labelForUsuarioAsignado(editingTarea, usuarios);
        if (!label) return;
        setUsuarioSearch((prev) => (prev.trim() === "" ? label : prev));
    }, [showModal, editingTarea, usuarios]);

    const filteredUsuarios = useMemo(() => {
        if (!usuarioSearch.trim()) return usuarios;
        const q = usuarioSearch.toLowerCase();
        return usuarios.filter(u => {
            const nombre = `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase();
            return nombre.includes(q);
        });
    }, [usuarios, usuarioSearch]);

    const shownList = useMemo(() => {
        if (!Array.isArray(tareas)) return [];
        const q = (searchTerm || '').trim().toLowerCase();
        return tareas.filter(t => {
            if (!q) return true;
            return (
                t.descripcion?.toLowerCase().includes(q) ||
                t.usuario_asignado_full_name?.toLowerCase().includes(q) ||
                t.usuario_asignado_username?.toLowerCase().includes(q)
            );
        });
    }, [tareas, searchTerm]);

    const tareaStats = useMemo(() => {
        const list = Array.isArray(tareas) ? tareas : [];
        const total = list.length;
        const asignadas = list.filter(t => !!t.usuario_asignado).length;
        const conFotos = list.filter(t => Array.isArray(t.fotos_urls) && t.fotos_urls.length > 0).length;
        return { total, asignadas, conFotos };
    }, [tareas]);

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return '-';
        }
    };

    const KANBAN_COLUMNS = useMemo(
        () =>
            [
                { key: "TODO" as const, label: "Por hacer" },
                { key: "EN_PROGRESO" as const, label: "En proceso" },
                { key: "HECHO" as const, label: "Hecho" },
            ],
        []
    );

    const getEstado = (t: Tarea) => {
        const raw = (t.estado || "BACKLOG") as "BACKLOG" | (typeof KANBAN_COLUMNS)[number]["key"];
        return (raw === "BACKLOG" ? "TODO" : raw) as (typeof KANBAN_COLUMNS)[number]["key"];
    };

    const tasksByEstado = useMemo(() => {
        const grouped: Record<string, Tarea[]> = {
            TODO: [],
            EN_PROGRESO: [],
            HECHO: [],
        };
        for (const t of shownList) {
            const e = getEstado(t);
            grouped[e].push(t);
        }
        for (const k of Object.keys(grouped)) {
            grouped[k].sort((a, b) => {
                const ao = typeof a.orden === "number" ? a.orden : 0;
                const bo = typeof b.orden === "number" ? b.orden : 0;
                if (ao !== bo) return ao - bo;
                return String(b.fecha_creacion || "").localeCompare(String(a.fecha_creacion || ""));
            });
        }
        return grouped as Record<(typeof KANBAN_COLUMNS)[number]["key"], Tarea[]>;
    }, [shownList]);

    const updateTarea = async (id: number, patch: Partial<Pick<Tarea, "estado" | "orden">>) => {
        const token = getToken();
        if (!token) throw new Error("Sin token");
        const response = await fetch(apiUrl(`/api/tareas/${id}/`), {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(patch),
        });
        if (!response.ok) {
            let msg = "Error actualizando tarea";
            try {
                const data = await response.json();
                msg = data?.detail || JSON.stringify(data) || msg;
            } catch {
                msg = await response.text();
            }
            throw new Error(msg);
        }
    };

    const handleMobileEstadoChange = async (
        tarea: Tarea,
        estado: "TODO" | "EN_PROGRESO" | "HECHO",
    ) => {
        try {
            await updateTarea(tarea.id, { estado });
            await fetchTareas();
        } catch (e) {
            setAlert({
                show: true,
                variant: "error",
                title: "No se pudo actualizar",
                message: String(e),
            });
            setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3500);
        }
    };

    const persistColumnOrders = async (
        estado: (typeof KANBAN_COLUMNS)[number]["key"],
        list: Tarea[],
        forcePersistIds: Set<number> = new Set()
    ) => {
        await Promise.all(
            list.map((t, idx) => {
                const desiredEstado = estado;
                const desiredOrden = idx;
                if (
                    !forcePersistIds.has(t.id) &&
                    t.estado === desiredEstado &&
                    t.orden === desiredOrden
                ) {
                    return Promise.resolve();
                }
                return updateTarea(t.id, { estado: desiredEstado, orden: desiredOrden });
            })
        );
    };

    const applyMovePure = (
        all: Tarea[],
        sourceId: number,
        destination: { estado: (typeof KANBAN_COLUMNS)[number]["key"]; index: number }
    ) => {
        const list = Array.isArray(all) ? [...all] : [];
        const srcIdx = list.findIndex((t) => t.id === sourceId);
        if (srcIdx < 0) return list;

        const task: Tarea = { ...list[srcIdx] };
        const fromEstado = getEstado(task);
        list.splice(srcIdx, 1);

        const destEstado = destination.estado;
        task.estado = destEstado;

        const destExisting = list
            .filter((t) => getEstado(t) === destEstado)
            .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
        const insertAt = Math.max(0, Math.min(destination.index, destExisting.length));
        destExisting.splice(insertAt, 0, task);
        destExisting.forEach((t, idx) => (t.orden = idx));

        const fromExisting =
            fromEstado === destEstado
                ? []
                : list
                    .filter((t) => getEstado(t) === fromEstado)
                    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
        fromExisting.forEach((t, idx) => (t.orden = idx));

        const movedIds = new Set<number>([...destExisting, ...fromExisting].map((t) => t.id));
        const rest = list.filter((t) => !movedIds.has(t.id));
        return [...rest, ...fromExisting, ...destExisting];
    };

    const kanbanRootRef = useRef<HTMLDivElement | null>(null);
    const dndCleanupRef = useRef(new WeakMap<Element, () => void>());
    useEffect(() => {
        const root = kanbanRootRef.current;
        if (!root) return;
        return monitorForElements({
            onDrop: async ({ source, location }) => {
                const sourceData: any = source?.data;
                if (!sourceData || sourceData.type !== "tarea") return;
                const sourceId = Number(sourceData.id);
                if (!sourceId) return;

                const targets = location.current.dropTargets;
                const primary = targets && targets.length ? targets[0] : null;
                const destData: any = primary?.data;
                if (!destData) return;

                let destEstado: (typeof KANBAN_COLUMNS)[number]["key"] | null = null;
                let destIndex: number | null = null;

                if (destData.kind === "card") {
                    destEstado = destData.estado;
                    destIndex = Number(destData.index);
                }
                if (destData.kind === "column") {
                    destEstado = destData.estado;
                    destIndex = Number(destData.index);
                }

                if (!destEstado || destIndex === null || Number.isNaN(destIndex)) return;

                const prevSnapshot = tareas;
                const nextSnapshot = applyMovePure(prevSnapshot, sourceId, { estado: destEstado, index: destIndex });
                setTareas(nextSnapshot);

                try {
                    const destList = nextSnapshot
                        .filter((t) => getEstado(t) === destEstado)
                        .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

                    const fromTask = prevSnapshot.find((t) => t.id === sourceId);
                    const fromEstado = fromTask ? getEstado(fromTask) : ("TODO" as (typeof KANBAN_COLUMNS)[number]["key"]);
                    const fromList =
                        fromEstado === destEstado
                            ? []
                            : nextSnapshot
                                .filter((t) => getEstado(t) === fromEstado)
                                .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

                    const forcePersistIds = new Set<number>([sourceId]);
                    await Promise.all([
                        persistColumnOrders(destEstado, destList, forcePersistIds),
                        fromEstado === destEstado
                            ? Promise.resolve()
                            : persistColumnOrders(fromEstado, fromList, forcePersistIds),
                    ]);
                } catch (e) {
                    setTareas(prevSnapshot);
                    setAlert({
                        show: true,
                        variant: "error",
                        title: "No se pudo mover",
                        message: String(e),
                    });
                    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 4500);
                    await fetchTareas();
                }
            },
        });
    }, [tareas]);

    return (
        <>
            <PageMeta title="Tareas" description="Gestión de tareas del sistema" />
            <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
                <div
                    className="mx-auto w-full max-w-[min(100%,1920px)] space-y-6 px-3 pb-10 pt-6 text-sm sm:space-y-7 sm:px-5 sm:pb-12 sm:pt-7 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]"
                    style={claudeSansStyle}
                >
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
                        <span className="text-[#44403c] dark:text-[#cbd5e1]">Tareas</span>
                    </nav>

                    {alert.show && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <Alert
                                variant={alert.variant}
                                title={alert.title}
                                message={alert.message}
                                showLink={false}
                            />
                        </div>
                    )}

                    <div className="space-y-6">
                            <header className={`relative z-30 ${cardShellClass} !overflow-visible p-4 sm:p-5 lg:p-6`}>
                                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[#ff801f]/10 blur-2xl" />
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
                                            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]">
                                                Mi escritorio
                                            </p>
                                            <h1 className={`mt-0.5 ${claudeHeroHeadingClass}`}>Tareas</h1>
                                            <p className={`mt-1 max-w-2xl ${claudeBodyClass}`}>
                                                Organiza el trabajo en columnas, asigna responsables y adjunta evidencia.
                                            </p>
                                            <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#6b7280]/20 dark:to-transparent" />
                                        </div>
                                    </div>
                                    <div ref={helpRef} className="relative shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setHelpOpen((v) => !v)}
                                            onMouseEnter={() => setHelpOpen(true)}
                                            aria-expanded={helpOpen}
                                            aria-controls="tareas-help-popover"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e7ded0] bg-[#fff8ed] text-sm font-semibold text-[#b45309] transition-colors hover:bg-[#ffedd5] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#fb923c] dark:hover:bg-[#1e293b]/80"
                                            aria-label="Ver ayuda contextual"
                                        >
                                            !
                                        </button>
                                        {helpOpen && (
                                            <div
                                                id="tareas-help-popover"
                                                onMouseLeave={() => setHelpOpen(false)}
                                                className="absolute right-0 top-full z-[120] mt-2 w-[18rem] rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-3 text-sm shadow-xl dark:border-[#273244] dark:bg-[#111a2b]"
                                            >
                                                <ul className="space-y-2 leading-relaxed text-[#57534e] dark:text-[#c7d0dc]">
                                                    <li>Arrastra tarjetas entre columnas para actualizar estado.</li>
                                                    <li>Adjunta hasta 2 fotos para evidencia operativa.</li>
                                                    <li>Usa el buscador para filtrar por responsable o descripcion.</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </header>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                                <div className="relative min-w-0 flex-1">
                                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 sm:left-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar por descripción o responsable…"
                                        className={searchInputClass}
                                        aria-label="Buscar tareas"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm("")}
                                            aria-label="Limpiar búsqueda"
                                            className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-7 min-w-[32px] items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] sm:h-8"
                                        >
                                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                                                <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                {canTareasCreate && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTarea(null);
                                            setShowModal(true);
                                        }}
                                        className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff801f] px-5 text-sm font-semibold text-black shadow-none transition-colors hover:bg-[#ff6a00] active:brightness-95 sm:w-auto"
                                    >
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                        Nueva tarea
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#273244] dark:bg-[#111a2b]/90">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8]">Totales</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">{tareaStats.total}</p>
                                </div>
                                <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#273244] dark:bg-[#111a2b]/90">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8]">Asignadas</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">{tareaStats.asignadas}</p>
                                </div>
                                <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#273244] dark:bg-[#111a2b]/90">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8]">Con evidencia</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">{tareaStats.conFotos}</p>
                                </div>
                            </div>
                            <ComponentCard
                                compact
                                title="Tablero Kanban"
                                desc="Arrastra tarjetas entre columnas para actualizar el estado."
                                className="overflow-hidden border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)]"
                            >
                                {!canTareasView ? (
                                    <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500">
                                            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4Z" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M9 12h6" strokeLinecap="round" />
                                            </svg>
                                        </span>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sin acceso</div>
                                            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">No tienes permisos para ver las tareas.</div>
                                        </div>
                                    </div>
                                ) : loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="flex items-center gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                            <svg className="h-4.5 w-4.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                                            </svg>
                                            Cargando tareas...
                                        </div>
                                    </div>
                                ) : shownList.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3b9eff]/10 text-[#3b9eff]">
                                            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M9 3h6a2 2 0 0 1 2 2v2H7V5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
                                                <path d="M7 7h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z" strokeLinejoin="round" />
                                                <path d="M9 11h6" strokeLinecap="round" />
                                                <path d="M9 15h3" strokeLinecap="round" />
                                            </svg>
                                        </span>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">No hay tareas</div>
                                            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Crea una nueva tarea para empezar.</div>
                                        </div>
                                        {canTareasCreate && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingTarea(null);
                                                    setShowModal(true);
                                                }}
                                                className="inline-flex items-center gap-2 rounded-full bg-[#ff801f] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#ff6a00]"
                                            >
                                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
                                                    <path d="M12 5v14M5 12h14" />
                                                </svg>
                                                Crear Tarea
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <MobileTareaList
                                            tareas={shownList}
                                            startIndex={0}
                                            loading={loading}
                                            formatDate={(date: string) => formatDate(date)}
                                            onDescripcion={(t: any) => openDescripcionModal(t)}
                                            onFotos={(t: any) => openFotosModal(t)}
                                            onEdit={canTareasEdit ? (t: any) => handleEdit(t) : undefined}
                                            onDelete={canTareasDelete ? (t: any) => handleDeleteClick(t) : undefined}
                                            canEdit={canTareasEdit}
                                            canDelete={canTareasDelete}
                                    onChangeEstado={(t: Tarea, estado) => handleMobileEstadoChange(t, estado)}
                                        />

                                        <div ref={kanbanRootRef} className="hidden md:block">
                                            <div className="-mx-1 px-1">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {KANBAN_COLUMNS.map((col) => {
                                                        const columnRef = (el: HTMLDivElement | null) => {
                                                            if (!el) return;
                                                            const existing = dndCleanupRef.current.get(el);
                                                            if (existing) existing();
                                                            const cleanup = dropTargetForElements({
                                                                element: el,
                                                                getData: () => ({
                                                                    kind: "column",
                                                                    estado: col.key,
                                                                    index: (tasksByEstado[col.key] || []).length,
                                                                }),
                                                            });
                                                            dndCleanupRef.current.set(el, cleanup);
                                                        };

                                                        const list = tasksByEstado[col.key] || [];
                                                        return (
                                                            <div
                                                                key={col.key}
                                                                ref={columnRef}
                                                                className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 shadow-inner dark:border-[#273244] dark:bg-[#0f172a]/85"
                                                            >
                                                                <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-black/[0.06] pb-2 dark:border-white/10">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`h-1.5 w-1.5 rounded-full ${col.key === 'TODO' ? 'bg-blue-500' : col.key === 'EN_PROGRESO' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                                                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">{col.label}</div>
                                                                    </div>
                                                                    <div className="text-xs tabular-nums rounded-md border border-[#e7ded0] bg-white/90 px-2 py-0.5 font-medium text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#94a3b8]">
                                                                        {list.length}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2 min-h-[60px]">
                                                                    {list.map((tarea, idx) => {
                                                                        const usuarioNombre =
                                                                            tarea.usuario_asignado_full_name || tarea.usuario_asignado_username || "-";
                                                                        const initial =
                                                                            usuarioNombre && usuarioNombre !== "-"
                                                                                ? usuarioNombre.slice(0, 1).toUpperCase()
                                                                                : "-";
                                                                        const cardRef = (el: HTMLDivElement | null) => {
                                                                            if (!el) return;
                                                                            const existing = dndCleanupRef.current.get(el);
                                                                            if (existing) existing();
                                                                            const cleanupDrag = draggable({
                                                                                element: el,
                                                                                getInitialData: () => ({ type: "tarea", id: tarea.id }),
                                                                            });
                                                                            const cleanupDrop = dropTargetForElements({
                                                                                element: el,
                                                                                getData: () => ({
                                                                                    kind: "card",
                                                                                    estado: col.key,
                                                                                    index: idx,
                                                                                    id: tarea.id,
                                                                                }),
                                                                            });
                                                                            dndCleanupRef.current.set(el, () => {
                                                                                cleanupDrag();
                                                                                cleanupDrop();
                                                                            });
                                                                        };

                                                                        return (
                                                                            <div
                                                                                key={tarea.id}
                                                                                ref={cardRef}
                                                                                className="group cursor-grab rounded-xl border border-[#e7ded0] bg-white/95 p-2.5 shadow-[0_12px_28px_-18px_rgba(28,25,23,0.35)] transition-all hover:-translate-y-px hover:border-[#ff801f]/40 hover:bg-white dark:border-[#334155] dark:bg-[#111a2b] dark:hover:border-[#fb923c]/35 dark:hover:bg-[#1e293b]/90 active:cursor-grabbing"
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="inline-flex shrink-0 items-center justify-center h-7 w-7 rounded-full bg-[#3b9eff]/10 text-[#3b9eff] text-xs font-semibold">
                                                                                        {initial}
                                                                                    </span>
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
                                                                                            {usuarioNombre}
                                                                                        </div>
                                                                                        <div className="text-[11px] text-gray-400 dark:text-gray-500">
                                                                                            {formatDate(tarea.fecha_creacion)}
                                                                                        </div>
                                                                                    </div>

                                                                                    {(canTareasEdit || canTareasDelete) && (
                                                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                                                                                            {canTareasEdit && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleEdit(tarea)}
                                                                                                    className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-[#3b9eff] dark:hover:text-[#3b9eff] transition-colors"
                                                                                                    title="Editar"
                                                                                                    aria-label="Editar"
                                                                                                >
                                                                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            )}
                                                                                            {canTareasDelete && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleDeleteClick(tarea)}
                                                                                                    className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                                                                    title="Eliminar"
                                                                                                    aria-label="Eliminar"
                                                                                                >
                                                                                                    <TrashBinIcon className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#f5f0e8] pt-1.5 dark:border-[#334155]/60">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => openDescripcionModal(tarea)}
                                                                                        className="text-[11px] font-medium text-[#ff801f] dark:text-[#ffa057] hover:underline"
                                                                                    >
                                                                                        Descripción
                                                                                    </button>
                                                                                    {Array.isArray(tarea.fotos_urls) && tarea.fotos_urls.length > 0 && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => openFotosModal(tarea)}
                                                                                            className="text-[11px] font-medium text-[#ff801f] dark:text-[#ffa057] hover:underline"
                                                                                        >
                                                                                            Fotos ({tarea.fotos_urls.length})
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </ComponentCard>
                        </div>
                    </div>
                </div>

            <Modal
                mobileBottomSheet
                isOpen={showModal}
                onClose={handleCloseModal}
                closeOnBackdropClick={false}
                className="flex max-h-[min(92vh,780px)] w-[min(94vw,38rem)] flex-col overflow-hidden rounded-xl border border-[#e7ded0] p-0 shadow-xl dark:border-[#273244] dark:bg-[#111a2b] sm:max-w-lg"
            >
                <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                    <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-[#111827] sm:pr-16">
                        <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                                    <path d="M9 3h6a2 2 0 0 1 2 2v2H7V5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
                                    <path d="M7 7h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z" strokeLinejoin="round" />
                                    <path d="M9 11h6M9 15h3" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className={sectionLabelClass}>Mi escritorio · Tareas</p>
                                    {editingTarea ? (
                                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400">
                                            Edición
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-[#ff801f]/25 bg-[#ff801f]/10 px-2 py-0.5 text-[10px] font-semibold text-[#ff801f] dark:text-[#ffa057]">
                                            Nueva
                                        </span>
                                    )}
                                </div>
                                <h2 className={`mt-1 ${claudeSectionHeadingClass}`}>
                                    {editingTarea ? "Editar Tarea" : "Crear Tarea"}
                                </h2>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Defina responsable y descripción; las fotos son opcionales.
                                </p>
                            </div>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit} className="flex min-h-0 w-full flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-white px-4 py-4 pb-5 dark:bg-[#121821] sm:px-5 custom-scrollbar">
                            {modalAlert.show && (
                                <Alert variant={modalAlert.variant} title={modalAlert.title} message={modalAlert.message} showLink={false} />
                            )}

                            <section className={modalPanelClass}>
                                <div className="mb-4 flex flex-col gap-0.5 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                                    <p className={sectionLabelClass}>Asignación</p>
                                    <p className={claudeSubheadingClass}>Persona responsable</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Busque por nombre o correo en el directorio.</p>
                                </div>
                                <div className="relative min-w-0">
                                    <label htmlFor="tarea-usuario-search" className={modalFieldLabelClass}>
                                        Usuario<span className={modalRequiredMark}>*</span>
                                    </label>
                                    <div className="relative mt-2">
                                        <svg
                                            className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            aria-hidden
                                        >
                                            <circle cx="11" cy="11" r="7" />
                                            <path d="m20 20-2-2" />
                                        </svg>
                                        <input
                                            id="tarea-usuario-search"
                                            value={usuarioSearch}
                                            onChange={(e) => {
                                                setUsuarioSearch(e.target.value);
                                                setUsuarioOpen(true);
                                            }}
                                            onFocus={() => setUsuarioOpen(true)}
                                            placeholder="Nombre o correo…"
                                            className={`${modalUsuarioInputClass} pl-9 pr-[5.5rem]`}
                                            autoComplete="off"
                                        />
                                        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                                            {formData.usuario_asignado && (
                                                <button
                                                    type="button"
                                                    onClick={() => selectUsuario(null)}
                                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-gray-500 transition-colors hover:border-gray-200/90 hover:bg-white hover:text-gray-800 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
                                                    aria-label="Quitar usuario asignado"
                                                >
                                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                        <path d="M18 6 6 18" />
                                                        <path d="m6 6 12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setUsuarioOpen((o) => !o)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200/80 bg-white text-gray-500 transition-colors hover:bg-gray-50 dark:border-[#2f3849] dark:bg-[#151d28] dark:hover:bg-white/[0.05]"
                                                aria-label="Abrir selector de usuario"
                                            >
                                                <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${usuarioOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" aria-hidden>
                                                    <path d="M5.25 7.5 10 12.25 14.75 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {usuarioOpen && (
                                        <div className="absolute z-30 mt-2 max-h-52 w-full overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-lg shadow-gray-900/[0.04] ring-1 ring-black/[0.02] dark:border-[#2f3849] dark:bg-[#121821] dark:shadow-none dark:ring-white/[0.04]">
                                            <div className="max-h-52 overflow-y-auto py-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => selectUsuario(null)}
                                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] ${!formData.usuario_asignado ? "bg-[#ff801f]/10 font-medium text-[#ff801f] dark:text-[#ffa057]" : "text-gray-800 dark:text-gray-200"}`}
                                                >
                                                    Sin asignar
                                                </button>
                                                {filteredUsuarios.map((u) => {
                                                    const nombre =
                                                        u.first_name || u.last_name
                                                            ? `${u.first_name} ${u.last_name}`.trim()
                                                            : u.username || u.email;
                                                    return (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            onClick={() => selectUsuario(u)}
                                                            className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:border-white/[0.05] dark:hover:bg-white/[0.04]"
                                                        >
                                                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-[#151d28] dark:text-gray-200">
                                                                {nombre.slice(0, 1).toUpperCase()}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{nombre}</span>
                                                                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                {filteredUsuarios.length === 0 && (
                                                    <div className="border-t border-gray-100 px-4 py-4 text-center text-sm text-gray-500 dark:border-white/[0.05] dark:text-gray-400">
                                                        Sin coincidencias
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className={modalPanelClass}>
                                <div className="mb-3 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                                    <p className={sectionLabelClass}>Descripción</p>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Qué hay que hacer y en qué contexto.</p>
                                </div>
                                <label htmlFor="descripcion" className={modalFieldLabelClass}>
                                    Detalle de la tarea<span className={modalRequiredMark}>*</span>
                                </label>
                                <textarea
                                    id="descripcion"
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    rows={4}
                                    placeholder="Ej. Revisar inventario en almacén B el martes antes del corte."
                                    className={`${modalTextareaClass} mt-2`}
                                />
                            </section>

                            <section className={modalPanelClass}>
                                <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                                    <div>
                                        <p className={sectionLabelClass}>Evidencia</p>
                                        <p className={`mt-1 ${claudeSubheadingClass}`}>Fotos adjuntas</p>
                                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Opcional · PNG, JPG o WEBP · máx. 2</p>
                                    </div>
                                    <span className="tabular-nums text-xs font-medium text-gray-400 dark:text-gray-500">
                                        {formData.fotos_urls.length}/2
                                    </span>
                                </div>
                                <div
                                    {...getRootProps()}
                                    className={`flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed border-gray-300/80 bg-gray-50/60 px-4 py-5 transition-all dark:border-[#2f3849] dark:bg-[#151d28] sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${isDragActive ? "border-[#ff801f]/70 bg-[#ff801f]/10 ring-2 ring-[#ff801f]/20 dark:border-[#ff801f]/60 dark:bg-[#ff801f]/10" : "hover:border-gray-400/60 dark:hover:border-white/[0.18]"} ${formData.fotos_urls.length >= 2 ? "pointer-events-none opacity-45" : ""}`}
                                >
                                    <input {...getInputProps()} />
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-500 dark:border-[#2f3849] dark:bg-[#151d28] dark:text-gray-400">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                                            <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" strokeLinejoin="round" />
                                            <path d="M12 10v6M9 13h6" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formData.fotos_urls.length >= 2 ? "Límite de 2 fotos" : "Añadir imágenes"}
                                        </p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                            {formData.fotos_urls.length >= 2
                                                ? "Elimine una foto para subir otra."
                                                : "Arrastre archivos aquí o pulse para elegir desde su equipo."}
                                        </p>
                                    </div>
                                </div>

                                {formData.fotos_urls.length > 0 && (
                                    <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-3.5">
                                        {formData.fotos_urls.map((url, idx) => (
                                            <li
                                                key={idx}
                                                className="relative overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-sm dark:border-[#2f3849] dark:bg-[#151d28] dark:shadow-none"
                                            >
                                                <img src={url} alt={`Vista previa ${idx + 1}`} className="aspect-[4/3] h-28 w-full object-cover sm:h-32" />
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDelete({ open: true, index: idx, url })}
                                                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/95 text-gray-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-error-600 dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-200 dark:hover:text-error-400"
                                                    aria-label={`Eliminar foto ${idx + 1}`}
                                                >
                                                    <TrashBinIcon className="h-4 w-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>

                        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-[#2f3849] dark:bg-[#151d28] sm:px-5">
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#2f3849] dark:bg-[#151d28] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06] sm:w-auto"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#ff801f] px-4 text-sm font-medium text-black transition-colors hover:bg-[#ff6a00] active:brightness-95 sm:w-auto"
                                >
                                    {editingTarea ? "Guardar cambios" : "Crear Tarea"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal de detalle - Descripción */}
            <Modal
                mobileBottomSheet
                isOpen={descripcionModal.open}
                onClose={() => setDescripcionModal({ open: false, content: '' })}
                closeOnBackdropClick={false}
                className="max-w-xl w-[94vw]"
            >
                <div className="p-0 overflow-hidden rounded-xl border border-gray-200 dark:border-[#2f3849] dark:bg-[#121821]">
                    <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[#2f3849] bg-gray-50 dark:bg-[#151d28]">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#ff801f]/10 text-[#ff801f] dark:text-[#ffa057]">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" strokeLinejoin="round" /><path d="M14 2v4h4" strokeLinejoin="round" /><path d="M8 10h8M8 14h8" strokeLinecap="round" /></svg>
                            </span>
                            <div className="min-w-0">
                                <h3 className={claudeSubheadingClass}>Descripción</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Detalle completo de la tarea</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 text-sm text-gray-700 dark:text-gray-300 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-[#2f3849] dark:bg-[#151d28]">
                            <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed font-sans text-sm text-gray-700 dark:text-gray-300">{descripcionModal.content || '-'}</pre>
                        </div>
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-[#2f3849] bg-gray-50 dark:bg-[#151d28] text-right">
                        <button type="button" onClick={() => setDescripcionModal({ open: false, content: '' })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#2f3849] dark:bg-[#121821] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]">Cerrar</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de detalle - Fotos */}
            <Modal mobileBottomSheet isOpen={fotosModal.open} onClose={() => setFotosModal({ open: false, urls: [] })} closeOnBackdropClick={false} className="max-w-2xl w-[94vw]">
                <div className="p-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#3b9eff]/10 text-[#3b9eff]">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" strokeLinejoin="round" /><circle cx="12" cy="13" r="3" /></svg>
                            </span>
                            <div className="min-w-0">
                                <h3 className={claudeSubheadingClass}>Fotos adjuntas</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Imágenes de evidencia</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {Array.isArray(fotosModal.urls) && fotosModal.urls.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {fotosModal.urls.map((url, idx) => (
                                    <a
                                        key={`${url}-${idx}`}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group relative block overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30"
                                    >
                                        <img src={url} alt={`Foto ${idx + 1}`} className="h-40 w-full object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/40 to-transparent">
                                            <span className="text-xs text-white/90">Ver en tamaño completo →</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-400 dark:text-gray-500">Sin fotos adjuntas</div>
                        )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 text-right">
                        <button type="button" onClick={() => setFotosModal({ open: false, urls: [] })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750">Cerrar</button>
                    </div>
                </div>
            </Modal>

            <Modal
                mobileBottomSheet
                isOpen={showDeleteModal}
                onClose={handleCancelDelete}
                closeOnBackdropClick={false}
                className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 dark:border-[#2f3849] dark:bg-[#121821]"
            >
                <div className="p-5 dark:bg-[#121821]">
                    <div className="flex items-start gap-3 mb-4">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/10 text-[#ff801f] dark:text-[#ffa057]">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                <path d="M3 6h18" strokeLinecap="round" />
                                <path d="M8 6V4h8v2" strokeLinecap="round" />
                                <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                            </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                            <h3 className={claudeSubheadingClass}>Eliminar tarea</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={handleCancelDelete}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#2f3849] dark:bg-[#151d28] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#ff801f] px-4 text-sm font-medium text-black transition-colors hover:bg-[#ff6a00] active:brightness-95"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                mobileBottomSheet
                isOpen={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, index: null, url: null })}
                closeOnBackdropClick={false}
                className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 dark:border-[#2f3849] dark:bg-[#121821]"
            >
                <div className="p-5 dark:bg-[#121821]">
                    <div className="flex items-start gap-3 mb-4">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/10 text-[#ff801f] dark:text-[#ffa057]">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                <path d="M3 6h18" strokeLinecap="round" />
                                <path d="M8 6V4h8v2" strokeLinecap="round" />
                                <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                            </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                            <h3 className={claudeSubheadingClass}>Eliminar foto</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">La foto se eliminará permanentemente.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setConfirmDelete({ open: false, index: null, url: null })}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#2f3849] dark:bg-[#151d28] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (confirmDelete.index !== null && confirmDelete.url) {
                                    handleDeletePhoto(confirmDelete.index, confirmDelete.url);
                                }
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#ff801f] px-4 text-sm font-medium text-black transition-colors hover:bg-[#ff6a00] active:brightness-95"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
