import { ReloadIcon } from "@radix-ui/react-icons";
import styles from "./styles.module.scss";

interface SpinnerProps {
  size?: "small" | "medium" | "large";
}

export function Spinner({ size = "medium" }: SpinnerProps) {
  return (
    <span className={`${styles.spinner} ${styles[size]}`}>
      <ReloadIcon />
    </span>
  );
}

