# Desloppify Report

**Path:** C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit
**Pack:** js-ts

**Files scanned:** 84
**Non-empty lines:** 3401

## Summary
| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 14 |
| Low | 2 |

## Normalized Metrics
| Metric | Value |
|--------|-------|
| Score / file | 1.01 |
| Score / KLOC | 24.99 |
| Findings / file | 0.2 |
| Findings / KLOC | 5 |

## Categories
| Category | Issues | Fixable |
|----------|--------|---------|
| complexity | 3 | 0 |
| ai-slop | 1 | 0 |
| naming-semantics | 2 | 0 |
| async-correctness | 1 | 0 |
| accessibility | 7 | 0 |
| inconsistency | 3 | 0 |

## Path Hotspots
| Path | Findings | Penalty |
|------|----------|---------|
| C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\public\index.html | 8 | 10 |
| C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\test-flow.js | 2 | 1 |
| C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\src\config\container.ts | 1 | 1 |
| C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\tests\unit\transfers\transfers.service.test.ts | 1 | 1 |
| C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\src\shared\utils\retry.ts | 1 | 0.75 |

## Issues

### HIGH

- **LARGE_FILE** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\public\index.html:1` — File has 643 lines of code — approaching god file territory (threshold: 500)

### MEDIUM

- **NESTED_TERNARY** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\tests\unit\transfers\transfers.service.test.ts:40` — Nested ternary chain — use if/else for readability
- **NUMERIC_SUFFIX** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\test-flow.js:53` — Numeric suffix in identifier — rename to describe what's different
- **NUMERIC_SUFFIX** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\test-flow.js:103` — Numeric suffix in identifier — rename to describe what's different
- **INPUT_NO_LABEL** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\public\index.html:311` — Input with placeholder but no label — placeholders are not labels
  - Fix: Add <label htmlFor> or aria-label
- **INPUT_NO_LABEL** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\public\index.html:312` — Input with placeholder but no label — placeholders are not labels
  - Fix: Add <label htmlFor> or aria-label
- **INPUT_NO_LABEL** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\public\index.html:319` — Input with placeholder but no label — placeholders are not labels
  - Fix: Add <label htmlFor> or aria-label
- **INPUT_NO_LABEL** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\public\index.html:320` — Input with placeholder but no label — placeholders are not labels
  - Fix: Add <label htmlFor> or aria-label
- **INPUT_NO_LABEL** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\public\index.html:348` — Input with placeholder but no label — placeholders are not labels
  - Fix: Add <label htmlFor> or aria-label
- **INPUT_NO_LABEL** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\public\index.html:352` — Input with placeholder but no label — placeholders are not labels
  - Fix: Add <label htmlFor> or aria-label
- **INPUT_NO_LABEL** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\public\index.html:370` — Input with placeholder but no label — placeholders are not labels
  - Fix: Add <label htmlFor> or aria-label
- **SCATTERED_ENV** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\knexfile.ts:1` — 15 direct process.env accesses — centralize in a config module
- **SCATTERED_ENV** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\tests\setup.ts:1` — 5 direct process.env accesses — centralize in a config module
- **IMPORT_HEAVY** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\src\config\container.ts:1` — File imports from 24 modules — too many concerns in one file
- **SCATTERED_ENV** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\dist\knexfile.js:1` — 15 direct process.env accesses — centralize in a config module

### LOW

- **UNNECESSARY_INTERMEDIATE** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\tests\unit\middleware\error.middleware.test.ts:12` — Unnecessary intermediate variable — return the expression directly
- **REDUNDANT_RETURN_AWAIT** `C:\Users\Owner\.gemini\antigravity\scratch\DemoCredit\src\shared\utils\retry.ts:31` — return await on a direct promise — return the promise unless you need try/catch semantics

