# TANF Calculator

A web application that estimates [Temporary Assistance for Needy Families (TANF)](https://www.acf.hhs.gov/ofa/programs/tanf) benefit eligibility and amounts for households across all 50 US states and DC. Powered by [PolicyEngine US](https://github.com/PolicyEngine/policyengine-us).

## Features

- **Benefit estimation** for any US state, with support for county-level variations (e.g., California regions)
- **Eligibility diagnostics** showing which tests (demographic, economic, resource) pass or fail
- **Income sensitivity charts** visualizing how benefits change as income increases
- **Multi-program comparison** showing TANF alongside SNAP, EITC, and CTC
- **Interactive state map** with heatmap view of benefits across states
- **State ranking** comparing benefit amounts across all states
- **Scenario comparison** for side-by-side "what-if" analysis
- **Poverty context** showing household income relative to the Federal Poverty Level

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Recharts, react-simple-maps |
| Backend | FastAPI, Uvicorn, Pydantic |
| Calculation Engine | [PolicyEngine US](https://github.com/PolicyEngine/policyengine-us) |

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The API server starts at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:3000` and proxies API requests to the backend.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/states` | GET | List supported states |
| `/counties/{state}` | GET | Get counties for a state |
| `/calculate` | POST | Calculate TANF for a household |
| `/calculate-range` | POST | Calculate TANF over an income range |
| `/calculate-all-states` | POST | Compare benefits across all states |
| `/calculate-combined-range` | POST | Calculate TANF + SNAP + EITC + CTC over income range |
| `/calculate-comparison` | POST | Compare two household scenarios |

## License

This project is licensed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE) for details.
