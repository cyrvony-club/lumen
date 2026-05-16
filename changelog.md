# Changelog Lumen

Все значимые изменения контента и публичного API документируются здесь. Формат основан на практике «keep a changelog»; для машинного учёта см. `feeds/updates.json`.

## [Unreleased]

### Изменено

- **[`LICENSE`](LICENSE)** — вместо кастомной лицензии: **MIT + Commons Clause v1.0** (устоявшийся source-available шаблон).
- [`docs/legal/license.md`](docs/legal/license.md) — сравнение с Elastic-2.0, FSL, PolyForm, BSL, SSPL.

### Добавлено (ранее в unreleased)

- **[`LICENSE`](LICENSE)** — MIT + Commons Clause v1.0.
- Краткое описание: [`docs/legal/license.md`](docs/legal/license.md).

## [0.3.9] — 2026-05-20

### Добавлено

- Правило **[`.cursor/rules/lumen-product-truth-model.mdc`](.cursor/rules/lumen-product-truth-model.mdc)** — контракт оценки проекта и создания `product-truth-model.json` (процесс, схема, `truth_status`, evidence, цикл `validate` → `generate:package` → `validate`).
- Гайд **[`docs/guides/product-truth-model-authoring.md`](docs/guides/product-truth-model-authoring.md)** — пошаговая инструкция для нового проекта.

### Изменено

- [`README.md`](README.md), skill и правило — ссылки на гайд.

## [0.3.8] — 2026-05-18

### Изменено

- Lumen зафиксирован как **project-agnostic** локальный инструмент: он не хранит знания о конкретных сторонних проектах и не содержит project-specific интеграционных спецификаций как источник истины.
- Спецификация интеграции заменена на универсальный контракт **[`docs/integration/third-party-product-data.md`](docs/integration/third-party-product-data.md)** для любого внешнего сайта, CDN, backend или object storage.
- `README.md`, `docs/spec/lumen-product-spec.md`, `validation-report.md` обновлены: сторонний проект сам публикует нейтральный package (`/llms.txt`, `/product-data/*`), а Lumen только генерирует и валидирует файлы.
- Тест публичной поверхности больше не зависит от корневого `product-truth-model.json` конкретного продукта и использует fixture.

### Удалено

- Project-specific интеграционный документ для конкретного сайта.
- Корневой `product-truth-model.json` конкретного продукта из репозитория Lumen.

## [0.3.7] — 2026-05-17

### Изменено

- **CLI**: единая обработка ошибок через `runCli`, `CliExpectedError`/`throwExpected` и `thrownCliStderrLines` в [`src/lib/exit.ts`](src/lib/exit.ts); все точки входа `src/cli/*.ts` не дублируют блоки `main().then(process.exit)`. Ожидаемые ошибки — короткое сообщение с префиксом `[<команда>]` и exit `1`; непойманные исключения — `Unexpected error` и stack для `Error`. Тексты `validate:*` при успехе/`skip`/AJV-сбоях сохранены; часть ошибок парсинга входа в **`validate:schema`** теперь унифицируется через общий помощник без stack.

### Добавлено

- Юнит-тесты [`tests/cliExitHelpers.test.ts`](tests/cliExitHelpers.test.ts); интеграционная проверка отсутствующего входа [`tests/cliSmoke.integration.test.ts`](tests/cliSmoke.integration.test.ts).


### Добавлено

- Спецификация интеграции package со сторонним сайтом: публичные URL, таблица `Content-Type`, App Router handlers как пример, поток данных, security/verification checklist.
- Валидатор **`findLocalFilesystemPathLeaks`** ([`src/validators/localPathLeaks.ts`](src/validators/localPathLeaks.ts)) в составе **`validate:package`** — ошибка при типичных утечках локальных путей (`/Users/`, `Developer/Projects`, сегмент `workspace/`) в сканируемых публичных артефактах и JSONL.

### Изменено

- Зафиксирован **единый MVP-канон** канонических документов: публичные URL **`/product-data/docs/*.md`**; **`/knowledge/*`** — только возможное будущее HTML-зеркало без competing canonical. Обновлены интеграционная спецификация, [`README.md`](README.md), [`docs/spec/lumen-product-spec.md`](docs/spec/lumen-product-spec.md), [`validation-report.md`](validation-report.md); регрессионные проверки в [`tests/generator/packageGenerator.test.ts`](tests/generator/packageGenerator.test.ts).
- [`README.md`](README.md), [`docs/spec/lumen-product-spec.md`](docs/spec/lumen-product-spec.md) — ссылка на документ интеграции; [`validation-report.md`](validation-report.md) — чеклист этапа публикации на сайте.
- Юнит-тесты [`tests/localPathLeaks.test.ts`](tests/localPathLeaks.test.ts), доп. утверждение в [`tests/rootTruthModelPublicSurface.test.ts`](tests/rootTruthModelPublicSurface.test.ts).

