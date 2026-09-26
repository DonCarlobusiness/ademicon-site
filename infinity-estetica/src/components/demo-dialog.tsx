"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AreaLabel } from "@/content/site";

type OpenDialog = (area?: AreaLabel) => void;

const DemoDialogContext = createContext<OpenDialog | null>(null);

/**
 * Every contact CTA routes here. In the approved version this would
 * open WhatsApp; in the concept nothing is sent, stored or tracked.
 */
export function DemoDialogProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [area, setArea] = useState<AreaLabel | undefined>();
  const titleId = useId();
  const descId = useId();

  const open = useCallback<OpenDialog>((selected) => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setArea(selected);
    dialog.showModal();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Native <dialog> already handles Escape (cancel → close) and makes the
    // rest of the page inert; we only make focus restoration explicit.
    const onClose = () => {
      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      if (target && document.contains(target)) {
        target.focus({ preventScroll: true });
      }
    };

    // Click on the backdrop (outside the panel) closes too.
    const onClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    };

    dialog.addEventListener("close", onClose);
    dialog.addEventListener("click", onClick);
    return () => {
      dialog.removeEventListener("close", onClose);
      dialog.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <DemoDialogContext.Provider value={open}>
      {children}
      <dialog
        ref={dialogRef}
        className="demo-dialog"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="px-6 pt-8 pb-6 sm:px-9 sm:pt-10 sm:pb-8">
          <p className="eyebrow">Conceito não oficial</p>
          <h2
            id={titleId}
            className="display mt-4 text-[2rem] leading-[1.08] sm:text-[2.375rem]"
          >
            Uma prévia da conversa.
          </h2>

          {area ? (
            <p className="mt-5 flex items-center gap-3 text-[0.9375rem] text-ink">
              <span aria-hidden="true" className="h-px w-6 bg-ochre" />
              <span>
                Área de interesse: <strong className="font-semibold">{area}</strong>
              </span>
            </p>
          ) : null}

          <p id={descId} className="mt-5 max-w-[30rem] text-muted">
            Este é um conceito não oficial por Nítido Studio. Na versão aprovada, este
            botão poderá abrir o WhatsApp da Infinity. Nesta demonstração, nenhuma
            mensagem será enviada.
          </p>

          <div className="mt-8 flex flex-col gap-3 border-t border-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">Nada é enviado ou armazenado.</p>
            <button
              type="button"
              autoFocus
              className="btn-primary justify-center"
              onClick={() => dialogRef.current?.close()}
            >
              Voltar à página
            </button>
          </div>
        </div>
      </dialog>
    </DemoDialogContext.Provider>
  );
}

function useDemoDialog() {
  const open = useContext(DemoDialogContext);
  if (!open) throw new Error("ConversationButton must be inside DemoDialogProvider");
  return open;
}

type ConversationButtonProps = {
  area?: AreaLabel;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

export function ConversationButton({
  area,
  className,
  children,
  ...rest
}: ConversationButtonProps) {
  const open = useDemoDialog();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={className}
      onClick={() => open(area)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 12"
      className={`arrow h-3 w-5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 6h17M13 1l5 5-5 5" />
    </svg>
  );
}
