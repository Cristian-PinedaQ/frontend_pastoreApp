import { useEffect, useState, useCallback } from "react";

const getInitialTheme = () => {
  const stored = localStorage.getItem("theme");
  if (stored) return stored === "dark";

  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
};

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => getInitialTheme());

  useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.classList.add("dark", "dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark", "dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "theme" && e.newValue !== null) {
        setIsDark(e.newValue === "dark");
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return { isDark, toggleTheme };
};

export default useTheme;
