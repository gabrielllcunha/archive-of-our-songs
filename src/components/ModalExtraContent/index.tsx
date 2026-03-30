import { ArchiveIcon } from "@radix-ui/react-icons";
import { Dialog } from "../Dialog";
import styles from "./styles.module.scss";

export function ModalExtraContent() {
  return (
    <Dialog trigger={
      <div className={styles.secretIcon}>
        <ArchiveIcon height={24} width={24} />
      </div>
    }>
      <div className={styles.dialogContent}>
        <span>Coming soon...</span>
      </div>
    </Dialog>
  );
}
