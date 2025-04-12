import styles from "./styles.module.scss";
import * as RadixProgress from "@radix-ui/react-progress";

interface ProgressProps {
    value: number | null;
}

export function Progress({ value }: ProgressProps) {
    return (
        <RadixProgress.Root
            className={styles.progressRoot}
            value={value ?? undefined}
        >
            <RadixProgress.Indicator
                className={styles.progressIndicator}
                style={
                    value !== null
                        ? { transform: `translateX(-${100 - value}%)` }
                        : undefined
                }
            />
        </RadixProgress.Root>
    );
}