"""
FastAPI backend for TANF Calculator
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from calculator import (
    calculate_tanf,
    calculate_tanf_over_income_range,
    calculate_combined_benefits_over_income_range,
)
from config import (
    PILOT_STATES,
    DEFAULT_YEAR,
    STATES_REQUIRING_COUNTY,
    CA_COUNTIES,
)

app = FastAPI(
    title="TANF Calculator API",
    description="Calculate TANF benefits using PolicyEngine-US",
    version="0.1.0",
)

# CORS: allow configured frontend URL + local dev origins
cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:5173",
]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HouseholdInput(BaseModel):
    state: str = Field(..., description="Two-letter state code (CA, DC, IL, TX, ID)")
    year: int = Field(default=DEFAULT_YEAR, description="Tax year")
    num_adults: int = Field(default=1, ge=1, le=2, description="Number of adults (1 or 2)")
    num_children: int = Field(default=1, ge=0, le=10, description="Number of children")
    earned_income: float = Field(default=0, ge=0, description="Annual earned income")
    unearned_income: float = Field(default=0, ge=0, description="Annual unearned income")
    child_ages: Optional[list[int]] = Field(default=None, description="Ages of children")
    county: Optional[str] = Field(default=None, description="County enum name (for states that require it)")
    is_tanf_enrolled: bool = Field(default=False, description="Currently receiving TANF (affects income tests)")
    resources: float = Field(default=0, ge=0, description="Total household assets/resources")


class IncomeRangeInput(BaseModel):
    state: str = Field(..., description="Two-letter state code")
    year: int = Field(default=DEFAULT_YEAR)
    num_adults: int = Field(default=1, ge=1, le=2)
    num_children: int = Field(default=1, ge=0, le=10)
    earned_income: float = Field(default=0, ge=0, description="User's annual earned income (for ratio)")
    unearned_income: float = Field(default=0, ge=0, description="User's annual unearned income (for ratio)")
    income_min: float = Field(default=0, ge=0)
    income_max: float = Field(default=50000, ge=0)
    income_step: float = Field(default=1000, gt=0)
    child_ages: Optional[list[int]] = Field(default=None)
    county: Optional[str] = Field(default=None, description="County enum name (for states that require it)")
    is_tanf_enrolled: bool = Field(default=False, description="Currently receiving TANF")
    resources: float = Field(default=0, ge=0, description="Total household assets/resources")


class AllStatesInput(BaseModel):
    year: int = Field(default=DEFAULT_YEAR, description="Tax year")
    num_adults: int = Field(default=1, ge=1, le=2, description="Number of adults (1 or 2)")
    num_children: int = Field(default=1, ge=0, le=10, description="Number of children")
    earned_income: float = Field(default=0, ge=0, description="Annual earned income")
    unearned_income: float = Field(default=0, ge=0, description="Annual unearned income")
    child_ages: Optional[list[int]] = Field(default=None, description="Ages of children")
    is_tanf_enrolled: bool = Field(default=False, description="Currently receiving TANF")
    resources: float = Field(default=0, ge=0, description="Total household assets/resources")


class CombinedRangeInput(BaseModel):
    state: str = Field(..., description="Two-letter state code")
    year: int = Field(default=DEFAULT_YEAR)
    num_adults: int = Field(default=1, ge=1, le=2)
    num_children: int = Field(default=1, ge=0, le=10)
    earned_income: float = Field(default=0, ge=0)
    unearned_income: float = Field(default=0, ge=0)
    income_min: float = Field(default=0, ge=0)
    income_max: float = Field(default=50000, ge=0)
    income_step: float = Field(default=2000, gt=0)
    child_ages: Optional[list[int]] = Field(default=None)
    county: Optional[str] = Field(default=None)
    is_tanf_enrolled: bool = Field(default=False)
    resources: float = Field(default=0, ge=0)
    include_programs: Optional[list[str]] = Field(default=None)


class ScenarioComparisonInput(BaseModel):
    scenario_a: HouseholdInput
    scenario_b: HouseholdInput


@app.get("/")
def root():
    static_index = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.isfile(static_index):
        from starlette.responses import FileResponse
        return FileResponse(static_index)
    return {"message": "TANF Calculator API", "version": "0.1.0"}


@app.get("/health")
def health():
    return {"message": "TANF Calculator API", "version": "0.1.0"}


@app.get("/states")
def get_states():
    """Get list of available states for TANF calculation."""
    return {
        "states": [
            {
                "code": code,
                "name": name,
                "requires_county": code in STATES_REQUIRING_COUNTY,
            }
            for code, name in PILOT_STATES.items()
        ]
    }


@app.get("/counties/{state}")
def get_counties(state: str):
    """Get list of counties for a state (if required)."""
    if state not in STATES_REQUIRING_COUNTY:
        return {"counties": [], "required": False}

    if state == "CA":
        counties = [
            {
                "code": enum_name,
                "name": display_name,
                "region": region,
            }
            for enum_name, display_name, region in CA_COUNTIES
        ]
        return {
            "counties": counties,
            "required": True,
            "note": "Region 1 = higher cost counties, Region 2 = other counties",
        }

    # Placeholder for other states that may require counties in the future
    return {"counties": [], "required": True}


@app.post("/calculate")
def calculate(input: HouseholdInput):
    """Calculate TANF benefit for a single household."""
    if input.state not in PILOT_STATES:
        raise HTTPException(
            status_code=400,
            detail=f"State '{input.state}' not supported. Available: {list(PILOT_STATES.keys())}"
        )

    try:
        result = calculate_tanf(
            state=input.state,
            year=input.year,
            num_adults=input.num_adults,
            num_children=input.num_children,
            earned_income=input.earned_income,
            unearned_income=input.unearned_income,
            child_ages=input.child_ages,
            county=input.county,
            is_tanf_enrolled=input.is_tanf_enrolled,
            resources=input.resources,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate-range")
def calculate_range(input: IncomeRangeInput):
    """Calculate TANF benefits over an income range (for charts)."""
    if input.state not in PILOT_STATES:
        raise HTTPException(
            status_code=400,
            detail=f"State '{input.state}' not supported. Available: {list(PILOT_STATES.keys())}"
        )

    try:
        results = calculate_tanf_over_income_range(
            state=input.state,
            year=input.year,
            num_adults=input.num_adults,
            num_children=input.num_children,
            earned_income=input.earned_income,
            unearned_income=input.unearned_income,
            income_min=input.income_min,
            income_max=input.income_max,
            income_step=input.income_step,
            child_ages=input.child_ages,
            county=input.county,
            is_tanf_enrolled=input.is_tanf_enrolled,
            resources=input.resources,
        )
        return {
            "state": input.state,
            "state_name": PILOT_STATES[input.state],
            "year": input.year,
            "household": {
                "num_adults": input.num_adults,
                "num_children": input.num_children,
                "is_tanf_enrolled": input.is_tanf_enrolled,
                "resources": input.resources,
            },
            "county": input.county,
            "data": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate-all-states")
def calculate_all_states(input: AllStatesInput):
    """Calculate TANF benefits for all available states (for comparison)."""
    results = []

    for state_code, state_name in PILOT_STATES.items():
        try:
            result = calculate_tanf(
                state=state_code,
                year=input.year,
                num_adults=input.num_adults,
                num_children=input.num_children,
                earned_income=input.earned_income,
                unearned_income=input.unearned_income,
                child_ages=input.child_ages,
                is_tanf_enrolled=input.is_tanf_enrolled,
                resources=input.resources,
            )
            results.append({
                "state": state_code,
                "state_name": state_name,
                "tanf_monthly": result["tanf_monthly"],
                "tanf_annual": result["tanf_annual"],
                "eligible": result["eligible"],
            })
        except Exception:
            # Skip states that error (e.g., parameter issues for certain years)
            results.append({
                "state": state_code,
                "state_name": state_name,
                "tanf_monthly": 0,
                "tanf_annual": 0,
                "eligible": False,
                "error": True,
            })

    # Sort by benefit amount (highest first)
    results.sort(key=lambda x: x["tanf_monthly"], reverse=True)

    # Find max benefit for normalization
    max_benefit = max(r["tanf_monthly"] for r in results) if results else 0

    return {
        "year": input.year,
        "household": {
            "num_adults": input.num_adults,
            "num_children": input.num_children,
            "earned_income": input.earned_income,
            "unearned_income": input.unearned_income,
        },
        "max_benefit": max_benefit,
        "states": results,
    }


@app.post("/calculate-combined-range")
def calculate_combined_range(input: CombinedRangeInput):
    """Calculate TANF + SNAP + EITC + CTC over an income range."""
    if input.state not in PILOT_STATES:
        raise HTTPException(
            status_code=400,
            detail=f"State '{input.state}' not supported. Available: {list(PILOT_STATES.keys())}"
        )

    try:
        results = calculate_combined_benefits_over_income_range(
            state=input.state,
            year=input.year,
            num_adults=input.num_adults,
            num_children=input.num_children,
            earned_income=input.earned_income,
            unearned_income=input.unearned_income,
            income_min=input.income_min,
            income_max=input.income_max,
            income_step=input.income_step,
            child_ages=input.child_ages,
            county=input.county,
            is_tanf_enrolled=input.is_tanf_enrolled,
            resources=input.resources,
            include_programs=input.include_programs,
        )
        programs_available = []
        if results:
            first = results[0]
            if "tanf_monthly" in first:
                programs_available.append("tanf")
            if "snap_monthly" in first:
                programs_available.append("snap")
            if "eitc_monthly" in first:
                programs_available.append("eitc")
            if "ctc_monthly" in first:
                programs_available.append("ctc")

        return {
            "state": input.state,
            "programs_available": programs_available,
            "data": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate-comparison")
def calculate_comparison(input: ScenarioComparisonInput):
    """Compare TANF benefits for two household scenarios."""
    for label, scenario in [("scenario_a", input.scenario_a), ("scenario_b", input.scenario_b)]:
        if scenario.state not in PILOT_STATES:
            raise HTTPException(
                status_code=400,
                detail=f"State '{scenario.state}' in {label} not supported."
            )

    try:
        result_a = calculate_tanf(
            state=input.scenario_a.state,
            year=input.scenario_a.year,
            num_adults=input.scenario_a.num_adults,
            num_children=input.scenario_a.num_children,
            earned_income=input.scenario_a.earned_income,
            unearned_income=input.scenario_a.unearned_income,
            child_ages=input.scenario_a.child_ages,
            county=input.scenario_a.county,
            is_tanf_enrolled=input.scenario_a.is_tanf_enrolled,
            resources=input.scenario_a.resources,
        )
        result_b = calculate_tanf(
            state=input.scenario_b.state,
            year=input.scenario_b.year,
            num_adults=input.scenario_b.num_adults,
            num_children=input.scenario_b.num_children,
            earned_income=input.scenario_b.earned_income,
            unearned_income=input.scenario_b.unearned_income,
            child_ages=input.scenario_b.child_ages,
            county=input.scenario_b.county,
            is_tanf_enrolled=input.scenario_b.is_tanf_enrolled,
            resources=input.scenario_b.resources,
        )

        difference = {
            "tanf_monthly": result_b["tanf_monthly"] - result_a["tanf_monthly"],
            "tanf_annual": result_b["tanf_annual"] - result_a["tanf_annual"],
            "eligible_changed": result_a["eligible"] != result_b["eligible"],
        }

        return {
            "scenario_a": result_a,
            "scenario_b": result_b,
            "difference": difference,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve frontend static files in production
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    assets_dir = os.path.join(static_dir, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
