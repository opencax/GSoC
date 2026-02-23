# Manifold CI + Benchmarking Discovery and Proposal

This draft is written so it can be posted directly to the issue thread as the “summary + proposal” requested by maintainers.

## 1) Current-state summary (what to inventory in `elalish/manifold`)

> Note: this repository (`opencax/GSoC`) only contains idea listings, so the concrete CI/benchmark status must be collected in the `elalish/manifold` repo.

### CI inventory checklist

- Enumerate all workflows in `.github/workflows/` and list:
  - Trigger type (`push`, `pull_request`, schedule, manual).
  - OS matrix and compiler matrix.
  - Build types (`Debug`/`Release`) and feature flags.
  - Test coverage (unit/integration/fuzz/examples).
- Capture gaps against the issue request:
  - Are sanitizers present? (ASan/UBSan/TSan).
  - Are deterministic-cross-platform checks present?
  - Are performance regressions tracked in CI?

### Benchmark inventory checklist

- Identify any existing benchmark binaries/scripts and where they run.
- Identify storage strategy for results (if any):
  - Artifacts only, committed JSON, external dashboard, or none.
- Check if there is historical trend visibility today.

## 2) Proposed implementation plan

### Phase A — Strengthen correctness CI

1. **Add sanitizer jobs (initially Linux):**
   - New workflow job(s) to build + run tests with `-fsanitize=address,undefined`.
   - Keep runtime bounded by selecting representative test targets.
   - Upload sanitizer logs as artifacts.

2. **Add determinism check across platforms:**
   - Define canonical benchmark/test inputs.
   - Emit normalized machine-readable outputs (JSON/text with stable formatting).
   - Compare outputs across Linux/macOS/Windows jobs:
     - Either strict byte compare after normalization.
     - Or tolerance-based comparison for floating-point fields.

3. **Guardrails for flaky checks:**
   - Separate deterministic checks from perf checks.
   - Add retry only where external dependencies are involved.

### Phase B — Continuous benchmarking in GitHub Actions

1. **Benchmark workflow design:**
   - Trigger on `push` to main + manual dispatch + nightly schedule.
   - Run on fixed runner type to reduce noise.
   - Persist raw benchmark output as versioned JSON artifacts.

2. **Baseline + comparison strategy:**
   - Compare PR branch result against:
     - latest `main`, and/or
     - rolling baseline (median of last N runs).
   - Compute percent change and flag regressions using configurable thresholds.

3. **Data publication path:**
   - Option A: store JSON history in a `gh-pages` branch.
   - Option B: push to a dedicated benchmark-results repo.
   - Option C: keep artifacts only (lowest effort, weakest UX).

### Phase C — Frontend benchmark dashboard

1. **Frontend scope (simple first version):**
   - Table + sparkline/trend chart per benchmark.
   - Filters by OS/compiler/config/date range.
   - Regression badges (green/yellow/red).

2. **Tech choices:**
   - If manifold already has web docs tooling: integrate there.
   - Otherwise static HTML+TypeScript page fed by JSON.

3. **MVP delivery criteria:**
   - A maintainer can open one URL and inspect trends/regressions.
   - Data refreshes automatically from CI outputs.

### Phase D — Port OpenSCAD-style benchmark cases

1. Select representative workloads:
   - Boolean-heavy solids.
   - Deep CSG trees.
   - Mesh conversion/stress cases.
2. Port input generators and normalize runtime parameters.
3. Tag benchmarks by category and expected complexity.

## 3) Concrete first-week tasks

- [ ] Post CI/benchmark inventory table from the current manifold repo.
- [ ] Open PR 1: add Linux ASan+UBSan workflow job.
- [ ] Open PR 2: add benchmark workflow that uploads JSON artifacts.
- [ ] Open PR 3: scaffold dashboard page reading those JSON files.
- [ ] Open PR 4: port first 3–5 OpenSCAD-derived benchmark scenarios.

## 4) Suggested comment to post in the issue thread

I reviewed the project direction and propose starting with a discovery pass, then delivering in small PRs:

1. Inventory existing manifold workflows/tests/benchmarks and map gaps (sanitizers, deterministic checks, historical perf tracking).
2. Add Linux ASan+UBSan CI job first (fast feedback, low risk).
3. Add a scheduled benchmark workflow producing JSON artifacts and PR-vs-main regression summaries.
4. Publish those JSON results into a lightweight dashboard (static TS/HTML) with trend charts and regression badges.
5. Port a first set of OpenSCAD-style workloads (boolean-heavy, deep CSG, mesh stress) into the benchmark suite.

If this direction sounds good, I can start by posting the CI/benchmark inventory table and then open the sanitizer PR as the first concrete step.

## 5) Risks and mitigations

- **CI runtime growth:** keep sanitizer/benchmark jobs in separate workflows and use selective triggers.
- **Benchmark noise:** pin runner type, run multiple iterations, compare medians.
- **Cross-platform float drift:** normalize outputs and apply field-specific tolerances.
- **Dashboard maintenance cost:** start with static rendering and JSON schema versioning.
