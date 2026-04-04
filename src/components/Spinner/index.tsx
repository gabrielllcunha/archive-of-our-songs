import type { ReactNode } from "react";
import { Spinner as RadixSpinner } from "@radix-ui/themes";
import styles from "./styles.module.scss";

interface SpinnerProps {
  size?: "small" | "medium" | "large";
  loading?: boolean;
  children?: ReactNode;
}

export function Spinner({ size = "medium", loading = true, children }: SpinnerProps) {
  return (
    <span className={`${styles.spinner} ${styles[size]}`}>
      <RadixSpinner size="2" loading={loading}>
        {children}
      </RadixSpinner>
    </span>
  );
}
