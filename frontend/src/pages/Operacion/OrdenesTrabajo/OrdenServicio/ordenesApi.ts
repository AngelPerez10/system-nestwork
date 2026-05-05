import { apiUrl, getAuthHeaders } from "@/config/api";

export type OrdenApiPayload = Record<string, unknown>;

const jsonHeaders = (): HeadersInit => ({
  ...getAuthHeaders(),
  "Content-Type": "application/json",
});

const parseRows = (data: unknown) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: unknown[] }).results;
  }
  return [];
};

export async function listOrdenes() {
  const response = await fetch(apiUrl(`/api/ordenes/?_ts=${Date.now()}`), {
    headers: jsonHeaders(),
    cache: "no-store" as RequestCache,
  });

  const data = await response.json().catch(() => null);
  return { response, rows: parseRows(data), data };
}

export async function getOrdenById(id: number) {
  const response = await fetch(apiUrl(`/api/ordenes/${id}/`), {
    headers: jsonHeaders(),
    cache: "no-store" as RequestCache,
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function createOrden(payload: OrdenApiPayload) {
  const response = await fetch(apiUrl("/api/ordenes/"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function updateOrden(id: number, payload: OrdenApiPayload) {
  const response = await fetch(apiUrl(`/api/ordenes/${id}/`), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function deleteOrden(id: number) {
  const response = await fetch(apiUrl(`/api/ordenes/${id}/`), {
    method: "DELETE",
    headers: jsonHeaders(),
  });
  return { response };
}
