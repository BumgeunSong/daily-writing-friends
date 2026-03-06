import { describe, it, expect } from "vitest";
import { truncateText } from "../textHelpers";

describe("truncateText", () => {
  it("S1: returns text unchanged when shorter than maxLength", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("S2: returns text unchanged when exactly at maxLength", () => {
    expect(truncateText("hello", 5)).toBe("hello");
  });

  it("S3: truncates with ellipsis when text exceeds maxLength", () => {
    expect(truncateText("hello world", 8)).toBe("hello...");
  });

  it("S4: returns empty string unchanged", () => {
    expect(truncateText("", 10)).toBe("");
  });

  it("S5: slices without ellipsis when maxLength < 4", () => {
    expect(truncateText("hello", 3)).toBe("hel");
  });
});
