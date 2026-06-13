import { beforeEach, describe, expect, it } from "vitest";
import { createSeedState } from "../data/seed";
import { loadState, resetState, saveState, STORAGE_KEY } from "../services/storage";

describe("demo storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("loads the seeded state when storage is empty", () => {
    const state = loadState();
    expect(state.group.members).toHaveLength(60);
    expect(state.announcement.draft.room).toBe("B.503");
  });

  it("persists and restores a valid state", () => {
    const state = createSeedState();
    state.announcement.draft.room = "B.305";
    saveState(state);
    expect(loadState().announcement.draft.room).toBe("B.305");
  });

  it("recovers from invalid persisted data", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99 }));
    expect(loadState().group.members).toHaveLength(60);
  });

  it("reset removes changes", () => {
    const state = createSeedState();
    state.group.name = "Changed";
    saveState(state);
    expect(resetState().group.name).toBe("Digital Marketing Class");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
