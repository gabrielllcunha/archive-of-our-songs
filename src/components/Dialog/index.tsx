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
    initialConfig?: boolean;
    allowClose?: boolean;
}

export function Dialog({
    trigger,
    children,
    open,
    onOpenChange,
    onClose,
    initialConfig,
    allowClose = true
}: DialogProps) {
    const handleOpenChange = (open: boolean) => {
        if (allowClose || open) {
            onOpenChange?.(open);
            if (!open) {
                onClose?.();
            }
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
                <RadixDialog.Content className={styles.content}>
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
