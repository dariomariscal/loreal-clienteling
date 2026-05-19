import { useEffect } from "react";

interface KeybindingOptions {
  /** Single character key, case-insensitive (e.g. "c", "k", "/"). */
  key: string;
  /** Require Cmd (Mac) or Ctrl (other) modifier. */
  meta?: boolean;
  /** Fires only when no input/textarea/contenteditable is focused. Default true. */
  ignoreEditableTarget?: boolean;
}

/**
 * Registers a global keyboard shortcut. Skips events fired inside text inputs.
 */
export function useKeybinding(
  { key, meta = false, ignoreEditableTarget = true }: KeybindingOptions,
  handler: () => void,
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMatchKey = event.key.toLowerCase() === key.toLowerCase();
      if (!isMatchKey) return;

      const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
      const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
      if (meta && !modifierPressed) return;
      if (!meta && modifierPressed) return;

      if (ignoreEditableTarget) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
      }

      event.preventDefault();
      handler();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, meta, ignoreEditableTarget, handler]);
}
