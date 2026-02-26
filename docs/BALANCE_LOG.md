# Balance / Iteration Log

Use this file to record tuning and QoL iterations. Keep entries short and factual.

---

## Template

### YYYY-MM-DD - Iteration Title

- `Type`: Balance | QoL | Visual | Content | Tech
- `Goal`: one sentence
- `Change Budget`: Small | Medium | Large

#### Changes

- item
- item

#### Validation

- `npm run smoke`: pass/fail
- `npm run sim:batch:ci`: pass/fail
- extra command(s): pass/fail

#### Results

- key metric deltas
- persona changes
- notable regressions

#### Decision

- Keep / Tweak / Revert

#### Notes

- rationale for criteria changes (if any)

---

## Entries

### 2026-02-26 - Simulation Framework and Persona Matrix

- `Type`: Tech + Balance
- `Goal`: Establish repeatable balancing workflow using personas and CI-style criteria checks.
- `Change Budget`: Large

#### Changes

- Added core (in-memory) simulation path and persona system.
- Added batch runner, criteria evaluation, and CI gate.
- Added persona matrix (accuracy x strategy x bank threshold).
- Added diagnostics (death levels, first purchases, kill/shot metrics).

#### Validation

- `npm run smoke`: pass
- `npm run sim:batch:ci`: pass (after criteria alignment for intended feel)

#### Results

- Balance tuning became measurable and repeatable.
- Exposed strategy traps (`cheapestUpgrade`) vs coherent upgrade strategies.
- Enabled parameter sweeps (e.g. missile energy cost).

#### Decision

- Keep

#### Notes

- Criteria were updated after intentional direction shift toward stronger upgrade-game feel and missile cost `8`.

