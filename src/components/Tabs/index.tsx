import React from "react";
import styles from "./styles.module.scss";
import * as RadixTabs from "@radix-ui/react-tabs";

interface TabsProps {
    defaultValue: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
}

export function Tabs({ defaultValue, onValueChange, children }: TabsProps) {
    return (
        <RadixTabs.Root
            defaultValue={defaultValue}
            onValueChange={onValueChange}
            className={styles.tabsRoot}
        >
            {children}
        </RadixTabs.Root>
    );
}

interface TabsListProps {
    children: React.ReactNode;
    sideIcons?: boolean;
}

export function TabsList({ children, sideIcons }: TabsListProps) {
    const tabs = React.Children.toArray(children).filter((child) => React.isValidElement(child) && child.type === TabsTrigger);
    const icons = React.Children.toArray(children).filter((child) => React.isValidElement(child) && child.type !== TabsTrigger);
    return (
        <RadixTabs.List
            className={`${styles.tabsList} ${sideIcons ? styles.sideIcons : ''}`}
        >
            <div className={styles.tabsContainer}>{tabs}</div>
            {sideIcons && <div className={styles.iconsContainer}>{icons}</div>}
        </RadixTabs.List>
    );
}

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
    return (
        <RadixTabs.Trigger value={value} className={styles.tabsTrigger}>
            {children}
        </RadixTabs.Trigger>
    );
}

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
}

export function TabsContent({ value, children }: TabsContentProps) {
    return (
        <RadixTabs.Content value={value} className={styles.tabsContent}>
            {children}
        </RadixTabs.Content>
    );
}
