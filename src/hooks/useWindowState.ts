import { useEffect, useRef } from "react";
import { appWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import type { WindowState } from "../types";
import { appStorage } from "../utils/storage";

interface UseWindowStateOptions {
  storageKey: "windowState" | "settingsWindowState";
  autoSaveInterval?: number; // in milliseconds
}

export function useWindowState(options: UseWindowStateOptions) {
  const { storageKey, autoSaveInterval = 2000 } = options;
  const intervalRef = useRef<number | null>(null);

  // Save window state to localStorage
  const saveWindowState = async () => {
    try {
      const size = await appWindow.outerSize();
      const position = await appWindow.outerPosition();

      const state: WindowState = {
        width: size.width,
        height: size.height,
        x: position.x,
        y: position.y,
      };

      if (storageKey === "windowState") {
        appStorage.setWindowState(state);
      } else {
        appStorage.setSettingsWindowState(state);
      }
    } catch (e) {
      console.error("Failed to save window state:", e);
    }
  };

  // Restore window state from localStorage
  const restoreWindowState = async () => {
    try {
      const state =
        storageKey === "windowState"
          ? appStorage.getWindowState()
          : appStorage.getSettingsWindowState();

      if (state) {
        // Restore size
        if (state.width && state.height) {
          await appWindow.setSize(new LogicalSize(state.width, state.height));
        }

        // Restore position
        if (state.x !== undefined && state.y !== undefined) {
          await appWindow.setPosition(new LogicalPosition(state.x, state.y));
        }
      }
    } catch (e) {
      console.error("Failed to restore window state:", e);
    }
  };

  useEffect(() => {
    // Restore window state on mount
    restoreWindowState();

    // Setup auto-save interval
    intervalRef.current = window.setInterval(saveWindowState, autoSaveInterval);

    // Save on unmount
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      saveWindowState();
    };
  }, [storageKey, autoSaveInterval]);

  return { saveWindowState, restoreWindowState };
}
