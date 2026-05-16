import type { ProductTruthModel } from "./types.js";
import type { EntityRecord } from "./entities.js";
import { CANON_DOC_SLUGS, type CanonDocSlug } from "./docs.js";
import { publicArtifactUrl } from "./urlsManifest.js";

export type ChunkRecord = Record<string, unknown>;

function indexEntities(rows: readonly EntityRecord[]): {
  readonly idsFor: (types: readonly string[]) => string[];
} {
  const byType = new Map<string, Set<string>>();

  for (const rowUnknown of rows) {
    const idUnknown = Reflect.get(rowUnknown as object, "id");
    const typeUnknown = Reflect.get(rowUnknown as object, "type");
    const id = typeof idUnknown !== "undefined" ? `${String(idUnknown)}`.trim() : "";
    const entityType =
      typeof typeUnknown !== "undefined" ? `${String(typeUnknown)}`.trim() : "";

    if (!(id.length > 0) || !(entityType.length > 0)) continue;

    const bucket =
      byType.has(entityType) ?
        (byType.get(entityType) as Set<string>)
      : new Set<string>();

    bucket.add(id);

    byType.set(entityType, bucket);
  }

  return {

    idsFor(types: readonly string[]): string[] {
      const out = new Set<string>();

      for (const tt of types) {

        const bucket = byType.get(tt);


        if (!bucket) continue;

        bucket.forEach((entityIdUnknown) =>
          typeof entityIdUnknown === "string" && entityIdUnknown.trim().length > 0
            ?
              void out.add(entityIdUnknown.trim())
            :

              undefined,
        );


      }



      return [...out];






    },



  };


}

export function buildChunkRecords(params: {
  readonly model: ProductTruthModel;
  readonly docs: Record<CanonDocSlug, string>;
  readonly entities: readonly EntityRecord[];
  readonly baseUrl: string;
  readonly chunkVersion: string;
}): ChunkRecord[] {
  const grouped = indexEntities(params.entities);


  const productPrimaryId =
    `${params.model.product_id}`.trim();


  const productIdsFromEntities = grouped.idsFor(["Product"]);


  const productUnified = [...new Set([productPrimaryId, ...productIdsFromEntities])]


    .

      flatMap((entityIdCandidate) =>
      entityIdCandidate.trim().length ? [entityIdCandidate.trim()] : ([] as readonly string[]),
      );




  const featureIds = grouped.idsFor(["Feature"]);


  const competitorIds =
    grouped.idsFor(["Competitor"]);


  const claimIds = grouped.idsFor(["Claim"]);


  const evidenceIds = grouped.idsFor(["Evidence"]);


  const out: ChunkRecord[] = [];





  const iterator = CANON_DOC_SLUGS as readonly CanonDocSlug[];


  for (const slug of iterator) {


    let entityRefs: readonly string[] = [];

    let claimRefs: readonly string[] = [];

    let evidRefs: readonly string[] = [];


    if (slug === "product-overview") {

      entityRefs = productUnified;
      claimRefs = [];
      evidRefs = [];

    }



    else if (slug === "use-cases") {

      entityRefs = [...new Set([...productUnified, ...featureIds])];




      claimRefs = [];





      evidRefs = [];





    }



    else if (slug === "comparison-context")


      {


      entityRefs = [...new Set([...productUnified, ...competitorIds])];

      claimRefs = [];





      evidRefs = [];





    }



    else if (slug === "faq")


      {


      entityRefs =
        [...new Set([...productUnified, ...claimIds])];

      claimRefs = claimIds;







      evidRefs = [];





    }



    else if (slug === "evidence")


      {


      entityRefs = [...new Set([...productUnified, ...claimIds, ...evidenceIds])];




      claimRefs = claimIds;







      evidRefs =
        evidenceIds;




    }



    const trimmedDoc = `${params.docs[`${slug}`]}`.trimEnd();


    const canonical = `${publicArtifactUrl(params.baseUrl, `docs/${slug}`)}` + `#chunk`;

    out.push({

      chunk_id: `chunk.docs.${slug}`,

      doc_id: slug,

      title: `Canon doc · ${slug}`,

      summary: trimmedDoc.slice(0, 200),

      text: trimmedDoc.endsWith("\n") ? trimmedDoc : `${trimmedDoc}\n`,

      tags: ["canonical-doc", slug],

      updated_at:
        params.


          model.







            updated_at,






      version: params.chunkVersion.trim(),




      canonical_url: canonical,

      entity_ids:
        [...entityRefs].filter(Boolean),






      claim_ids: [...claimRefs],






      evidence_ids:


        [...evidRefs],




      language:


        "ru",






    });






  }



  return out;




}

