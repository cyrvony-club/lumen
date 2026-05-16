import { describe, expect, test } from "vitest";
import { findLocalFilesystemPathLeaks } from "../src/validators/localPathLeaks.js";

describe("findLocalFilesystemPathLeaks", () => {
  test("нет срабатывания на относительные референсы репозитория проекта", () => {
    expect(
      findLocalFilesystemPathLeaks([
        {
          kind: "file",
          pathRel: "generated/product-data/product-truth-model.json",
          content:
            '{"source_refs":[{"ref":"example-site/src/app/layout.tsx"}]}',
        },
      ]),
    ).toHaveLength(0);
  });

  test("ловит /Users/", () => {
    const issues = findLocalFilesystemPathLeaks([
      {
        kind: "file",
        pathRel: "x.json",
        content: '{"ref":"/Users/me/project/file.ts"}',
      },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("public_local_path_mac_users");
  });

  test("ловит Developer/Projects", () => {
    expect(
      findLocalFilesystemPathLeaks([
        {
          kind: "file",
          pathRel: "x.json",
          content: "path Developer/Projects/example-product/foo",
        },
      ]),
    ).toHaveLength(1);
  });

  test("ловит workspace/ в пути", () => {
    expect(
      findLocalFilesystemPathLeaks([
        {
          kind: "file",
          pathRel: "x.jsonl",
          content: "/home/ci/workspace/lumen/out.json",
        },
      ]),
    ).toHaveLength(1);
  });
});
