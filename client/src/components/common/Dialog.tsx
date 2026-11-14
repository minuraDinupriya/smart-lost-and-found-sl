import { ReactNode, RefObject, useEffect, useRef } from 'react';

export default function Dialog({
  titleId,
  descriptionId,
  initialFocusRef,
  onClose,
  children,
}: {
  titleId: string;
  descriptionId?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    initialFocusRef?.current?.focus();
    return () => {
      element?.close();
      trigger?.focus();
    };
  }, [initialFocusRef]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-black/60 dark:bg-slate-800 dark:text-slate-100"
    >
      {children}
    </dialog>
  );
}
