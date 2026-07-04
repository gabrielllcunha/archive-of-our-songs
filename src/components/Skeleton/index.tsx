import { Skeleton as RadixSkeleton } from "@radix-ui/themes";
import styles from "./styles.module.scss";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <RadixSkeleton loading className={`${styles.skeleton} ${className ?? ""}`} />
  );
}