## [0.3.5] — 2026-05-17

### Добавлено

- Временный первый входной файл **`product-truth-model.json`** использовался для проверки генерации package и позже удалён из кодовой базы, чтобы Lumen оставался project-agnostic.
- Тест **`tests/rootTruthModelPublicSurface.test.ts`**: регрессия на отсутствие запрещённого бренда в корневом truth-model.

## [0.3.4] — 2026-05-17

### Изменено

- Генератор канонических Markdown-документов (`src/generator/docs.ts`): разнесён на чистые функции `buildProductOverviewDoc`, `buildUseCasesDoc`, `buildComparisonContextDoc`, `buildFaqDoc`, `buildEvidenceDoc` и общий `buildCanonicalMarkdownDocs`; улучшена читаемость (секции, списки, явные `claim_id` / `evidence_id` / `truth_status`, `source_refs`) при сохранении verbatim JSON-снимков входной модели; публичный текст по-прежнему **без** имени локального инструмента.
- Расширены Vitest-сценарии: `tests/generator/docsBuilders.test.ts`, доп. проверка всех `docs/*.md` пакета в `tests/generator/packageGenerator.test.ts`.

### Добавлено

- Проектный Cursor Skill **`.cursor/skills/product-truth-model/`** (пошаговый опрос блоков входной модели, запрет выдумывания facts, цикл команд `npm run validate:schema` → `npm run generate:package` → `npm run validate`).

## [0.3.3] — 2026-05-17

### Добавлено

- Минимальный **генератор пакета** (`src/generator/*`, CLI `src/cli/generate-package.ts`): `index.json`, `llms.txt`, копия `product-truth-model.json`, пять канонических `docs/*.md`, `entities.jsonl`, `chunks.jsonl`, `updates.json`, `sitemap.xml`, `graph.json`; публичная поверхность без имени локального инструмента и без путей `/lumen/*`.
- Скрипт **`npm run generate:package`**; выходная директория по умолчанию **`generated/product-data/`** (в **`.gitignore`**).
- Опциональная проверка сгенерированного пакета в **`validate:exports`** и **`validate:package`**, если `generated/product-data/` существует.
- Юнит-тесты генератора (`tests/generator/packageGenerator.test.ts`) и входная заготовка `fixtures/product-truth-model.min.json`.

## [0.3.2] — 2026-05-17

### Добавлено

- Осознанная инициализация **npm + TypeScript (strict)** в корне репозитория: скрипты `typecheck`, `lint`, `test`, агрегатор `validate` и три стадии `validate:*`.
- Реализованные валидаторы (`src/validators/*`, точки входа `src/cli/validate-*.ts`): компиляция JSON Schema Draft 2020-12, построчные проверки `exports/*.jsonl`, синтаксис `feeds/updates.json`, `exports/graph.json`, `api/openapi.yaml`, базовые пакетные проверки (направление `relations`, согласованность Claim→Evidence→Chunk, расхождения relations vs graph, фильтрация упоминаний бренда локального инструмента из публикуемых артефактов).
- Минимальные Vitest-регрессии под проверку публичной поверхности и граф-связей.

### Изменено

- `README.md`, `docs/spec/lumen-product-spec.md`: таблица команд и связанных файлов обновлена под структуру `src/`.

## [0.3.1] — 2026-05-17

### Изменено (spec hardening)

- **JSON Schema `$id`:** нейтральные URN `urn:product-knowledge-package:schema:{product-truth-model|entity|chunk}` вместо `https://lumen.local/...`; обновлены спецификация и шаблон отчёта валидации.
- **`schema/product-truth-model.schema.json`:** обязательные `target_llm_queries` (5–8, непустые `query`), `source_of_truth`, `evidence` (≥1 элемент); в claims поле **`truth_status`** вместо `status`; для `evidenced` — обязательные непустые `evidence_ids` (`if`/`then`); у элементов `evidence` опциональные `source_refs` в той же форме, что у entity/chunk.
- **Связи сущностей:** зафиксировано чтение `relations[]` как **subject (текущая entity) → object (`target_id`)**; примеры в `exports/entities.jsonl` и `exports/graph.json` (Product → Feature/Claim, Claim → Evidence).
- **Публичная поверхность:** в `validation-report.md` добавлен чеклист *Public surface contains no Lumen*; в `docs/spec/lumen-product-spec.md` — в критерии validation/lint и в раздел отчёта.
- **`docs/spec/lumen-product-spec.md` + `README.md`:** описан генерируемый **`index.json`** (манифест артефактов: `package_version`, `generated_at`, `product_id`, `artifacts[]` с `type`, `url`, `media_type`, опциональный `checksum`); явно: первая реализация — валидаторы и генерация пакета, не сервер.
- **`api/openapi.yaml`:** `servers.url` → `http://localhost:3000` (локальный/mock), без публичного `api.example.com`.

