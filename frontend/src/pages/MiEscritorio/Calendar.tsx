import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import PageMeta from "@/components/common/PageMeta";
import { apiUrl, getAuthHeaders } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

let calendarOrdenesInFlight: Promise<void> | null = null;

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    orderId?: number;
  };
}

type Orden = {
  id: number;
  idx?: number | null;
  cliente?: string | null;
  nombre_cliente?: string | null;
  tecnico_asignado?: number | null;
  fecha_inicio?: string | null;
  fecha_finalizacion?: string | null;
  fecha_creacion?: string | null;
  status?: "pendiente" | "resuelto" | string;
};

const addDays = (isoDate: string, days: number): string => {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const orderToEvent = (o: Orden): CalendarEvent | null => {
  const start = (o.fecha_inicio || o.fecha_creacion || "").toString().slice(0, 10);
  if (!start) return null;

  const rawEnd = (o.fecha_finalizacion || o.fecha_inicio || start).toString().slice(0, 10);
  const endExclusive = addDays(rawEnd, 1);

  const titleBase = o.idx != null ? `Orden ${o.idx}` : `Orden ${o.id}`;
  const cliente = (o.cliente || o.nombre_cliente || "").toString().trim();
  const title = cliente ? `${titleBase} - ${cliente}` : titleBase;
  const cal = o.status === "resuelto" ? "Success" : "Warning";

  return {
    id: `orden-${o.id}`,
    title,
    start,
    end: endExclusive,
    allDay: true,
    extendedProps: { calendar: cal, orderId: o.id },
  };
};

const renderEventContent = (eventInfo: any) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div className={`event-fc-color flex fc-event-main ${colorClass} rounded-sm p-1`}>
      <div className="fc-daygrid-event-dot" />
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};


const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const auth = useAuth();

  useEffect(() => {
    const loadOrdenes = async () => {
      try {
        if (calendarOrdenesInFlight) {
          await calendarOrdenesInFlight;
          return;
        }

        calendarOrdenesInFlight = (async () => {
          const res = await fetch(apiUrl("/api/ordenes/"), {
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
          });

          const data = await res.json().catch(() => null);
          if (!res.ok) {
            setEvents([]);
            return;
          }

          const rows: Orden[] = Array.isArray(data)
            ? data
            : Array.isArray((data as any)?.results)
              ? (data as any).results
              : [];

          if (!auth.isAdmin && auth.user && typeof (auth.user as any).id === 'number') {
            const meId = (auth.user as any).id;
            const filtered = rows.filter((o) => Number(o.tecnico_asignado) === Number(meId));
            setEvents(filtered.map(orderToEvent).filter(Boolean) as CalendarEvent[]);
            return;
          }

          setEvents(rows.map(orderToEvent).filter(Boolean) as CalendarEvent[]);
        })();

        await calendarOrdenesInFlight;
      } catch {
        setEvents([]);
      } finally {
        calendarOrdenesInFlight = null;
      }
    };

    loadOrdenes();
  }, [auth.isAdmin, auth.user]);

  return (
    <>
      <PageMeta
        title="Agenda | System NestWork"
        description="Vista de calendario con Ã³rdenes de trabajo por fecha."
      />

      <div className="sn-calendar-shell space-y-6">
        <div className="overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_24px_60px_-34px_rgba(28,25,23,0.2)] dark:border-[#273244] dark:bg-[#0f172a]/70">
          <div className="custom-calendar pb-4" role="region" aria-label="Calendario de órdenes de trabajo" aria-roledescription="calendar">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locale={esLocale}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              buttonText={{
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "DÃ­a",
                list: "Lista",
              }}
              allDayText="Todo el dÃ­a"
              moreLinkText={(n) => `+${n} mÃ¡s`}
              dayMaxEvents={3}
              noEventsText="No hay eventos para mostrar"
              events={events}
              eventContent={renderEventContent}
              titleFormat={{ year: 'numeric', month: 'long' }}
              navLinkDayClick={(date) => {/* keyboard accessible — FullCalendar handles Enter/Space */}}
              navLinkWeekClick={(date) => {/* keyboard accessible */}}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Calendar;


