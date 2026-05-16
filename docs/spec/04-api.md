# API Lumen

Спецификация: `api/openapi.yaml` (OpenAPI **3.1**).

## Retrieval (knowledge surface)

Назначение — программный доступ для агентов и внешних индексаторов.

| Метод и путь | Назначение |
|--------------|------------|
| `GET /search` | Полнотекст/гибридный поиск по сущностям и чанкам; `q`, фильтры `type`, `tag` |
| `GET /entities/{id}` | Сущность по ID |
| `GET /entities/{id}/related` | Связанные сущности (граф/эвристика) |
| `GET /updates` | Инкрементальные изменения; query `since` (timestamp или cursor) |
| `GET /docs/{slug}` | Канонический документ (Markdown/метаданные Lumen) |
| `GET /faq/{id}` | Элемент базы ответов для retrieval |
| `GET /chunks/{chunkId}` | Чанк для прямого доступа RAG (см. MVP) |

Ответы включают обязательные метаданные: `id`, `type`, `title`/`name`, `summary`, `tags`, `updated_at`, `version`, `canonical_url` где применимо.

## Generation (операционный контур)

| Метод и путь | Назначение |
|--------------|------------|
| `POST /briefs` | Создать `ContentBrief` |
| `POST /generation-runs` | Запуск прогона пайплайна по брифу/проекту |
| `GET /generation-runs/{id}` | Статус и результат прогона |
| `GET /artifacts/{id}` | Получить `GeneratedArtifact` |
| `POST /artifacts/{id}/reviews` | Добавить `Review` |
| `POST /artifacts/{id}/revisions` | Зафиксировать `Revision` (новая версия текста) |

## Ошибки

Рекомендуется единый формат problem+json (описан в OpenAPI components) для 4xx/5xx.

## Согласованность

Версия опубликованного API должна совпадать с `info.version` в OpenAPI при релизе (см. operational checklist в blueprint).
