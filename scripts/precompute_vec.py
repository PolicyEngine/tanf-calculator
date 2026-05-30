#!/usr/bin/env python3
"""
VECTORIZED TANF precompute — experimental fast path.

Instead of building one Simulation per (earned, unearned) cell (60,016 builds
per state), this builds ONE Simulation per household *structure*
(num_adults x num_children = 16) and sweeps the 121x31 income grid with
PolicyEngine `axes`. That's 16 Simulation builds per state instead of 60,016.

The income injection is made byte-for-byte equivalent to
calculator.create_situation by:
  * reusing create_situation itself (with earned=unearned=0) for the base
    household structure, then
  * attaching axes that reproduce exactly the same inputs the per-cell code
    would have set:
      - employment_income (annual) as one year-axis,
      - tanf_gross_earned_income (monthly) as 12 lockstep month-axes,
      - the same state-specific person-monthly / spm-year vars.

Output JSON format is identical to precompute.py so the frontend can't tell
the difference. Validate against the committed per-cell files before trusting.
"""

import argparse
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from policyengine_us import Simulation
from calculator import (
    create_situation,
    STATE_TANF_VARIABLES,
    _calculate_tanf_amount,
)
from config import PILOT_STATES, CA_COUNTIES, PA_COUNTIES, VA_COUNTIES, VT_COUNTIES

# --- Grid configuration (must match precompute.py) ---
# Asymmetric resolution: the TANF benefit kinks (earned-income disregards /
# phase-outs) fall on $25 boundaries on the EARNED axis, while the response to
# UNEARNED income is ~linear. So we sample earned finely ($25) and unearned
# coarsely ($100) — smooth charts at ~1/4 the data of a symmetric $25 grid.
YEAR = 2026
EARNED_STEP = 25       # $/mo
UNEARNED_STEP = 100    # $/mo
EARNED_MAX_MONTHLY = 3000
UNEARNED_MAX_MONTHLY = 3000
EARNED_COUNT = EARNED_MAX_MONTHLY // EARNED_STEP + 1       # 121
UNEARNED_COUNT = UNEARNED_MAX_MONTHLY // UNEARNED_STEP + 1  # 31
ADULTS_RANGE = [1, 2]
CHILDREN_RANGE = list(range(0, 8))

# Shelter allowance assumption (see scripts/README.md). The calculator reports
# the maximum potential monthly benefit, which for the housing-sensitive states
# (AZ, NY, VT, FL) includes the full (capped) TANF shelter / housing allowance.
# We assume a rent high enough to reach every state's shelter cap across all
# family sizes; rent is not income-tested, so the other 47 jurisdictions are
# unaffected. Pass --no-shelter (rent 0) to reproduce the old no-shelter data.
ASSUMED_MONTHLY_RENT = 5000

# Representative counties per region/group (must match precompute.py)
CA_REGION_COUNTIES = {1: "LOS_ANGELES_COUNTY_CA", 2: "SACRAMENTO_COUNTY_CA"}
PA_GROUP_COUNTIES = {
    1: "BUCKS_COUNTY_PA",
    2: "PHILADELPHIA_COUNTY_PA",
    3: "BEAVER_COUNTY_PA",
    4: "ARMSTRONG_COUNTY_PA",
}
VA_GROUP_COUNTIES = {2: "ACCOMACK_COUNTY_VA", 3: "ARLINGTON_COUNTY_VA"}
VT_GROUP_COUNTIES = {1: "CHITTENDEN_COUNTY_VT", 2: "WASHINGTON_COUNTY_VT"}

