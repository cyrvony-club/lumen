# Changelog Lumen

Все значимые изменения контента и публичного API документируются здесь. Формат основан на практике «keep a changelog»; для машинного учёта см. `feeds/updates.json`.

## [0.1.0] — 2026-05-16

### Добавлено

- Набор спецификаций `docs/spec/` (обзор, агенты, пайплайн, модель данных, API, MVP).
- JSON Schema `schema/entity.schema.json`, `schema/chunk.schema.json` (Draft 2020-12).
- OpenAPI 3.1 `api/openapi.yaml` (retrieval + generation), включая `GET /docs/{slug}` и `GET /faq/{id}`.
- Заготовки `feeds/updates.json`, `exports/entities.jsonl`, `exports/chunks.jsonl`.
- Правило Cursor `.cursor/rules/lumen-agent-system.mdc`.
