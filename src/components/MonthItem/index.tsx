import classNames from "classnames";
import styles from "./styles.module.scss";

interface MonthItemProps {
  month: string;
  imageUrl?: string;
  name?: string;
  artist?: string;
  scrobbles?: number;
  rounded?: boolean;
}

export function MonthItem({ month, imageUrl, name, artist, scrobbles, rounded }: MonthItemProps) {
  return (
    <div className={styles.monthItem}>
      <div className={styles.monthName}>{month}</div>
      <div
        className={classNames(styles.imageBox, { [styles.rounded]: rounded })}
        style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : "none" }}
      >
        {!imageUrl && <span className={styles.placeholder}>.</span>}
      </div>
      {rounded ? (
        <>
          <span className={styles.itemName} title={name}>{name}</span>
          <span className={styles.scrobblesQty}><b>{scrobbles}</b> scrobbles</span>
        </>
      ) : (
        <>
          <span className={styles.itemName} title={`❝${name}❞`}>❝{name}❞</span>
          <span className={styles.artistName} title={`by ${artist}`}>by {artist}</span>
          <span className={styles.scrobblesQty}><b>{scrobbles}</b> scrobbles</span>
        </>
      )}
    </div>
  );
}
