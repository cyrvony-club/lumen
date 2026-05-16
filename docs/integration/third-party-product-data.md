# Third-party integration: product data package

Документ описывает **универсальный контракт интеграции** для любого стороннего проекта, который хочет опубликовать сгенерированный **product knowledge package** / **LLM-readable product data package**.

Lumen остаётся **локальным внутренним инструментом подготовки данных**. Сторонний проект не должен знать о Lumen как о продукте, бренде или публичной зависимости. На публичную поверхность попадает только нейтральный набор файлов.

---

## Вход со стороны Lumen

После локальной сборки:

```bash
npm run generate:package -- --input <path/to/product-truth-model.json> --base-url https://<host>/product-data
```

Lumen создаёт каталог:

```text
generated/product-data/
├─ index.json
├─ llms.txt
├─ product-truth-model.json
├─ entities.jsonl
├─ chunks.jsonl
├─ updates.json
├─ graph.json
├─ sitemap.xml
└─ docs/
   ├─ product-overview.md
   ├─ use-cases.md
   ├─ comparison-context.md
   ├─ faq.md
   └─ evidence.md
```

Сторонний проект сам решает, как доставить эти файлы в свой build/deploy pipeline: копирование в `public/`, загрузка в объектное хранилище, route handlers, CDN или другой механизм.

---

## Обязательные публичные URL

Минимальный публичный контракт:

| URL | Источник в package | Назначение |
|-----|--------------------|------------|
| `/llms.txt` | `generated/product-data/llms.txt` | Входная точка для LLM-агентов и краулеров |
| `/product-data/index.json` | `index.json` | Манифест сборки и список артефактов |
| `/product-data/product-truth-model.json` | `product-truth-model.json` | Нормализованная модель правды |
| `/product-data/entities.jsonl` | `entities.jsonl` | Сущности и связи |
| `/product-data/chunks.jsonl` | `chunks.jsonl` | Чанки для ingest/retrieval |
| `/product-data/updates.json` | `updates.json` | Манифест обновлений |
| `/product-data/graph.json` | `graph.json` | Производный граф |
| `/product-data/sitemap.xml` или общий `/sitemap.xml` | `sitemap.xml` | Discovery для краулеров |

Канонические Markdown-документы MVP публикуются только под:

- `/product-data/docs/product-overview.md`
- `/product-data/docs/use-cases.md`
- `/product-data/docs/comparison-context.md`
- `/product-data/docs/faq.md`
- `/product-data/docs/evidence.md`

HTML-зеркала, например `/knowledge/*`, допустимы только после MVP и только без второго конкурирующего canonical URL.

---

## Content-Type

| Ресурс | Рекомендуемый `Content-Type` |
|--------|------------------------------|
| `/llms.txt` | `text/plain; charset=utf-8` |
| `*.json` | `application/json; charset=utf-8` |
| `*.jsonl` | `application/x-ndjson; charset=utf-8` |
| `/product-data/docs/*.md` | `text/markdown; charset=utf-8` |
| sitemap XML | `application/xml` или `text/xml; charset=utf-8` |

---

## Требования к любому стороннему проекту

Сторонний проект должен:

- отдавать package по публичным URL без auth;
- не закрывать `/llms.txt` и `/product-data/*` в `robots.txt`;
- включить URL package в `sitemap.xml` или совместимый sitemap-механизм;
- не публиковать имя локального инструмента в URL, metadata, `llms.txt`, JSON/JSONL и текстах;
- не публиковать внутренние prompts, токены, `.env`, приватные документы и абсолютные локальные пути;
- обеспечивать стабильные URL между релизами package;
- при обновлении package запускать локальные проверки Lumen до публикации.

---

## Пример интеграции для web-проекта

Типовой поток:

1. В репозитории Lumen обновить или получить `product-truth-model.json`.
2. Запустить `npm run generate:package -- --input <model> --base-url https://<host>/product-data`.
3. Запустить `npm run validate`.
4. Передать содержимое `generated/product-data/` в deploy pipeline стороннего проекта.
5. Разместить:
   - `llms.txt` в корне публичной выдачи;
   - остальные файлы под `/product-data/*`.
6. Обновить sitemap/robots стороннего проекта.
7. Проверить публичные URL после деплоя.

Для Next.js App Router это обычно означает:

- `public/llms.txt` для корневого `/llms.txt`;
- `public/product-data/*` или `src/app/product-data/[...segments]/route.ts`;
- `src/app/sitemap.ts` для URL package;
- `public/robots.txt` или `src/app/robots.ts` со строкой `Sitemap:`;
- корректные `metadataBase`, canonical и OpenGraph URL для основных страниц сайта.

Это не является требованием к конкретному проекту. Такой же контракт можно реализовать в любом статическом сайте, backend, CDN или object storage.

---

## Verification checklist

Перед публикацией:

- [ ] `npm run validate` в Lumen проходит.
- [ ] `llms.txt` не содержит имя локального инструмента.
- [ ] `index.json` валиден и перечисляет все артефакты.
- [ ] `entities.jsonl` и `chunks.jsonl` разбираются построчно как JSON.
- [ ] `/product-data/docs/*.md` открываются как Markdown или эквивалентный text response.
- [ ] sitemap содержит `/llms.txt`, `/product-data/index.json` и `/product-data/docs/*.md`.
- [ ] robots не запрещает `/product-data/`.
- [ ] В публичных файлах нет `/Users/`, `Developer/Projects`, абсолютных локальных путей, токенов и приватных источников.

---

## Что не входит в контракт

- Lumen не поставляет код интеграции внутрь стороннего проекта.
- Lumen не хранит knowledge package конкретного проекта как часть своей кодовой базы.
- Lumen не требует Next.js, API-сервера или отдельного backend.
- Lumen не обещает гарантированное попадание продукта в ответы LLM.
