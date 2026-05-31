import styles from "./styles.module.scss";
import * as RadixProgress from "@radix-ui/react-progress";

interface ProgressProps {
    value: number | null;
    active?: boolean;
}

export function Progress({ value, active = false }: ProgressProps) {
    const clampedValue = value === null ? null : Math.min(100, Math.max(0, value));

    return (
        <RadixProgress.Root
            className={styles.progressRoot}
            value={clampedValue ?? undefined}
            max={100}
        >
            <RadixProgress.Indicator
                className={styles.progressIndicator}
                style={
                    clampedValue !== null
                        ? { transform: `translateX(-${100 - clampedValue}%)` }
                        : undefined
                }
            />
            {active && <span className={styles.progressSweep} aria-hidden />}
        </RadixProgress.Root>
    );
}
