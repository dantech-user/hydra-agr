"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";

let modalLockCount = 0;
let bodyOverflowBeforeModal = "";

function lockBodyScroll() {
  if (modalLockCount === 0) {
    bodyOverflowBeforeModal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  modalLockCount += 1;
}

function unlockBodyScroll() {
  modalLockCount = Math.max(0, modalLockCount - 1);
  if (modalLockCount === 0) document.body.style.overflow = bodyOverflowBeforeModal;
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  action,
  onBack,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <header className="screen-header">
      <div className="screen-header-row">
        {onBack && (
          <button className="icon-button quiet" onClick={onBack} aria-label="Voltar">
            <ChevronLeft size={23} strokeWidth={2.1} />
          </button>
        )}
        <div className="screen-heading">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <div className="screen-action">{action}</div>}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
  tall = false,
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  tall?: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      onClose();
      setClosing(false);
    }, 240);
  }, [closing, onClose]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      unlockBodyScroll();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, requestClose]);

  if (!open) return null;
  return (
    <div className={`modal-layer ${closing ? "is-closing" : ""}`} role="presentation" onMouseDown={requestClose}>
      <section
        className={`modal-sheet ${wide ? "modal-wide" : ""} ${tall ? "modal-tall" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="modal-head">
          <div>
            {eyebrow && <span className="eyebrow orange">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={requestClose} aria-label="Fechar">
            <X size={22} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      className={`toggle ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = "Confirmar",
  onCancel,
  onConfirm,
  busy = false,
  danger = true,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal open={open} title={title} eyebrow="CONFIRMAÇÃO OBRIGATÓRIA" onClose={onCancel}>
      <div className="confirm-action">
        <span><X size={27} /></span>
        <p>{text}</p>
        <div className="modal-action-row">
          <button className="secondary-button" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button className={danger ? "danger-button" : "primary-button"} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