## [0.3.0] — 2026-05-17

### Добавлено

- [`README.md`](README.md): вход для людей и агентов (локальный инструмент Lumen vs нейтральный публичный **product knowledge package**, MVP checklist, указатели на спецификацию и внутренние правила).
- [`.cursor/rules/lumen-ts-node.mdc`](.cursor/rules/lumen-ts-node.mdc): основной будущий стек **TypeScript + Node.js LTS**, strict TS, правила про JSON Schema 2020-12 и построчный JSONL, будущие `typecheck` / `lint` / `test` / `validate:*`, отдельный осознанный шаг package init.

### Изменено

- [`docs/spec/lumen-product-spec.md`](docs/spec/lumen-product-spec.md): секции **локальный инструмент vs публичный output**; **форма результата (product knowledge package / LLM-readable product data)**; **публикация и доступ LLM** (нейтральные URL, без `/lumen/*`); **интеграция с generic Next.js / App Router** как пример без знания о конкретном проекте; **data processing model** (immutable sources → compiled truth → source_refs → graph/export → validation); **инициализация реализации** (TS/Node, npm-scripts); уточнён MVP (**API только опционально**).
- [`schema/entity.schema.json`](schema/entity.schema.json): `source_refs`, enum типов связей, для `Claim` — ветвление **hypothesis / policy_forbidden** или связь **`claim_supported_by`**; опциональный `truth_status`.
- [`schema/chunk.schema.json`](schema/chunk.schema.json): `source_refs`, `claim_ids`, `evidence_ids`.
- [`feeds/updates.json`](feeds/updates.json): поля уровня пакета (`package_version`, `package_id`, `counts`, агрегированные списки id изменений).
- Пример производного [`exports/graph.json`](exports/graph.json): `nodes` / `edges`.
- [`validation-report.md`](validation-report.md): блоки missing evidence, broken relations, orphan entities, stale claims, duplicate claims, детальный target query coverage.
- [`api/openapi.yaml`](api/openapi.yaml): расширен `UpdatesResponse` опциональными полями пакета (согласованность с feeds); заголовок/description как **опциональный internal/local** контракт machine-readable product data (в 0.3.1 базовый URL зафиксирован как локальный mock).

### Удалено

- Рудиментарные документы `docs/spec/00-overview.md`, `01-agent-system.md`, `02-content-pipeline.md`, `03-data-model.md`, `04-api.md`, `05-mvp.md` — навигация перенесена в README и основную спецификацию.

## [0.2.0] — 2026-05-16

### Изменено

- **Спецификация пересобрана:** основной источник истины — [`docs/spec/lumen-product-spec.md`](docs/spec/lumen-product-spec.md).
- Прежние вспомогательные страницы `docs/spec/*` (до этого релиза) заменены единым `lumen-product-spec.md`; устаревший набор впоследствии удалён в 0.3.0.

### Изменено (артефакты)

- `schema/entity.schema.json`: типы сущностей вокруг product visibility (`Product`, `Feature`, `UseCase`, …); убраны legacy-типы в описании поля `type`.
- Добавлен `schema/product-truth-model.schema.json` для машиночитаемой модели правды.
- `schema/chunk.schema.json`: описание chunk как LLM-readable фрагмента для ingest/retrieval.
- `api/openapi.yaml`: **только retrieval** (опциональное расширение / future); generation endpoints удалены.
- Обновлены примеры `exports/entities.jsonl`, `exports/chunks.jsonl`, `feeds/updates.json`.
- Добавлен шаблон [`validation-report.md`](validation-report.md).

### Изменено (процесс разработки)

- `.cursor/rules/lumen-agent-system.mdc`: явно разделён **внутренний** workflow и продукт; правило про **«Синтез результатов»** куратора после скаутов.

## [0.1.0] — 2026-05-16

### Добавлено

- Набор спецификаций `docs/spec/` (обзор, агенты, пайплайн, модель данных, API, MVP).
- JSON Schema `schema/entity.schema.json`, `schema/chunk.schema.json` (Draft 2020-12).
- OpenAPI 3.1 `api/openapi.yaml`.
- Заготовки `feeds/updates.json`, `exports/entities.jsonl`, `exports/chunks.jsonl`.
- Правило Cursor `.cursor/rules/lumen-agent-system.mdc`.
