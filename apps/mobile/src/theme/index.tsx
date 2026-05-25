import * as SecureStore from "expo-secure-store";
import * as React from "react";
import { useColorScheme } from "react-native";

import { darkColors, lightColors, type Colors } from "./colors";
import { elevation, radius, spacing } from "./spacing";
import { typography } from "./typography";

export type ThemeMode = "system" | "light" | "dark";

export type Theme = {
  scheme: "light" | "dark";
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof elevation;
};

const STORAGE_KEY = "loreal.theme.mode";

const lightTheme = {
  scheme: "light" as const,
  colors: lightColors,
  spacing,
  radius,
  typography,
  elevation,
};

const darkTheme = {
  scheme: "dark" as const,
  colors: darkColors,
  spacing,
  radius,
  typography,
  elevation,
};

const ThemeContext = React.createContext<Theme>({
  ...lightTheme,
  mode: "system",
  setMode: () => {},
});

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = React.useState<ThemeMode>("system");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!cancelled && isThemeMode(stored)) {
          setModeState(stored);
        }
      } catch {
        // SecureStore unavailable (e.g. web) — fall back to system.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = React.useCallback((next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {
      // Persistence is best-effort; in-memory state still updates.
    });
  }, []);

  const effectiveScheme: "light" | "dark" =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const value = React.useMemo<Theme>(() => {
    const base = effectiveScheme === "dark" ? darkTheme : lightTheme;
    return { ...base, mode, setMode };
  }, [effectiveScheme, mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return React.useContext(ThemeContext);
}

export { lightTheme, darkTheme };
export * from "./colors";
export * from "./spacing";
export * from "./typography";
