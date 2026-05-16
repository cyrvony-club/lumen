import { createHash } from "node:crypto";
import type { ProductTruthModel } from "./types.js";
import { buildCanonicalMarkdownDocs, CANON_DOC_SLUGS } from "./docs.js";
import { buildEntitiesFromTruthModel } from "./entities.js";
import { buildChunkRecords } from "./chunks.js";
import { buildUpdatesManifest } from "./updatesManifest.js";
import { buildGraphArtifacts } from "./graphExport.js";
import {
  buildLlmsTxt,
  buildManifestIndex,
  publicArtifactUrl,
} from "./urlsManifest.js";
import { buildSitemapXml } from "./sitemap.js";
import { normalizeArtifactSlug } from "./slug.js";
import {
  validateEvidencedClaimsHaveEvidenceLinks,
  validateTargetQueryCoverage,
  validateTruthModelPublicIdsUnique,
} from "./truthModelGuards.js";

export interface ComposeProductPackageParams {
  readonly model: ProductTruthModel;
  readonly baseUrl: string;
  readonly packageVersion: string;
  readonly generatedAtIso: string;
}

export interface ArtifactSpec {
  readonly type: string;
  readonly relative_path: string;
  readonly media_type: string;
  readonly checksum?: string;
}

function sha256Checksum(utf8: string): string {
  return `sha256:${createHash("sha256").update(utf8, "utf8").digest("hex")}`;
}

/** Собирает относительные пути → UTF-8 содержимое для записи в директорию пакета. */

export function composeProductDataPackage(params: ComposeProductPackageParams): {
  readonly files: Readonly<Record<string, string>>;
  readonly manifest: Record<string, unknown>;
  readonly artifactSpecs: readonly ArtifactSpec[];
} {

  const trimmedBase = `${params.baseUrl}`.replace(/\/+$/u, "");
  validateEvidencedClaimsHaveEvidenceLinks(params.model);
  validateTargetQueryCoverage(params.model);
  validateTruthModelPublicIdsUnique(params.model);

  const entities = buildEntitiesFromTruthModel({
    model: params.model,
    baseUrl: trimmedBase,
    entityVersion: params.packageVersion,
  });

  const docs = buildCanonicalMarkdownDocs(params.model);



  const chunks = buildChunkRecords({
    model: params.model,
    docs,
    entities,
    baseUrl: trimmedBase,

    chunkVersion: params.packageVersion,
  });



  const updates = buildUpdatesManifest({
    model: params.model,

    packageVersion: params.packageVersion,
    generatedAtIso: params.generatedAtIso,
    entities,

    chunks,

  });





  const graph = buildGraphArtifacts({
    entities,

    schemaVersionSuffix: normalizeArtifactSlug(params.model.schema_version) ||
      "truth",
    packageId: params.model.product_id,
    packageVersion: params.packageVersion,
    generatedAtIso: params.generatedAtIso,
  });



  const truthJson = `${JSON.stringify(params.model, null, 2)}\n`;


  const entityJsonl =
    `${entities.map((rowUnknown) => `${JSON.stringify(rowUnknown)}`).join("\n")}\n`;





  const chunksJsonl =
    `${chunks.map((rowUnknown) => `${JSON.stringify(rowUnknown)}`).join("\n")}\n`;

  const updatesJson = `${JSON.stringify(updates, null, 2)}\n`;


  const graphJson = `${JSON.stringify(graph, null, 2)}\n`;


  const docFiles: Record<string, string> = {};


  for (const slug of CANON_DOC_SLUGS) {
    docFiles[`docs/${slug}.md`] = `${docs[slug]}`;
  }




  const artifactSpecsBase: ArtifactSpec[] = [

    { type: "package-index", relative_path: "index.json", media_type: "application/json" },

    { type: "llms-txt", relative_path: "llms.txt", media_type: "text/plain" },


    {


      type:


        "product-truth-model",





      relative_path:

        "product-truth-model.json",




      media_type:

        "application/json",






    },


    {


      type:




        "entities-jsonl",






      relative_path:


        "entities.jsonl",






      media_type:


        "application/x-ndjson",




    },




    {


      type:



        "chunks-jsonl",




      relative_path:


        "chunks.jsonl",






      media_type:


        "application/x-ndjson",




    },


    {


      type:



        "updates",






      relative_path:


        "updates.json",






      media_type:


        "application/json",




    },


    {


      type:




        "graph",




      relative_path:


        "graph.json",






      media_type:


        "application/json",




    },




    {


      type:



        "sitemap",






      relative_path:


        "sitemap.xml",






      media_type:


        "application/xml",




    },




  ];

  const docArtifactRows: ArtifactSpec[] = CANON_DOC_SLUGS.flatMap((slugUnknown) => {


    const slug = slugUnknown;



    return [{


      type:


        "canonical-doc",






      relative_path:


        `docs/${slug}.md`,






      media_type:


        "text/markdown",




    }];


  });





  const artifactSpecs = [...artifactSpecsBase, ...docArtifactRows];





  const manifestRecord = buildManifestIndex({
    model: params.model,
    packageVersion: params.packageVersion,
    generatedAt: params.generatedAtIso,
    baseUrl: trimmedBase,

    artifacts:


      artifactSpecs,




  });





  const manifestJson = `${JSON.stringify(manifestRecord, null, 2)}\n`;


  const artifactUrls = artifactSpecs.flatMap((artifactRow) =>
    [`${publicArtifactUrl(trimmedBase, artifactRow.relative_path)}`],
  );


  const llmsBody = buildLlmsTxt({
    manifestUrl: publicArtifactUrl(trimmedBase, "index.json"),
    artifactUrls,
  });



  const sitemapBody = buildSitemapXml(artifactUrls);


  const filesNested: Record<string, string> = {
    "index.json": manifestJson,
    "llms.txt": llmsBody,
    "product-truth-model.json": truthJson,
    "entities.jsonl": entityJsonl,
    "chunks.jsonl": chunksJsonl,
    "updates.json": updatesJson,
    "graph.json": graphJson,

    "sitemap.xml":


      sitemapBody,


    ...docFiles,


  };

  const artifactSpecsWithChecksums: ArtifactSpec[] = artifactSpecs.map((row) => {
    if (row.relative_path === "index.json") return row;
    const content = filesNested[row.relative_path];
    return content === undefined ? row : { ...row, checksum: sha256Checksum(content) };
  });

  const manifestRecordWithChecksums = buildManifestIndex({
    model: params.model,
    packageVersion: params.packageVersion,
    generatedAt: params.generatedAtIso,
    baseUrl: trimmedBase,
    artifacts: artifactSpecsWithChecksums,
  });

  filesNested["index.json"] = `${JSON.stringify(manifestRecordWithChecksums, null, 2)}\n`;




  return {


    files:


      filesNested,




    manifest:


      manifestRecordWithChecksums,




    artifactSpecs: artifactSpecsWithChecksums,


  };


}
