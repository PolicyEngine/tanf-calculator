# Data generation scripts

The frontend is fully static: every TANF benefit it shows is precomputed into
`public/data/<STATE>.json`. These scripts produce those files.

## Files

| File | Role |
|---|---|
| `calculator.py` | Builds a PolicyEngine situation for one household and returns its TANF benefit. Single source of truth for income injection and state-variable mapping. |
| `config.py` | State list, county→region/group mappings, default year. |
| `precompute.py` | **Reference** generator — one `Simulation` per grid cell. Slow but simple; also owns `metadata.json`. |
| `precompute_vec.py` | **Fast** generator — vectorized with PolicyEngine `axes`. Recommended. Produces byte-for-byte identical output. |

## The grid

Each state file is a full grid of **15,376** benefit values:

| Dimension | Values | Count |
|---|---|---|
| Earned income (monthly) | $0–$3,000, $100 steps | 31 |
| Unearned income (monthly) | $0–$3,000, $100 steps | 31 |
| Adults | 1, 2 | 2 |
| Children | 0–7 | 8 |

`31 × 31 × 2 × 8 = 15,376`. Stored as `data["<adults>_<children>_false"][earned_idx][unearned_idx]`
= the rounded **monthly** benefit.

## Shelter allowance assumption

Four states (**AZ, NY, VT, FL**) add a rent-based shelter / housing allowance to
the TANF benefit. The grids report the **maximum potential** benefit, so both
generators set `ASSUMED_MONTHLY_RENT = 5000` (via `create_situation`'s
`monthly_rent` param) — a rent high enough to reach every state's shelter cap
across all family sizes (verified: identical at $5,000 and $10,000/mo). Rent is
not income-tested, so the other 47 jurisdictions are byte-identical with or
without it. Pass `--no-shelter` to reproduce the old $0-rent data.

These four states are flagged `shelter_sensitive` in `metadata.json` so the UI
can show a "includes maximum potential shelter allowance" note.

## County-gated states

`CA`, `PA`, `VA`, and `VT` vary by county, so each emits one file per county
group (`CA_1`, `PA_1`…`PA_4`, `VA_2`/`VA_3`, `VT_1`/`VT_2`). Representative
counties per group live in `*_GROUP_COUNTIES`; `metadata.json` maps every county
to its group. **VT** splits into Chittenden (`VT_1`, higher housing cap) vs. the
rest of the state (`VT_2`).

## Why the vectorized generator is ~600× faster

The bottleneck was never the math — it was constructing **15,376 separate
`Simulation` objects per state**. `precompute_vec.py` constructs only **16**:

* The **household-structure** dimensions (adults × children) *can't* be
  expressed as axes — they change the number of person entities — so they stay
  a 16-iteration loop (2 adults × 8 children).
* The **income** dimensions (31 earned × 31 unearned = 961 cells) become two
  PolicyEngine **axis groups**, so one `Simulation` computes all 961 cells in a
  single vectorized pass.

That's 16 builds per state instead of 15,376. Measured on Illinois: **4.3 s
vectorized vs ~47.6 min cell-by-cell (~664×)**.

### How the axes are built (and why it matches exactly)

`precompute_vec.py` reuses `calculator.create_situation` verbatim to build the
base household (with zero income), then attaches axes that reproduce *exactly*
the same inputs the per-cell code would have set:

* `employment_income` (annual) → one year-axis, `min=0, max=36000`.
* `tanf_gross_earned_income` (monthly) → **12 lock-step month-axes**, one per
  month, `min=0, max=3000`. Parallel axes in a group step together, so cell *i*
  gets `employment_income = i·1200` and each month `= i·100` — i.e.
  `employment_income = monthly·12`, identical to `create_situation`.
* State-specific **person-level monthly** vars (DC, IL, MT, SC, TX) → the same
  12-month treatment.

Two subtleties that the code documents inline:

1. **Entity homogeneity.** PolicyEngine lays out a whole parallel-axis group
   using the *first* axis's entity, so person-level and SPM-unit-level vars
   can't share a group. The **SPM-unit annual** vars (CA, CO, NC) are therefore
   set *after* the simulation is built, via `simulation.set_input`, with a
   961-length array matching the cell layout.
2. **Cell orientation.** PolicyEngine expands axis group 0 (earned) as the
   *inner/fast* index (`np.meshgrid` uses `'xy'` indexing), so the flat result
   is laid out `[unearned][earned]`. The code reshapes then transposes (`.T`)
   to the `[earned][unearned]` layout the frontend expects.

### Safety net

If the vectorized path ever raises for a single (adults, children) structure
(e.g. a state with parameters that don't resolve at the target year), that
structure silently falls back to the trusted cell-by-cell path, so the run can
never emit wrong or missing data. Any fallback is reported at the end of the run.

## Validation

`precompute_vec.py` was confirmed **bit-for-bit identical** to `precompute.py`
on 10 states chosen to cover every code path — plain states, person-monthly
special vars (IL), county selection (CA), and SPM-unit annual vars (CA/CO):

```
AK CA_1 CA_2 CT HI IL IN KS KY CO  →  0 mismatches across 138,384+ cells
```

To re-verify after any change, regenerate a state to a temp dir and diff:

```bash
python precompute_vec.py --states IL --output-dir /tmp/vec_check
python - <<'PY'
import json
a = json.load(open("../public/data/IL.json"))
b = json.load(open("/tmp/vec_check/IL.json"))
print("mismatches:", sum(a[k][e][u] != b[k][e][u]
                          for k in a for e in range(31) for u in range(31)))
PY
```

## Usage

```bash
pip install -r requirements.txt

# Fast (recommended)
python precompute_vec.py                # all states -> public/data/
python precompute_vec.py --states CA,NY  # subset
python precompute_vec.py --states IL --output-dir /tmp/vec_check  # don't clobber

# Reference / metadata
python precompute.py --states CA,NY      # slow, cell-by-cell
python precompute.py --metadata-only     # regenerate metadata.json
```

> Note: `metadata.json` (year, FPG, grid config, county data) is owned by
> `precompute.py --metadata-only`. `precompute_vec.py` only writes the per-state
> benefit grids.
