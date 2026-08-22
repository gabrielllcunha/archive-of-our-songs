import styles from "./styles.module.scss";
import classNames from "classnames";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import {
    markToastInteraction,
    shouldIgnoreDialogDismiss,
} from "../Toast/dismissGuard";

interface DialogProps {
    children: React.ReactNode;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose?: () => void;
    onOpenAutoFocus?: (event: Event) => void;
    initialConfig?: boolean;
    allowClose?: boolean;
    showCloseButton?: boolean;
    contentClassName?: string;
    overlayClassName?: string;
    blockDismiss?: boolean;
}

type OutsideEvent = CustomEvent<{ originalEvent: Event }>;

function getOutsideEventTarget(event: OutsideEvent | Event): EventTarget | null {
    if ("detail" in event && event.detail && typeof event.detail === "object") {
        const detail = event.detail as { originalEvent?: Event };
        if (detail.originalEvent?.target) {
            return detail.originalEvent.target;
        }
    }
    return event.target;
}

function isToastEventTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    return Boolean(
        target.closest(
            "[data-toast-layer], [data-radix-toast-viewport], [data-radix-toast-root]"
        )
    );
}

function shouldBlockOutsideDismiss(event: OutsideEvent | Event, allowClose: boolean) {
    if (!allowClose) return true;
    if (shouldIgnoreDialogDismiss()) return true;

    const target = getOutsideEventTarget(event);
    if (isToastEventTarget(target)) {
        markToastInteraction();
        return true;
    }
    return false;
}

export function Dialog({
    trigger,
    children,
    open,
    onOpenChange,
    onClose,
    onOpenAutoFocus,
    initialConfig,
    allowClose = true,
    showCloseButton = allowClose,
    contentClassName,
    overlayClassName,
    blockDismiss = false
}: DialogProps) {
    const handleOpenChange = (nextOpen: boolean) => {
        if (!allowClose && !nextOpen) {
            return;
        }
        if (!nextOpen && shouldIgnoreDialogDismiss()) {
            return;
        }
        onOpenChange?.(nextOpen);
        if (!nextOpen) {
            onClose?.();
        }
    };

    return (
        <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
            {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
            <RadixDialog.Portal>
                <RadixDialog.Overlay
                    className={classNames(styles.overlay, overlayClassName, {
                        [styles.initialConfigOverlay]: initialConfig,
                    })}
                />
                <RadixDialog.Content
                    className={classNames(styles.content, contentClassName)}
                    onOpenAutoFocus={onOpenAutoFocus}
                    onPointerDownOutside={(event) => {
                        if (blockDismiss || shouldBlockOutsideDismiss(event, allowClose)) {
                            event.preventDefault();
                        }
                    }}
                    onInteractOutside={(event) => {
                        if (blockDismiss || shouldBlockOutsideDismiss(event, allowClose)) {
                            event.preventDefault();
                        }
                    }}
                    onFocusOutside={(event) => {
                        if (blockDismiss || shouldBlockOutsideDismiss(event, allowClose)) {
                            event.preventDefault();
                        }
                    }}
                    onEscapeKeyDown={(event) => {
                        if (!allowClose || blockDismiss) {
                            event.preventDefault();
                        }
                    }}
                >
                    {showCloseButton && (
                        <RadixDialog.Close className={styles.closeButton}>
                            <Cross2Icon />
                        </RadixDialog.Close>
                    )}
                    {children}
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
}
