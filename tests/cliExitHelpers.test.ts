import { describe, expect, it } from "vitest";
import {
  CliExpectedError,
  thrownCliStderrLines,
  throwExpected,
} from "../src/lib/exit.js";

describe("thrownCliStderrLines", () => {
  it("рендерит ожидаемую ошибку без stack trace в stderr", () => {
    const lines = thrownCliStderrLines(
      "test-scope",
      new CliExpectedError("нет файла"),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("[test-scope] нет файла");
    expect(lines.join("\n")).not.toMatch(/\n\s{2,}at\s+/);
  });

  it("для Unexpected Error добавляет сообщение и stack", () => {
    const err = new Error("boom");
    err.stack = "Error: boom\n    at Inner.fn (suite.ts:1:2)";
    const lines = thrownCliStderrLines("scope-a", err);
    expect(lines[0]).toBe("[scope-a] Unexpected error: boom");
    expect(lines[1]).toContain("Inner.fn");
  });

  it("не дублирует stack когда он пустой", () => {
    const err = new Error("n");
    err.stack = "";
    expect(thrownCliStderrLines("z", err)).toEqual(["[z] Unexpected error: n"]);
  });

  it("переводит неError в одну строку без stack", () => {
    expect(thrownCliStderrLines("q", "строка")).toEqual([
      "[q] Unexpected error: строка",
    ]);
    expect(thrownCliStderrLines("q", undefined as unknown)).toEqual([
      "[q] Unexpected error: undefined",
    ]);
  });

  it("нормализует whitespace в тексте ошибки заголовка", () => {
    const err = new Error("many\nspaces\t here");
    err.stack = undefined;
    const lines = thrownCliStderrLines("w", err);
    expect(lines[0]).toBe("[w] Unexpected error: many spaces here");
  });
});

describe("throwExpected", () => {
  it("выбрасывает CliExpectedError", () => {
    expect(() => throwExpected("плохо")).toThrow(CliExpectedError);
    expect(() => throwExpected("плохо")).toThrow(/плохо/);
  });

  it("прокидывает cause в CliExpectedError", () => {
    const root = new Error("cause");
    try {
      throwExpected("wrap", root);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(CliExpectedError);
      if (e instanceof CliExpectedError) expect(e.cause).toBe(root);
    }
  });
});
