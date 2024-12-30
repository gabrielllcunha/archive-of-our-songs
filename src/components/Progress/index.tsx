import styles from "./styles.module.scss";
import * as RadixProgress from "@radix-ui/react-progress";

interface ProgressProps {
    value: number;
}

export function Progress({ value }: ProgressProps) {
    return (
        <RadixProgress.Root
            className={styles.progressRoot}
            value={value}
        >
            <RadixProgress.Indicator
                className={styles.progressIndicator}
                style={{ transform: `translateX(-${100 - value}%)` }}
            />
        </RadixProgress.Root>
    );
}