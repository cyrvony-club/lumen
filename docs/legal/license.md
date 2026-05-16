# Лицензия

Полный текст: [`LICENSE`](../../LICENSE).

**Схема:** [MIT License](https://opensource.org/license/mit) + [Commons Clause v1.0](https://commonsclause.com/) — **source-available**, не OSI open source.

SPDX (комбинированная): `LicenseRef-MIT-Commons-Clause-1.0` (официального единого идентификатора для пары нет; отдельно: `MIT`, `Commons-Clause-1.0`).

## Кратко

| Разрешено | Запрещено |
|-----------|-----------|
| Использовать в своём бизнесе | **Sell** самого Lumen — продажа, платный SaaS/hosting, где ценность ≈ функциональность Software |
| Генерировать product knowledge package и монетизировать **результаты** | Переименовать и продавать как «свой» продукт (ElastiLumen и т.п.) |
| Встраивать в более крупный продукт с существенной добавленной ценностью | Консалтинг **вокруг** самого Software как основной платный продукт |
| Модифицировать, форкать, распространять с той же лицензией | |

Определение **Sell** — в [`LICENSE`](../../LICENSE) и [FAQ Commons Clause](https://commonsclause.com/).

## Почему не кастомная лицензия

Кастомный текст сложнее проверять юристам и CI. **MIT + Commons Clause** — устоявшийся шаблон (Redis modules, ряд source-available продуктов), с публичным FAQ и разбором намерений.

## Альтернативы (если понадобится сменить политику)

| Лицензия | SPDX | Суть | Почему не выбрали для Lumen |
|----------|------|------|-----------------------------|
| **MIT + Commons Clause** | `LicenseRef-MIT-Commons-Clause-1.0` | Запрет **продажи** Software; бизнес-использование и монетизация **надстроек** — да | **Выбрано** — ближе всего к «не продавать инструмент, но использовать в бизнесе» |
| [Elastic License 2.0](https://www.elastic.co/licensing/elastic-license) | `Elastic-2.0` | Запрет **managed service** (AWS-стиль); внутреннее и встраивание — да | Не запрещает продажу бинарника/лицензии напрямую; фокус на хостинге, не на «sell» |
| [FSL 1.1 MIT Future](https://fsl.software/) | `FSL-1.1-MIT` | Запрет **конкурирующего** коммерческого use; через 2 года → MIT | Sentry и др.; через 2 года Lumen станет полностью MIT — не то, если нужен постоянный запрет продажи |
| [PolyForm Shield](https://polyformproject.org/licenses/shield/1.0.0) | — | Запрет продуктов, **конкурирующих** с Software | Не «не продавай», а «не конкурируй» — другая логика |
| [PolyForm Internal Use](https://polyformproject.org/licenses/internal-use/1.0.0) | — | Только **внутренний** бизнес-use | **Нельзя** распространять код (GitHub/fork) — слишком узко |
| [PolyForm Noncommercial](https://polyformproject.org/licenses/noncommercial/1.0.0) | — | Любое **коммерческое** использование запрещено | Противоречит «можно для своего бизнеса» |
| [BSL 1.1](https://mariadb.com/bsl11/) | `BUSL-1.1` | Ограничен production use + **срок** до перехода в open source | MariaDB/Cockroach; параметризуемая, со «sunset» в OSS |
| [SSPL](https://www.mongodb.com/licensing/server-side-public-license) | `SSPL-1.0` | Copyleft для **service providers** | MongoDB; тяжёлая для adopters, другая цель |

## Ссылки

- [Commons Clause FAQ](https://commonsclause.com/)
- [FOSSA: guide to source-available licenses](https://fossa.com/blog/comprehensive-guide-source-available-software-licenses/)
- [PolyForm licenses](https://polyformproject.org/licenses)
