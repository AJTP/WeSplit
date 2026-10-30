import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Diálogo nativo: gestiona el foco y el fondo. Quien lo usa decide cuándo
// desmontarlo; Escape se reenvía a onClose.
export function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    // Sin listener de "close": ese evento es asíncrono y, en StrictMode, la limpieza
    // del montaje anterior lo dispararía dentro del montaje siguiente.
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        // "cancel" es Escape, antes de cerrar: lo impedimos y dejamos que el padre decida.
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="modal-title"
      className="m-auto w-[min(92vw,34rem)] rounded-[2rem] border border-line bg-surface p-0 text-ink shadow-[0_40px_120px_-30px_rgb(0_0_0/.85)] backdrop:bg-canvas/70 backdrop:backdrop-blur-sm open:animate-rise"
    >
      <div className="flex flex-col gap-6 p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-accent" />
          <h2 id="modal-title" className="display text-2xl text-ink">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </dialog>
  );
}
