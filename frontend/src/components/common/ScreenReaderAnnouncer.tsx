import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScreenReaderAnnouncerProps {
  children?: ReactNode;
}

let sharedSetPoliteness: ((politeness: "polite" | "assertive") => void) | null = null;
let sharedSetMessage: ((message: string) => void) | null = null;

export function announceToScreenReader(message: string, politeness: "polite" | "assertive" = "polite") {
  if (!message) return;
  sharedSetPoliteness?.(politeness);
  sharedSetMessage?.(message);
}

export default function ScreenReaderAnnouncer({ children }: ScreenReaderAnnouncerProps) {
  const [politeness, setPolitenessState] = useState<"polite" | "assertive">("polite");
  const [message, setMessageState] = useState("");
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    sharedSetPoliteness = setPolitenessState;
    sharedSetMessage = (msg: string) => {
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
      setMessageState("");
      requestAnimationFrame(() => {
        setMessageState(msg);
        clearTimer.current = window.setTimeout(() => setMessageState(""), 8000);
      });
    };
    return () => {
      sharedSetPoliteness = null;
      sharedSetMessage = null;
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    };
  }, []);

  return (
    <>
      <div
        role="status"
        aria-live={politeness}
        aria-atomic="true"
        className="visually-hidden"
      >
        {message}
      </div>
      {children}
    </>
  );
}
