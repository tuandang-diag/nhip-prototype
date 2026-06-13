import { createSeedState } from "../data/seed";
import type { DemoState } from "../types";

export const STORAGE_KEY = "nhip-prototype-state-v1";

const isDemoState = (value: unknown): value is DemoState => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoState>;
  return (
    candidate.schemaVersion === 1 &&
    Boolean(candidate.group?.members) &&
    Boolean(candidate.announcement?.draft)
  );
};

export const loadState = (): DemoState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed: unknown = JSON.parse(raw);
    return isDemoState(parsed) ? parsed : createSeedState();
  } catch {
    return createSeedState();
  }
};

export const saveState = (state: DemoState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resetState = (): DemoState => {
  window.localStorage.removeItem(STORAGE_KEY);
  return createSeedState();
};
