import { useRouter } from "next/router";
import styles from "./view-more.module.scss";

export type ViewMoreTarget =
  | "about-intro"
  | "services"
  | "experts"
  | "insights"
  | "clients-customers";

interface ViewMoreProps {
  target: ViewMoreTarget;
}

export default function ViewMore({ target }: ViewMoreProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    let href = "";

    switch (target) {
      case "experts":
        href = "/experts";
        break;
      case "insights":
        href = "/insights";
        break;
      case "services":
        href = "/business-areas/hierarchical";
        break;
      case "clients-customers":
        href = "/history?tab=customers";
        break;
      case "about-intro":
      default:
        href = "/history?tab=intro";
        break;
    }

    if (href) {
      router.push(href);
    }
  };

  return (
    <div className={styles["view-more"]}>
      <div className={styles.circle}></div>
      <a href="#" onClick={handleClick}>
        View more
        <img src="./images/home/arrow.svg" alt="" className={styles.arrow} />
      </a>
    </div>
  );
}
