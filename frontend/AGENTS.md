<!-- code-review-graph MCP tools -->

## Architecture (FSD)

Follow **Feature-Sliced Design** — see [`.cursor/docs/feature-sliced-architecture.md`](.cursor/docs/feature-sliced-architecture.md). New code: screens → thunks → feature `api/` → `services/core/`; no direct `@/services/*` in UI.

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

## Screen padding & layout (required)

- Use `screenContentContainerStyle` (`paddingTop: 18`, `paddingBottom: 30`, `paddingHorizontal: 16`).
- Standard horizontal screen padding is `16` (`SCREEN_HORIZONTAL_PADDING` / `spacing.screen`).
- Form-heavy or detail shells may use `22` (`SCREEN_HORIZONTAL_PADDING_WIDE` / `spacing.screenWide`).
- Do not use `useSafeAreaInsets()` for dynamic screen padding. See `.cursor/rules/screen-padding.mdc`.

## Styling system (required)

- Always use class-based React Native `StyleSheet.create` for UI styling instead of NativeWind `className`.
- Define clean, semantic class names (`styles.container`, `styles.card`, `styles.title`, etc.) and compose styles using design tokens (`colors`, `spacing`, `fontTextStyles`).
- Decompose monolithic screens into clean, modular components inside feature `ui/components/` directories.
- Optimize components for fast render cycles (`React.memo`, `useCallback`, `useMemo`).

## Internationalization (i18n)

- Full multi-language dictionary translation is **formally deferred**. Use readable English strings directly in UI.
- `CustomText` preserves the `tx` prop contract so localization can be enabled incrementally in the future without API churn.

## activeOpacity (required)

`TouchableOpacity` must use `activeOpacity={0.7}`. Only `1` is allowed for disabled/locked controls or non-fading backdrops. See `.cursor/rules/active-opacity.mdc`.

