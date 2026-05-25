import * as React from "react";
import { useColorScheme } from "react-native";

import { darkColors, lightColors, type Colors } from "./colors";
import { elevation, radius, spacing } from "./spacing";
import { typography } from "./typography";

export type Theme = {
  scheme: "light" | "dark";
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof elevation;
};

const lightTheme: Theme = {
  scheme: "light",
  colors: lightColors,
  spacing,
  radius,
  typography,
  elevation,
};

const darkTheme: Theme = {
  scheme: "dark",
  colors: darkColors,
  spacing,
  radius,
  typography,
  elevation,
};

const ThemeContext = React.createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return React.useContext(ThemeContext);
}

export { lightTheme, darkTheme };
export * from "./colors";
export * from "./spacing";
export * from "./typography";
