import styles from "./view-more.module.scss";

export default function ViewMore() {
  return (
    <div className={styles["view-more"]}>
      <div className={styles.circle}></div>
      <a href="">
        View more
        <img src="./images/home/arrow.svg" alt="" className={styles.arrow} />
      </a>
    </div>
  );
}
