"use client";

import { useLayoutEffect, useState } from "react";
import { Toaster } from "sonner";
import { THEME_STORAGE_KEY, applyTheme, preferredTheme, type Theme } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    applyTheme(preferredTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) applyTheme(preferredTheme());
    };
    media.addEventListener("change", onChange);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <>
      {children}
      <Toaster position="top-right" theme={theme} />
    </>
  );
}
