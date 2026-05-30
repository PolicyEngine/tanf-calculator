# TANF Calculator

A web application that estimates [Temporary Assistance for Needy Families (TANF)](https://www.acf.hhs.gov/ofa/programs/tanf) benefit eligibility and amounts for households across all 50 US states and DC. Powered by [PolicyEngine US](https://github.com/PolicyEngine/policyengine-us).

**Live app:** [policyengine.org/us/tanf-calculator](https://policyengine.org/us/tanf-calculator)

## Features

- **Benefit estimation** for any US state, with support for county-level variations (CA, PA, VA, VT)
- **Income & benefits chart** comparing income + TANF to the federal poverty level
- **Interactive state map** with heatmap view of benefits across states
- **State ranking** comparing benefit amounts across all states
- **Scenario comparison** for side-by-side "what-if" analysis

## Architecture

The app is fully static — all TANF benefits are precomputed into JSON files, so no backend server is needed.

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Recharts, react-simple-maps |
| Data generation | Python, [PolicyEngine US](https://github.com/PolicyEngine/policyengine-us) |
| Hosting | Vercel (embedded in policyengine.org via multizone) |

**Current data version:** policyengine-us `1.715.3` + [Indiana TANF fix #8543](https://github.com/PolicyEngine/policyengine-us/pull/8543), tax year 2026 — all data files regenerated.

For the four housing-sensitive states (AZ, NY, VT, FL), the precomputed benefit
includes the **maximum potential shelter / housing allowance** (the model assumes
rent high enough to reach the shelter cap). These states are flagged
`shelter_sensitive` in `metadata.json`, and the UI notes the assumption.

### Precomputed data grid

| Dimension | Range | Step |
|-----------|-------|------|
| Earned income | $0–$3,000/mo | $25 |
| Unearned income | $0–$3,000/mo | $100 |
| Adults | 1–2 | — |
| Children | 0–7 | — |

The earned axis uses a fine $25 step (the benefit's disregard/phase-out kinks
fall on $25 boundaries) while unearned uses $100 (its response is ~linear) —
`121 × 31 × 2 × 8 = 60,016` benefit values per state. The vectorized generator
(`precompute_vec.py`) computes a full state in ~2–5 seconds — roughly **600×
faster** than the cell-by-cell generator — and is validated bit-for-bit
identical to it. See [scripts/README.md](scripts/README.md).

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)

### Run locally

```bash
bun install
bun run dev
```

The dev server starts at `http://localhost:3000/us/tanf-calculator`.

### Regenerate data

Requires Python 3.10+ and policyengine-us:

```bash
cd scripts
pip install -r requirements.txt

# Fast vectorized generator (recommended; ~2–5s per state)
python precompute_vec.py                 # Generate all state JSON files
python precompute_vec.py --states CA,NY   # Generate specific states only

# Reference cell-by-cell generator (slow; metadata.json lives here)
python precompute.py --states CA,NY       # Generate specific states (slow)
python precompute.py --metadata-only      # Regenerate metadata.json only
```

The two generators are interchangeable and produce byte-for-byte identical
data; `precompute_vec.py` is just far faster. See
[scripts/README.md](scripts/README.md) for how the vectorization works and the
validation behind that claim.

Then rebuild the app:

```bash
bun run build
```

Deployment is handled by Vercel automatically on push to `main`.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
