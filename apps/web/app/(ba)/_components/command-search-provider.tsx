"use client";

import * as React from "react";
import { CommandSearch } from "./command-search";

interface CommandSearchContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandSearchContext = React.createContext<CommandSearchContextValue | null>(null);

// Mounts the cmd-K palette once at the shell level and exposes open/close
// to any descendant. Following Linear/Superhuman, the palette is the heart
// of navigation — keyboard-first, with mouse parity from the sidebar.
export function CommandSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdK) {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = React.useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  return (
    <CommandSearchContext.Provider value={value}>
      {children}
      <CommandSearch open={isOpen} onOpenChange={setIsOpen} />
    </CommandSearchContext.Provider>
  );
}

export function useCommandSearch() {
  const ctx = React.useContext(CommandSearchContext);
  if (!ctx) throw new Error("useCommandSearch must be used inside CommandSearchProvider");
  return ctx;
}