# --- State-specific income vars (MIRRORS calculator.create_situation) ---
# Split by entity because PolicyEngine axis groups must be entity-homogeneous
# (the builder lays out a whole parallel-axis group using the FIRST axis's
# entity). So PERSON-level monthly vars go on axes, while SPM-unit-level annual
# vars are set via simulation.set_input() AFTER the simulation is built.
#
# PERSON-level, monthly (set across all 12 months) -> axes:
STATE_EARNED_PERSON_VARS = {
    "DC": "dc_tanf_gross_earned_income",
    "IL": "il_tanf_gross_earned_income",
    "MT": "mt_tanf_gross_earned_income_person",
    "SC": "sc_tanf_gross_earned_income",
    "TX": "tx_tanf_gross_earned_income",
}
STATE_UNEARNED_PERSON_VARS = {
    "DC": "dc_tanf_gross_unearned_income",
    "IL": "il_tanf_gross_unearned_income",
    "MT": "mt_tanf_gross_unearned_income_person",
    "SC": "sc_tanf_gross_unearned_income",
    "TX": "tx_tanf_gross_unearned_income",
}
# SPM-unit-level, annual -> set_input post-build:
STATE_EARNED_SPM_VARS = {
    "CO": "co_tanf_countable_gross_earned_income",
}
STATE_UNEARNED_SPM_VARS = {
    "CA": "ca_tanf_other_unearned_income",
    "CO": "co_tanf_countable_gross_unearned_income",
    "NC": "nc_tanf_countable_gross_unearned_income",
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")


def build_axes(state, year):
    """Build the two-group axes (earned dim, unearned dim) for `state`.

    Group 0 = earned income dimension (EARNED_COUNT cells),
    Group 1 = unearned income dimension (UNEARNED_COUNT cells).
    Parallel axes within a group vary in lockstep; the two groups form a
    Cartesian product of EARNED_COUNT x UNEARNED_COUNT cells.
    """
    months = [f"{year}-{m:02d}" for m in range(1, 13)]

    def month_axes(var, max_monthly, count):
        return [
            {"name": var, "period": mp, "index": 0,
             "count": count, "min": 0, "max": max_monthly}
            for mp in months
        ]

    # ---- Earned dimension (group 0), PERSON entity only ----
    earned_group = []
    # employment_income is annual = monthly * 12 (person-level)
    earned_group.append({
        "name": "employment_income", "period": str(year), "index": 0,
        "count": EARNED_COUNT, "min": 0, "max": EARNED_MAX_MONTHLY * 12,
    })
    # generic monthly tanf gross earned, all 12 months
    earned_group += month_axes("tanf_gross_earned_income",
                               EARNED_MAX_MONTHLY, EARNED_COUNT)
    # state-specific person-level earned
    if state in STATE_EARNED_PERSON_VARS:
        earned_group += month_axes(STATE_EARNED_PERSON_VARS[state],
                                   EARNED_MAX_MONTHLY, EARNED_COUNT)

    # ---- Unearned dimension (group 1), PERSON entity only ----
    unearned_group = []
    unearned_group += month_axes("tanf_gross_unearned_income",
                                 UNEARNED_MAX_MONTHLY, UNEARNED_COUNT)
    if state in STATE_UNEARNED_PERSON_VARS:
        unearned_group += month_axes(STATE_UNEARNED_PERSON_VARS[state],
                                     UNEARNED_MAX_MONTHLY, UNEARNED_COUNT)

    return [earned_group, unearned_group]


# Flat-cell index layout (from PolicyEngine's meshgrid 'xy' expansion +
# the .T applied below): for flat index k, earned_idx = k % EARNED_COUNT
# (inner/fast), unearned_idx = k // EARNED_COUNT (outer/slow).
_IDX = np.arange(EARNED_COUNT * UNEARNED_COUNT)
EARNED_MONTHLY_BY_CELL = (_IDX % EARNED_COUNT) * EARNED_STEP
UNEARNED_MONTHLY_BY_CELL = (_IDX // EARNED_COUNT) * UNEARNED_STEP


def set_spm_year_inputs(sim, state, year):
    """Set SPM-unit-level annual income vars across all expanded cells,
    matching exactly what create_situation sets per cell (annual = monthly*12).
    """
    if state in STATE_EARNED_SPM_VARS:
        sim.set_input(STATE_EARNED_SPM_VARS[state], str(year),
                      EARNED_MONTHLY_BY_CELL * 12)
    if state in STATE_UNEARNED_SPM_VARS:
        sim.set_input(STATE_UNEARNED_SPM_VARS[state], str(year),
                      UNEARNED_MONTHLY_BY_CELL * 12)


EARNED_STEPS = list(range(0, EARNED_MAX_MONTHLY + 1, EARNED_STEP))
UNEARNED_STEPS = list(range(0, UNEARNED_MAX_MONTHLY + 1, UNEARNED_STEP))


def _structure_per_cell(state_code, county, num_adults, num_children,
                        monthly_rent):
    """Fallback: compute one structure cell-by-cell (the trusted path)."""
    benefits = []
    for earned_m in EARNED_STEPS:
        row = []
        for unearned_m in UNEARNED_STEPS:
            try:
                amount, _ = _calculate_tanf_amount(
                    state=state_code, year=YEAR,
                    num_adults=num_adults, num_children=num_children,
                    earned_income=earned_m * 12, unearned_income=unearned_m * 12,
                    county=county, is_tanf_enrolled=False,
                    monthly_rent=monthly_rent,
                )
                row.append(round(amount / 12))
            except Exception:
                row.append(0)
        benefits.append(row)
    return benefits


def compute_state(state_code, county, output_name, out_dir,
                  assumed_monthly_rent=ASSUMED_MONTHLY_RENT):
    """Compute all 16 structures for one effective state, vectorized.

    Falls back to the trusted per-cell path for any single structure whose
    vectorized computation raises, so the run can never emit wrong/missing data.
    Returns (output_name, n_fallback_structures).
    """
    tanf_var = STATE_TANF_VARIABLES.get(state_code, "tanf")
    axes = build_axes(state_code, YEAR)
    data = {}
    fallbacks = 0

    for num_adults in ADULTS_RANGE:
        for num_children in CHILDREN_RANGE:
            key = f"{num_adults}_{num_children}_false"
            try:
                # Base structure WITHOUT income (earned=unearned=0) — reuses the
                # exact create_situation logic, then we bolt on the income axes.
                # monthly_rent drives the shelter allowance (AZ/NY/VT/FL); it is
                # a fixed input replicated across all axis-expanded cells.
                base = create_situation(
                    state=state_code, year=YEAR,
                    num_adults=num_adults, num_children=num_children,
                    earned_income=0, unearned_income=0,
                    child_ages=None, county=county,
                    is_tanf_enrolled=False, resources=0,
                    monthly_rent=assumed_monthly_rent,
                )
                base["axes"] = axes

                sim = Simulation(situation=base)
                set_spm_year_inputs(sim, state_code, YEAR)
                annual = np.asarray(sim.calculate(tanf_var, YEAR), dtype=float)
                # PolicyEngine expands axis group 0 (earned) as the INNER/fast
                # index and group 1 (unearned) as the OUTER/slow index, so the
                # flat array is laid out as [unearned][earned]. Reshape to that
                # then transpose to get the [earned][unearned] layout the
                # frontend (and precompute.py) expect.
                monthly = (
                    np.round(annual / 12)
                    .astype(int)
                    .reshape(UNEARNED_COUNT, EARNED_COUNT)
                    .T
                )
                data[key] = monthly.tolist()
            except Exception as e:
                print(f"    ! {output_name} {key}: vectorized failed "
                      f"({type(e).__name__}: {e}); falling back to per-cell")
                data[key] = _structure_per_cell(
                    state_code, county, num_adults, num_children,
                    assumed_monthly_rent,
                )
                fallbacks += 1

    output_path = os.path.join(out_dir, f"{output_name}.json")
    with open(output_path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    return output_name, fallbacks


def tasks_for_states(state_filter):
    tasks = []
    for state_code in sorted(PILOT_STATES.keys()):
        if state_filter and state_code not in state_filter:
            continue
        if state_code == "CA":
            for region, county in CA_REGION_COUNTIES.items():
                tasks.append((state_code, county, f"CA_{region}"))
        elif state_code == "PA":
            for group, county in PA_GROUP_COUNTIES.items():
                tasks.append((state_code, county, f"PA_{group}"))
        elif state_code == "VA":
            for group, county in VA_GROUP_COUNTIES.items():
                tasks.append((state_code, county, f"VA_{group}"))
        elif state_code == "VT":
            for group, county in VT_GROUP_COUNTIES.items():
                tasks.append((state_code, county, f"VT_{group}"))
        else:
            tasks.append((state_code, None, state_code))
    return tasks


def main():
    sys.stdout.reconfigure(line_buffering=True)
    parser = argparse.ArgumentParser()
    parser.add_argument("--states", help="Comma-separated state codes")
    parser.add_argument("--output-dir", default=OUTPUT_DIR,
                        help="Where to write JSON (default: public/data)")
    parser.add_argument("--no-shelter", action="store_true",
                        help="Assume $0 rent (no shelter allowance) — reproduces "
                             "the old no-shelter data.")
    args = parser.parse_args()

    state_filter = set(args.states.upper().split(",")) if args.states else None
    out_dir = args.output_dir
    shelter_rent = 0 if args.no_shelter else ASSUMED_MONTHLY_RENT
    os.makedirs(out_dir, exist_ok=True)

    tasks = tasks_for_states(state_filter)
    from importlib.metadata import version as pkg_version
    print(f"policyengine-us version: {pkg_version('policyengine-us')}")
    print(f"Vectorized precompute: {len(tasks)} file(s) -> {out_dir}")
    print(f"Shelter allowance: assumed rent ${shelter_rent}/mo"
          + (" (DISABLED)" if shelter_rent == 0 else ""))

    start = time.time()
    total_fallbacks = 0
    for i, (state_code, county, output_name) in enumerate(tasks, 1):
        t0 = time.time()
        _, fallbacks = compute_state(state_code, county, output_name, out_dir,
                                     assumed_monthly_rent=shelter_rent)
        total_fallbacks += fallbacks
        dt = time.time() - t0
        fb = f"  [{fallbacks} per-cell fallback structure(s)]" if fallbacks else ""
        print(f"  [{i}/{len(tasks)}] {output_name}: {dt:.1f}s{fb}")

    elapsed = time.time() - start
    print(f"\nDone {len(tasks)} file(s) in {elapsed:.1f}s "
          f"({elapsed / 60:.2f}m), avg {elapsed / max(len(tasks),1):.1f}s/file")
    if total_fallbacks:
        print(f"NOTE: {total_fallbacks} structure(s) used the per-cell fallback.")


if __name__ == "__main__":
    main()
