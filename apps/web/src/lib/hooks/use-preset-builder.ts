"use client";

import type { Preset } from "@create-turbo-stack/schema";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { DEFAULT_PRESET } from "../preset/defaults";
import { createEventBus, type EventBus } from "../preset/events";
import { type PresetAction, presetReducer } from "../preset/reducer";
import {
  loadPresetFromStorage,
  pushPresetToURL,
  readPresetFromURL,
  savePresetToStorage,
} from "../preset/serialization";

export type ValidationError = {
  path: (string | number)[];
  message: string;
};

export type UsePresetBuilderReturn = {
  preset: Preset;
  dispatch: (action: PresetAction) => void;
  validationErrors: ValidationError[];
  isValid: boolean;
  eventBus: EventBus;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const MAX_HISTORY = 50;

export function usePresetBuilder(): UsePresetBuilderReturn {
  const eventBus = useMemo(() => createEventBus(), []);

  // Always start with DEFAULT_PRESET to avoid hydration mismatch.
  // URL/storage presets are loaded in useEffect (client-only).
  const [preset, rawDispatch] = useReducer(presetReducer, DEFAULT_PRESET);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const fromURL = readPresetFromURL();
    if (fromURL) {
      rawDispatch({ type: "LOAD_PRESET", payload: fromURL });
      eventBus.emit("preset:load", { source: "url" });
      return;
    }
    const fromStorage = loadPresetFromStorage();
    if (fromStorage) {
      rawDispatch({ type: "LOAD_PRESET", payload: fromStorage });
      eventBus.emit("preset:load", { source: "storage" });
    }
  }, [eventBus]);

  // History stacks (stored in refs to avoid re-renders)
  const pastRef = useRef<Preset[]>([]);
  const futureRef = useRef<Preset[]>([]);
  const [_historyTick, setHistoryTick] = useState(0);
  const presetRef = useRef(preset);
  presetRef.current = preset;

  const dispatch = useCallback(
    (action: PresetAction) => {
      // Push current state to history before applying action
      pastRef.current = [
        ...pastRef.current.slice(-(MAX_HISTORY - 1)),
        presetRef.current,
      ];
      futureRef.current = [];
      setHistoryTick((t) => t + 1);

      rawDispatch(action);

      // Emit events
      switch (action.type) {
        case "ADD_APP":
          eventBus.emit("preset:app-add", {
            name: action.payload.name,
            type: action.payload.type,
          });
          break;
        case "REMOVE_APP":
          eventBus.emit("preset:app-remove", { name: `index:${action.index}` });
          break;
        case "ADD_PACKAGE":
          eventBus.emit("preset:package-add", {
            name: action.payload.name,
            type: action.payload.type,
          });
          break;
        case "REMOVE_PACKAGE":
          eventBus.emit("preset:package-remove", {
            name: `index:${action.index}`,
          });
          break;
        case "RESET":
          eventBus.emit("preset:reset", {});
          pastRef.current = [];
          futureRef.current = [];
          break;
        case "LOAD_PRESET":
          eventBus.emit("preset:load", { source: "builtin" });
          pastRef.current = [];
          futureRef.current = [];
          break;
      }
    },
    [eventBus],
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, presetRef.current];
    rawDispatch({ type: "LOAD_PRESET", payload: prev });
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, presetRef.current];
    rawDispatch({ type: "LOAD_PRESET", payload: next });
    setHistoryTick((t) => t + 1);
  }, []);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const validationErrors = useMemo<ValidationError[]>(() => {
    const result = ValidatedPresetSchema.safeParse(preset);
    if (result.success) return [];
    return result.error.issues.map((issue) => ({
      path: issue.path.map((p) => (typeof p === "symbol" ? String(p) : p)),
      message: issue.message,
    }));
  }, [preset]);

  const isValid = validationErrors.length === 0;

  // Persist (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      savePresetToStorage(preset);
      pushPresetToURL(preset);
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [preset]);

  useEffect(() => {
    if (validationErrors.length > 0) {
      eventBus.emit("preset:validation-error", {
        errors: validationErrors.map((e) => e.message),
      });
    }
  }, [validationErrors, eventBus]);

  return {
    preset,
    dispatch,
    validationErrors,
    isValid,
    eventBus,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
