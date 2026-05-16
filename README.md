# Lumen

## Локальный инструмент и публичный результат

**Lumen** — **локальный внутренний инструмент** в этом репозитории для подготовки машинно читаемого слоя данных о продукте. Он **не** позиционируется как публичная разработка: имя **Lumen не публикуется** на сайте продукта и **не должно появляться** в публичных URL, SEO/metadata, `llms.txt`, открытых фидах и файлах, которые отдаются посетителям и краулерам продукта.

Публикуется только **нейтральный по бренду** результат — **LLM-readable product data package** / **product knowledge package** (**не** «Lumen package»).

## Что такое Lumen

**Lumen** упаковывает **product truth** (продуктовую правду) в перечисленный выше **нейтральный публичный пакет**, чтобы внешние LLM, RAG и агентные системы могли **корректно понять, извлечь и упомянуть** продукт без опоры на случайный маркетинговый веб-слой.

## Что Lumen не делает

- Не гарантирует попадание бренда в ответ конкретной модели или «взлом» ранжирования.
- Не ставит задачей массовое написание постов и копирайт вместо проверяемой правды.
- **Не является агентной системой как продукт** — агентный workflow есть только во внутренней разработке репозитория (см. `.cursor/rules/lumen-agent-system.mdc`).
- Не делает открытый **generation API** частью MVP; HTTP API описан как **опциональное расширение** (`api/openapi.yaml`), не блокирующее поставку пакета файлами.

## Ключевой результат: product knowledge package

Главный **публичный** результат работы инструмента — **product knowledge package** (**LLM-readable product data package**): артефакты с канонической моделью правды, текстами для машинного чтения и машинными экспортами для индексации и retrieval со стороны потребителей.

Пакет публикуется **на тех же публичных URL, что сайт продукта**, без требования аутентификации и без доступа только через JS или только через PDF. **Канонические** тексты MVP — **`/product-data/docs/*.md`** (как после `generate:package`). Другие префиксы (например HTML-зеркало под **`/knowledge/*`**) допустимы **только** как расширение после MVP и без второго competing canonical в sitemap; префиксы выбираются **нейтрально** — без сегмента с именем инструмента.

## Состав результата

| Артефакт | Назначение |
|----------|-------------|
| `llms.txt` | Машинное «оглавление» пакета и вход для LLM-агентов (ссылки на канонические URL артефактов); **без упоминания Lumen**. |
| `product-truth-model.json` | Нормализованная модель правды (`schema/product-truth-model.schema.json`, JSON Schema `$id`: `urn:product-knowledge-package:schema:product-truth-model`). |
| **Canonical docs** (Markdown) | `product-overview.md`, `use-cases.md`, `comparison-context.md`, `faq.md`, `evidence.md` — в публичном пакете под **`/product-data/docs/*.md`**; человекочитаемые секции и трассируемые поля (`claim_id`, `evidence_id`, `truth_status`, `source_refs`) плюс JSON-снимки входной модели, **без фактов вне `product-truth-model.json`**. |
| `entities.jsonl` | Типизированные сущности продукта и связи (пример: `exports/entities.jsonl`). |
| `chunks.jsonl` | Фрагменты для ingest/retrieval (пример: `exports/chunks.jsonl`). |
| `updates.json` | Манифест изменений для инкрементальной синхронизации (`feeds/updates.json`). |
| `index.json` | Генерируемый манифест сборки (версия, `generated_at`, `product_id`, список `artifacts` с `url` и `media_type`; см. `docs/spec/lumen-product-spec.md`). |
| `sitemap.xml` | Перечень URL пакета и канонических **`/product-data/docs/*.md`** для поисковых краулеров (`llms.txt` и `index.json` согласованы с теми же путями). |
| `validation-report.md` | Отчёт согласованности, трассируемости и покрытия целевых запросов. |

## Что делать с результатом

