import styles from "./styles.module.scss";

interface MonthItemProps {
  month: string;
  imageUrl?: string;
  albumName?: string;
  artist?: string;
  scrobbles?: number;
}

export function MonthItem({ month, imageUrl, albumName, artist, scrobbles }: MonthItemProps) {
  return (
    <div className={styles.monthItem}>
      <div className={styles.monthName}>{month}</div>
      <div
        className={styles.imageBox}
        style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : "none" }}
      >
        {!imageUrl && <span className={styles.placeholder}>.</span>}
      </div>
    </div>
  );
}
