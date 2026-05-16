# MVP Lumen

## Цель MVP

Доказать сквозной цикл: **бриф → исследование → решение → генерация → извлечение сущностей → чанки → публикация → валидация**, с выдачей через **retrieval API** и артефакты **feeds/exports** для внешнего ingest.

## Обязательные артефакты репозитория (день 1)

- Спецификация в `docs/spec/*.md` (этот набор).
- `schema/entity.schema.json`, `schema/chunk.schema.json`.
- `api/openapi.yaml` с путями retrieval + generation (см. [04-api.md](./04-api.md)).
- `feeds/updates.json`, `exports/entities.jsonl`, `exports/chunks.jsonl`.
- `changelog.md`.

## Минимальный объём контента

- Не менее **20** канонических документов/артефактов в терминах проекта (Markdown или эквивалент), с frontmatter/метаданными Lumen.
- JSON-объекты сущностей для ключевых концептов инструмента/домена (соответствие `entity.schema.json`).

## API

- Реализация или мок: как минимум **`GET /search`**, **`GET /entities/{id}`**, **`GET /entities/{id}/related`**, **`GET /updates`**, **`GET /docs/{slug}`**, **`GET /faq/{id}`**, **`GET /chunks/{chunkId}`**, плюс **`POST /briefs`**, **`POST /generation-runs`**, **`GET /generation-runs/{id}`**, **`GET /artifacts/{id}`**, **`POST /artifacts/{id}/reviews`**, **`POST /artifacts/{id}/revisions`** — как в `api/openapi.yaml`.

## Критерии готовности релиза MVP

- У каждого опубликованного объекта есть стабильный `id`, `updated_at`, `version`, `canonical_url`.
- `updates.json` отражает последние изменения; `changelog.md` обновляется при релизе контента.
- JSONL регенерируется при каждом контент-релизе.
- OpenAPI синхронизирован с деплоем (если API уже поднят).

## Вне scope MVP (требует решения архитектора)

- Полный JSON-LD `@context` для всех типов.
- Продвинутая авторизация (OAuth scopes per role).
- Мульти-тенантность и квоты.
