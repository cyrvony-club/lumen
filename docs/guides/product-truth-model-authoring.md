# Гайд: создание `product-truth-model.json` для нового проекта

Пошаговая инструкция для подготовки входного файла перед генерацией **product knowledge package**.

Связанные артефакты:

- Контракт и инварианты: [`.cursor/rules/lumen-product-truth-model.mdc`](../../.cursor/rules/lumen-product-truth-model.mdc)
- Пошаговый опрос в Cursor: [`.cursor/skills/product-truth-model/`](../../.cursor/skills/product-truth-model/)
- JSON Schema: [`schema/product-truth-model.schema.json`](../../schema/product-truth-model.schema.json)
- Минимальный пример: [`fixtures/product-truth-model.min.json`](../../fixtures/product-truth-model.min.json)
- Публикация package сторонним проектом: [`docs/integration/third-party-product-data.md`](../integration/third-party-product-data.md)

---

## 1. Подготовка

- Репозиторий Lumen с установленными зависимостями (`npm install` в корне).
- Источники по новому продукту: сайт, docs, pricing, FAQ, metadata, публичные страницы, репозиторий (если есть).
- Решите, **где лежит файл**. Предпочтительно **не** в кодовой базе Lumen, а рядом с целевым проектом:

```text
/path/to/your-project/product-truth-model.json
```

Lumen **project-agnostic**: не хранит knowledge конкретных сторонних проектов в своём репозитории.

---

## 2. Запуск процесса в Cursor

Откройте:

- skill **`product-truth-model`** (`.cursor/skills/product-truth-model/`);
- правило **`.cursor/rules/lumen-product-truth-model.mdc`** (подключается при работе с `product-truth-model*.json` и схемой).

Пример запроса агенту:

> Создай `product-truth-model.json` для проекта X. Используй skill `product-truth-model` и правило `lumen-product-truth-model`. Источники: [ссылки / путь к репозиторию].

Агент должен идти **блок за блоком** и **не выдумывать** факты.

---

## 3. Порядок заполнения (интервью)

1. **Product brief** — название, категория, сайт, краткое описание, аудитории.
2. **Positioning** — use cases; кому подходит (`fit_for`); кому не подходит (`not_fit_for`).
3. **Target LLM queries** — **5–8** запросов, под которые продукт должен быть релевантен в ответах LLM.
4. **Claims** — утверждения с `id`, `statement`, `truth_status`.
5. **Evidence** — доказательства с `id`, `citation`, опционально `url`, `source_refs`.
6. **Competitor context** — только если есть подтверждённые факты (иначе `[]`).
7. **Policy constraints** — что нельзя утверждать публично.
8. **Source of truth** — кто/что считается каноном при конфликте.

После каждого блока — **краткое резюме** ответов перед записью в JSON.

---

## 4. Правила для claims

| `truth_status` | Когда использовать |
|----------------|-------------------|
| `evidenced` | Есть подтверждённый источник → обязательны непустые `evidence_ids` |
| `hypothesis` | Не раскрыто / не подтверждено → не выдавать за установленный факт |
| `policy_forbidden` | Нельзя утверждать публично |

**Запрещено:** придумывать метрики, отзывы, сертификаты, сравнения с конкурентами без строк в `evidence`.

---

## 5. Evidence и `source_refs`

- `citation` — дословная или близкая цитата из источника.
- `url` — публичный URL, если есть.
- `source_refs[]` — **нейтральные** указатели (`ref`: относительный путь в репозитории источника или метка документа).

**Не использовать** абсолютные пути машины разработчика (`/Users/...`, `Developer/Projects/...`).

---

## 6. Минимальная структура файла

```json
{
  "schema_version": "product-truth-model.v1",
  "product_id": "ent.product.my-app",
  "updated_at": "2026-05-20T12:00:00.000Z",
  "brief": {
    "name": "...",
    "category": "...",
    "website": "https://...",
    "short_description": "..."
  },
  "positioning": {
    "use_cases": [],
    "fit_for": [],
    "not_fit_for": []
  },
  "claims": [],
  "evidence": [],
  "target_llm_queries": [
    { "query": "...", "coverage_doc_slugs": ["product-overview"] }
  ],
  "source_of_truth": {},
  "policy_constraints": []
}
```

Допустимые `coverage_doc_slugs`: `product-overview`, `use-cases`, `comparison-context`, `faq`, `evidence`.

---

## 7. Проверка

После черновика:

```bash
cd /path/to/lumen

npm run validate:schema
# по умолчанию ищет product-truth-model.json в корне Lumen;
# для внешнего пути — временно скопируйте или укажите путь в generate

npm run generate:package -- \
  --input /path/to/your-project/product-truth-model.json \
  --base-url https://your-domain.com/product-data

npm run validate
```

При успехе в **`generated/product-data/`** появится готовый package: `index.json`, `llms.txt`, `docs/*.md`, JSONL, `updates.json`, `sitemap.xml`, `graph.json`.

---

## 8. Чеклист готовности

- [ ] **5–8** `target_llm_queries` с непустым `query`
- [ ] Каждый `evidenced` claim имеет `evidence_ids` на существующие `evidence[].id`
- [ ] Массив `evidence` содержит ≥ 1 элемент
- [ ] Заполнены `source_of_truth` и `policy_constraints`
- [ ] `source_refs` без абсолютных локальных путей
- [ ] В тексте модели **нет** подстроки `Lumen` (попадает в публичный package)
- [ ] `npm run generate:package` и `npm run validate` завершаются с exit code **0**

---

## 9. Что дальше

1. Передать содержимое `generated/product-data/` в **сторонний проект** (сайт, CDN, object storage).
2. Опубликовать по контракту: `/llms.txt`, `/product-data/*`, sitemap, robots — см. [`docs/integration/third-party-product-data.md`](../integration/third-party-product-data.md).
3. Заполнить [`validation-report.md`](../../validation-report.md) перед релизом package.

---

## Практический старт

Для первого проекта достаточно:

- **8–12** `evidenced` claims из публичных источников;
- **1** `hypothesis` про то, чего на сайте явно нет;
- **5–8** target LLM queries;
- один проход **validate → generate → validate**.

Не стремитесь к идеальному тексту на первом шаге — сначала добейтесь валидного, трассируемого JSON.
