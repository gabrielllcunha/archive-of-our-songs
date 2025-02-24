import classNames from "classnames";
import styles from "./styles.module.scss";
import { ImageIcon } from "@radix-ui/react-icons";

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
        {!imageUrl && (
          <div className={styles.placeholderWrapper}>
            <ImageIcon />
          </div>
        )}
      </div>
      {rounded ? (
        <>
          {name && <span className={styles.itemName} title={name}>{name}</span>}
          {scrobbles && <span className={styles.scrobblesQty}><b>{scrobbles}</b> scrobbles</span>}
        </>
      ) : (
        <>
          {name && <span className={styles.itemName} title={`❝${name}❞`}>❝{name}❞</span>}
          {artist && <span className={styles.artistName} title={`by ${artist}`}>by {artist}</span>}
          {scrobbles && <span className={styles.scrobblesQty}><b>{scrobbles}</b> scrobbles</span>}
        </>
      )}
    </div>
  );
}
