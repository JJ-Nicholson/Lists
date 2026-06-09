import type { KeyboardEvent, ReactNode } from "react";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { Button } from "./Button";

type ModalProps = {
    actions?: ReactNode;
    ariaLabel?: string;
    children: ReactNode;
    className?: string;
    isOpen: boolean;
    onClose?: () => void;
    title?: string;
};

type ModalLabelProps =
    | { "aria-labelledby": string }
    | { "aria-label": string };

export default function Modal({
    actions,
    ariaLabel,
    children,
    className = "",
    isOpen,
    onClose,
    title,
}: ModalProps) {
    const panelRef = useRef<HTMLElement | null>(null);
    const titleId = useId();

    if (!isOpen) {
        return null;
    }

    const modalLabelProps: ModalLabelProps = title
        ? { "aria-labelledby": titleId }
        : { "aria-label": ariaLabel ?? "Dialog" };

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
        if (event.key === "Escape") {
            onClose?.();
        }
    }

    return createPortal(
        <FocusTrap
            focusTrapOptions={{
                escapeDeactivates: false,
                fallbackFocus: () => panelRef.current ?? document.body,
                initialFocus: () =>
                    panelRef.current?.querySelector<HTMLElement>(
                        "[data-autofocus]",
                    ) ?? undefined,
                returnFocusOnDeactivate: true,
            }}
        >
            <div
                className="modal"
                onKeyDown={handleKeyDown}
                role="presentation"
            >
                {onClose ? (
                    <button
                        aria-label="Close dialog"
                        className="modal__backdrop"
                        onClick={onClose}
                        tabIndex={-1}
                        type="button"
                    />
                ) : (
                    <div aria-hidden="true" className="modal__backdrop" />
                )}

                <section
                    className={["modal__panel", className]
                        .filter(Boolean)
                        .join(" ")}
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    tabIndex={-1}
                    {...modalLabelProps}
                >
                    {(title || onClose) && (
                        <header className="modal__header">
                            {title && (
                                <h2 className="modal__title" id={titleId}>
                                    {title}
                                </h2>
                            )}

                            {onClose && (
                                <Button
                                    aria-label="Close dialog"
                                    className="modal__close"
                                    onClick={onClose}
                                >
                                    Close
                                </Button>
                            )}
                        </header>
                    )}

                    <div className="modal__body">{children}</div>

                    {actions && (
                        <footer className="modal__actions">{actions}</footer>
                    )}
                </section>
            </div>
        </FocusTrap>,
        document.body,
    );
}
