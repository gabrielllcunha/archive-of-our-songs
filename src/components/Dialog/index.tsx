import styles from "./styles.module.scss";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";

interface DialogProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
}

export function Dialog({ trigger, children }: DialogProps) {
    return (
        <RadixDialog.Root>
            <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>
            <RadixDialog.Portal>
                <RadixDialog.Overlay className={styles.overlay} />
                <RadixDialog.Content className={styles.content}>
                    <RadixDialog.Close className={styles.closeButton}>
                        <Cross2Icon />
                    </RadixDialog.Close>
                    {children}
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
}
