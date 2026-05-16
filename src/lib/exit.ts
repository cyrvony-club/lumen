/** Print issues and exit 1 iff any severity error. */

export type IssueSeverity = "error" | "warn";

export type Issue = {
  severity: IssueSeverity;
  code: string;
  message: string;
  detail?: string;
};

export type IssueReporter = (
  severity: IssueSeverity,
  code: string,
  message: string,
  detail?: string,
) => void;

export function emitIssues(prefix: string, issues: Iterable<Issue>): number {
  const list = [...issues];
  let errors = 0;
  let warns = 0;
  for (const issue of list) {
    const tag = `[${prefix}] ${issue.severity.toUpperCase()} ${issue.code}`;
    console.error(`${tag}: ${issue.message}`);
    if (issue.detail !== undefined && issue.detail.length > 0) {
      console.error(issue.detail);
    }
    if (issue.severity === "error") errors++;
    else warns++;
  }
  if (warns > 0) console.error(`[${prefix}] warnings: ${warns}`);
  return errors > 0 ? 1 : 0;
}

/** Ошибка домена/CLI, не требующая stack trace. */
export class CliExpectedError extends Error {
  override readonly name = "CliExpectedError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** Бросает ожидаемую ошибку (до `runCli`, чтобы не размножать `try/catch` в точках входа). */
export function throwExpected(message: string, cause?: unknown): never {
  const wrapped =
    cause === undefined ? new CliExpectedError(message) : new CliExpectedError(message, { cause });
  throw wrapped;
}

/**
 * Со строками для stderr при необработанном исключении в CLI.
 * Ожидание ревью: ожидаемые ошибки — короткая строка `[scope]`; неожиданные — сообщение + stack для Error.
 */
export function thrownCliStderrLines(scope: string, err: unknown): string[] {
  if (err instanceof CliExpectedError) return [`[${scope}] ${err.message}`];

  const message =
    err instanceof Error ? err.message.replace(/\s+/gu, " ").trim() : String(err);
  const headline = `[${scope}] Unexpected error: ${message || "(empty)"}`;
  if (err instanceof Error && typeof err.stack === "string" && err.stack.trim().length > 0)
    return [headline, err.stack.trimEnd()];
  return [headline];
}

/**
 * Тонкая обёртка точки входа: `main` возвращает код; исключения — осознанно в stderr и exit 1.
 */
export function runCli(scope: string, main: () => Promise<number>): void {
  void (async () => {
    try {
      process.exit(await main());
    } catch (errUnknown: unknown) {
      for (const line of thrownCliStderrLines(scope, errUnknown)) console.error(line);
      process.exit(1);
    }
  })();
}
