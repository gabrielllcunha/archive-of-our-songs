import styles from "./styles.module.scss";
import classNames from "classnames";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";

interface DialogProps {
    children: React.ReactNode;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose?: () => void;
    onOpenAutoFocus?: (event: Event) => void;
    initialConfig?: boolean;
    allowClose?: boolean;
    contentClassName?: string;
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
    contentClassName
}: DialogProps) {
    const handleOpenChange = (nextOpen: boolean) => {
        if (!allowClose && !nextOpen) {
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
                    className={classNames(styles.overlay, {
                        [styles.initialConfigOverlay]: initialConfig,
                    })}
                />
                <RadixDialog.Content
                    className={classNames(styles.content, contentClassName)}
                    onOpenAutoFocus={onOpenAutoFocus}
                    onPointerDownOutside={(event) => {
                        if (!allowClose) {
                            event.preventDefault();
                        }
                    }}
                    onInteractOutside={(event) => {
                        if (!allowClose) {
                            event.preventDefault();
                        }
                    }}
                    onFocusOutside={(event) => {
                        if (!allowClose) {
                            event.preventDefault();
                        }
                    }}
                    onEscapeKeyDown={(event) => {
                        if (!allowClose) {
                            event.preventDefault();
                        }
                    }}
                >
                    {allowClose && (
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
