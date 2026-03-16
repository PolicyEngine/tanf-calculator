# TANF Calculator

A web application that estimates [Temporary Assistance for Needy Families (TANF)](https://www.acf.hhs.gov/ofa/programs/tanf) benefit eligibility and amounts for households across all 50 US states and DC. Powered by [PolicyEngine US](https://github.com/PolicyEngine/policyengine-us).

**Live app:** [policyengine.github.io/tanf-calculator](https://policyengine.github.io/tanf-calculator/)

## Features

- **Benefit estimation** for any US state, with support for county-level variations (CA, PA, VA)
- **Income & Benefits chart** visualizing how TANF benefits change as income increases
- **Interactive state map** with heatmap view of benefits across states
- **State ranking** comparing benefit amounts across all states
- **Scenario comparison** for side-by-side "what-if" analysis
- **Poverty context** showing household income relative to the Federal Poverty Level

## Architecture

The app is fully static — all TANF benefits are precomputed into JSON files, so no backend server is needed.

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Recharts, react-simple-maps |
| Data generation | Python, [PolicyEngine US](https://github.com/PolicyEngine/policyengine-us) |
| Hosting | GitHub Pages (via `docs/` folder) |

**Current data version:** policyengine-us `1.511.1`

## Getting Started

### Prerequisites

- Node.js 18+

### Run locally

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:3000/tanf-calculator/`.

### Regenerate data

Requires Python 3.10+ and policyengine-us:

```bash
cd scripts
pip install -r requirements.txt
python precompute.py           # Generate all state JSON files
python precompute.py --states CA,NY  # Generate specific states only
python precompute.py --metadata-only # Regenerate metadata.json only
```

Then rebuild the frontend:

```bash
cd frontend
npm run build
```

The built files go to `docs/` for GitHub Pages deployment.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