Размещать артефакты **рядом с продуктовым сайтом** по стабильным **публичным URL** без auth, без «только SPA без отдачи текстов краулерам» и без «только PDF». Контент отдаётся с **честными `Content-Type`**, где уместно — с **canonical** метаданными в HTML-хостах.

## Как LLM и ИИ-системы получают доступ

- Индексирование публичного сайта (поиск, внутренние краулеры).
- Указатели **`/llms.txt`**, **`sitemap.xml`** и **`robots.txt` / programmatic robots** без закрывания префикса пакета (**`/product-data/*`**) и канонических **`/product-data/docs/*.md`**.
- Отдача статики или App Router handlers под **`/product-data/...`** (пример: **`/product-data/index.json`**, **`/product-data/entities.jsonl`**, **`/product-data/chunks.jsonl`**, **`/product-data/docs/product-overview.md`**) с корректными заголовками.
- Структурированные **JSON / JSONL** (`product-truth-model.json`, `entities.jsonl`, `chunks.jsonl`, `updates.json`) для сборок индексов.
- По необходимости — **optional retrieval HTTP API** из `api/openapi.yaml` (**локальный/mock черновик**, базовый URL в спецификации — `http://localhost:3000`; не публичный бренд инструмента); для MVP это **не обязано**.

## Сущности: направление связей

В `entities.jsonl` поле `relations[]` всегда читается как **текущая сущность → `target_id`**: субъект — сам объект Entity, объект ребра — `target_id`. Например, **`product_has_feature`** и **`product_has_claim`** задаются **на узле Product**; **`claim_supported_by`** — **на узле Claim** (к Evidence). Пример согласованного минимального графа: `exports/entities.jsonl`, `exports/graph.json` (`from` / `to` совпадают с subject / object).

## Локальные команды проверки (npm)

После установки зависимостей (`npm install` в корне репозитория):

| Команда | Назначение |
|---------|-------------|
| `npm run typecheck` | Строгая проверка TypeScript без эмиссии JS |
| `npm run lint` | ESLint по `src/**` и `tests/**` |
| `npm test` | Юнит-тесты Vitest |
| `npm run generate:package` | Сборка нейтрального пакета в **`generated/product-data/`** из внешнего `product-truth-model.json` (через `--input <path>`; корневой файл допустим только как временный локальный input и не является частью кодовой базы). См. `src/cli/generate-package.ts`; артефакты включают `index.json`, `llms.txt`, копию truth model, `docs/*.md`, JSONL экспорты, `updates.json`, `sitemap.xml`, `graph.json`. |
| `npm run validate:schema` | Компиляция `schema/*.schema.json`; при наличии временного корневого `product-truth-model.json` — проверка по схеме |
| `npm run validate:exports` | Построчная валидация `exports/*.jsonl`; при наличии каталога **`generated/product-data/`** дополнительно проверяет `entities.jsonl` / `chunks.jsonl` там же (без предупреждения об отсутствии этого каталога) |
| `npm run validate:package` | Синтаксис `feeds/updates.json`, `exports/graph.json`, `api/openapi.yaml`; антиутечки бренда и типичные локальные файловые пути (`/Users/`, `workspace/`, `Developer/Projects`) в публичных артефактах; согласованность связей/чанков и графа; при наличии **`generated/product-data/`** — те же сквозные проверки и скан текста этого пакета |
| `npm run validate` | Последовательный запуск `validate:*` |

**Ошибки в CLI.** Сообщения и предупреждения пишутся в stderr. Ожидаемые ошибки (отсутствующий файл, неверный формат там, где команда уже вывела детали) завершают процесс кодом **`1`** с коротким текстом **`[<команда>]`**, без дампа stack trace для штатных сценариев. Непойманное исключение сопровождается строкой `Unexpected error` и трассировкой stack (если она есть у `Error`).

Исходники валидаторов: `src/validators/` и точки входа CLI `src/cli/validate-*.ts`. Генератор: чистые функции под `src/generator/` + `src/cli/generate-package.ts`.

### Оценка проекта и `product-truth-model.json`

