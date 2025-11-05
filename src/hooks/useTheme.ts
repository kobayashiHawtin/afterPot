import { useEffect, useState } from "react";
import type { Theme } from "../types";
import { appStorage } from "../utils/storage";

// Apply theme to document
function applyTheme(theme: Theme) {
    let actualTheme: "light" | "dark";

    if (theme === "system") {
        // Detect system preference
        actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    } else {
        actualTheme = theme;
    }

    document.documentElement.setAttribute("data-theme", actualTheme);
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(() => {
        return appStorage.getTheme();
    });

    // Handle theme change
    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        appStorage.setTheme(newTheme);
        applyTheme(newTheme);
    };

    useEffect(() => {
        // Apply theme on mount
        applyTheme(theme);

        // Listen to system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleSystemThemeChange = () => {
            if (theme === "system") {
                applyTheme("system");
            }
        };

        mediaQuery.addEventListener("change", handleSystemThemeChange);

        return () => {
            mediaQuery.removeEventListener("change", handleSystemThemeChange);
        };
    }, [theme]);

    return { theme, setTheme };
}
