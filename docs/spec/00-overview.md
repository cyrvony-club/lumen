# Lumen — обзор системы

## Назначение

Lumen — система **генерации LLM-контента** как **retrieval-ready knowledge surface**: результат — не только текст, а опубликованное знание с чанками, метаданными, сущностями, стабильными ID, фидами обновлений и OpenAPI для RAG и агентов.

## Принципы (из blueprint)

- Каждый опубликованный объект имеет стабильный `id`, явный `type`, `canonical_url`, `updated_at`, `version`.
- Документы и артефакты проектируются так, чтобы **чанки** оставались семантически цельными (границы смысла, не «рваный» текст).
- Слои поставки: канонические документы/артефакты → **сущности** с отношениями → **API** (lookup, search, related, updates) → **фиды и JSONL** для инкремента и bulk-ingest.

## Связанные документы

| Файл | Содержание |
|------|------------|
| [01-agent-system.md](./01-agent-system.md) | Роли, границы ответственности, эскалации |
| [02-content-pipeline.md](./02-content-pipeline.md) | Пайплайн от брифа до публикации и валидации |
| [03-data-model.md](./03-data-model.md) | Сущности домена Lumen и метаданные |
| [04-api.md](./04-api.md) | Контракт API (retrieval + generation) |
| [05-mvp.md](./05-mvp.md) | Объём MVP и критерии готовности |

## Артефакты репозитория

- `schema/entity.schema.json`, `schema/chunk.schema.json` — JSON Schema Draft 2020-12.
- `api/openapi.yaml` — OpenAPI 3.1.
- `feeds/updates.json` — манифест изменений для re-index.
- `exports/entities.jsonl`, `exports/chunks.jsonl` — bulk-экспорт.
- `changelog.md` — человекочитаемый журнал релизов контента/API.