- **Гайд:** [`docs/guides/product-truth-model-authoring.md`](docs/guides/product-truth-model-authoring.md) — пошаговая инструкция для нового проекта.
- **Правило Cursor:** [`.cursor/rules/lumen-product-truth-model.mdc`](.cursor/rules/lumen-product-truth-model.mdc) — контракт оценки нового проекта, обязательные поля, `truth_status`, evidence, цикл валидации. Подключается при работе с `product-truth-model*.json` и схемой.
- **Skill:** [`.cursor/skills/product-truth-model/`](.cursor/skills/product-truth-model/) — пошаговый опрос пользователя по блокам модели.

Входной файл — **внешний** (`--input`); Lumen не хранит knowledge конкретных сторонних проектов в своей кодовой базе. Публикуемый package остаётся **нейтральным** по бренду.

### Юнит-тесты и TDD

Vitest-сценарии в `tests/`. Новые генераторы и валидаторы желательно вводить **через TDD**, начиная с чистых функций (normalize, compose, антиошибочные assertions), затем подключая CLI только как тонкий оркестратор. Билдеры канонических Markdown-документов (`src/generator/docs.ts`) покрыты в `tests/generator/docsBuilders.test.ts`.

Пример сборки без корневого `product-truth-model.json`:

```bash
npm run generate:package -- --input fixtures/product-truth-model.min.json
```

Выходная директория по умолчанию исключена из git см. **`generated/` в `.gitignore`**.

## Порядок реализации кода

После scaffold: продолжаем цепочку **валидаторы → генераторы артефактов пакета** (без центрирования на HTTP API).

## Где искать источник истины

- Универсальная интеграция package в сторонний проект (нейтральные URL **`/product-data/*`**, канонические документы **`/product-data/docs/*.md`**, **`/llms.txt`**, sitemap): [`docs/integration/third-party-product-data.md`](docs/integration/third-party-product-data.md).
- **Основная продуктовая спецификация:** [`docs/spec/lumen-product-spec.md`](docs/spec/lumen-product-spec.md).
- **Внутренние правила агентов при разработке репозитория:** [`.cursor/rules/lumen-agent-system.mdc`](.cursor/rules/lumen-agent-system.mdc).
- **Стек будущей реализации репозитория:** TypeScript + Node.js — см. также [`.cursor/rules/lumen-ts-node.mdc`](.cursor/rules/lumen-ts-node.mdc). Перед кодом CLI/backend проект нужно **осознанно инициализировать** (`package.json`, линтер, тесты, команды проверки) — см. спецификацию, раздел «Инициализация реализации».

## MVP checklist

- **Один продукт** на пакет.
- **5–8** целевых формулировок запросов (`target_llm_queries`) и проверка покрытия в `validation-report.md`.
- **Пять** канонических Markdown-документов (имена см. таблицу выше).
- **`product-truth-model.json`** с утверждениями (`claims`, `truth_status`), обязательными `evidence`, `target_llm_queries` (5–8), `source_of_truth`; для `truth_status: evidenced` — непустые `evidence_ids`.
- **`entities.jsonl`**, **`chunks.jsonl`**, **`updates.json`**, **`index.json`** (манифест артефактов сборки), **`validation-report.md`**.
- **`llms.txt`**, **`sitemap.xml`** (и согласованный `robots`) на продакшен-URL продукта (**нейтральные пути**, без бренда инструмента).
- **Без обязательного публичного API** для MVP — достаточно статических файлов и фидов при корректной публикации.

## Лицензия

Репозиторий под **[MIT + Commons Clause v1.0](LICENSE)** (source-available, не OSI open source):

- **можно** использовать в бизнесе, для клиентов, монетизировать **результаты** (product knowledge package и т.д.);
- **нельзя** **Sell** сам Lumen — продажа, платный SaaS/hosting, где ценность ≈ функциональность инструмента.

Обзор альтернатив и сравнение: [`docs/legal/license.md`](docs/legal/license.md).
