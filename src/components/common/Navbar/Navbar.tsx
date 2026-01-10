import Link from "next/link";
import styles from "./navbar.module.scss";
import { useState, useEffect } from "react";
import Menu from "@/components/Menu";

interface NavbarProps {
  isLoggedIn?: boolean;
  variant?: "dark" | "light"; // dark = white icons (on image bg), light = colored icons (on white bg)
}

export default function Navbar({ isLoggedIn = false, variant = "dark" }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!isLoggedIn);

  // Keep local state in sync with parent prop (if provided)
  useEffect(() => {
    setIsAuthenticated(!!isLoggedIn);
  }, [isLoggedIn]);

  // Detect login status from localStorage so home navbar shows My Page after login
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("accessToken");
      setIsAuthenticated(!!token);
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  // Dark variant: white logo/icons (for pages with image backgrounds)
  // Light variant: colored logo/icons (for pages with white backgrounds)
  const isDark = variant === "dark";

  return (
    <nav className={`${styles.navbar} ${styles[`navbar--${variant}`]}`}>
      <div className={styles["navbar-container"]}>
        <Link href="/" className={styles["navbar-brand"]}>
          <div className={styles.logo}>
            <img
              src={isDark ? "./images/logo/logo.svg" : "./images/logo/logo_main.png"}
              alt="main_logo"
            />
          </div>
        </Link>

        <button className={styles["menu-btn"]} onClick={() => setOpen(true)} aria-label="메뉴 열기">
          {isDark ? (
            // White hamburger icon for dark backgrounds
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="#fff" strokeWidth="1.5" fill="none">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          ) : (
            // Dark/colored hamburger icon for light backgrounds
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="#333" strokeWidth="1.5" fill="none">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        <Menu isOpen={open} onClose={() => setOpen(false)} />
      </div>
    </nav>
  );
}
