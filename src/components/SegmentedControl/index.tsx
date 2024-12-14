import { useEffect, useState } from "react";
import styles from "./styles.module.scss";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

interface SegmentedControlRootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: string;
  children: React.ReactNode;
}

export function SegmentedControlRoot({
  value,
  defaultValue,
  onValueChange,
  size = "1",
  children,
}: SegmentedControlRootProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(defaultValue);
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleValueChange = (newValue: string | undefined) => {
    if (newValue) {
      setSelectedValue(newValue);
      onValueChange?.(newValue);
    }
  };

  return (
    <ToggleGroupPrimitive.Root
      className={`${styles.segmentedControlRoot} ${styles[`size-${size}`]}`}
      type="single"
      value={selectedValue}
      onValueChange={handleValueChange}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  );
}

interface SegmentedControlItemProps {
  value: string;
  children: React.ReactNode;
}

export function SegmentedControlItem({
  value,
  children,
}: SegmentedControlItemProps) {
  return (
    <ToggleGroupPrimitive.Item
      className={styles.segmentedControlItem}
      value={value}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

SegmentedControlRoot.displayName = "SegmentedControl.Root";
SegmentedControlItem.displayName = "SegmentedControl.Item";

export const SegmentedControl = {
  Root: SegmentedControlRoot,
  Item: SegmentedControlItem,
};
