#!/usr/bin/env python3
"""
Precompute TANF benefits for all states and household configurations.
Outputs JSON files to frontend/public/data/ for fully static frontend.
"""

import json
import os
import sys
import time
from multiprocessing import Pool, cpu_count

# Add scripts dir to path (calculator.py and config.py live here)
sys.path.insert(0, os.path.dirname(__file__))

from calculator import _calculate_tanf_amount
from config import PILOT_STATES, CA_COUNTIES, PA_COUNTIES, VA_COUNTIES

# Grid configuration
YEAR = 2025
EARNED_STEPS = list(range(0, 5001, 200))  # $0-$5000/mo in $200 steps (26 values)
UNEARNED_STEPS = list(range(0, 2001, 200))  # $0-$2000/mo in $200 steps (11 values)
ADULTS_RANGE = [1, 2]
CHILDREN_RANGE = list(range(0, 11))  # 0-10
ENROLLED_VALUES = [False, True]

# Representative counties per region/group for precomputation
CA_REGION_COUNTIES = {
    1: "LOS_ANGELES_COUNTY_CA",
    2: "SACRAMENTO_COUNTY_CA",
}

PA_GROUP_COUNTIES = {
    1: "BUCKS_COUNTY_PA",
    2: "PHILADELPHIA_COUNTY_PA",
    3: "BEAVER_COUNTY_PA",
    4: "ARMSTRONG_COUNTY_PA",
}

VA_GROUP_COUNTIES = {
    2: "ACCOMACK_COUNTY_VA",
    3: "ARLINGTON_COUNTY_VA",
}

OUTPUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "public", "data"
)


def compute_state(args):
    """Compute all household configs for one effective state."""
    state_code, county, output_name = args
    data = {}
    count = 0
    errors = 0

    for num_adults in ADULTS_RANGE:
        for num_children in CHILDREN_RANGE:
            for enrolled in ENROLLED_VALUES:
                key = f"{num_adults}_{num_children}_{str(enrolled).lower()}"
                benefits = []

                for earned_monthly in EARNED_STEPS:
                    earned_annual = earned_monthly * 12
                    row = []

                    for unearned_monthly in UNEARNED_STEPS:
                        unearned_annual = unearned_monthly * 12
                        try:
                            amount, _ = _calculate_tanf_amount(
                                state=state_code,
                                year=YEAR,
                                num_adults=num_adults,
                                num_children=num_children,
                                earned_income=earned_annual,
                                unearned_income=unearned_annual,
                                county=county,
                                is_tanf_enrolled=enrolled,
                            )
                            row.append(round(amount / 12))
                        except Exception as e:
                            row.append(0)
                            errors += 1

                        count += 1

                    benefits.append(row)

                data[key] = benefits

    # Write output
    output_path = os.path.join(OUTPUT_DIR, f"{output_name}.json")
    with open(output_path, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    return output_name, count, errors


def build_metadata():
    """Build the metadata.json file with states, counties, FPG, and grid config."""
    # Build county lists with region/group mappings
    def build_county_list(counties):
        county_list = []
        county_groups = {}
        for enum_name, display_name, group in counties:
            county_list.append(
                {"code": enum_name, "name": display_name, "group": group}
            )
            county_groups[enum_name] = group
        return county_list, county_groups

    ca_counties, ca_county_groups = build_county_list(CA_COUNTIES)
    pa_counties, pa_county_groups = build_county_list(PA_COUNTIES)
    va_counties, va_county_groups = build_county_list(VA_COUNTIES)

    # Federal Poverty Guidelines 2025
    fpg = {
        "default": {"base": 15650, "per_additional": 5500},
        "AK": {"base": 19560, "per_additional": 6880},
        "HI": {"base": 18000, "per_additional": 6330},
    }

    metadata = {
        "year": YEAR,
        "earned_steps": EARNED_STEPS,
        "unearned_steps": UNEARNED_STEPS,
        "adults_range": ADULTS_RANGE,
        "children_range": list(CHILDREN_RANGE),
        "states": [
            {
                "code": code,
                "name": name,
                "requires_county": code in ("CA", "PA", "VA"),
            }
            for code, name in sorted(PILOT_STATES.items())
        ],
        "county_data": {
            "CA": {"counties": ca_counties, "county_groups": ca_county_groups},
            "PA": {"counties": pa_counties, "county_groups": pa_county_groups},
            "VA": {"counties": va_counties, "county_groups": va_county_groups},
        },
        "fpg": fpg,
    }

    output_path = os.path.join(OUTPUT_DIR, "metadata.json")
    with open(output_path, "w") as f:
        json.dump(metadata, f, separators=(",", ":"))

    return output_path


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--states",
        help="Comma-separated state codes to process (e.g., AK,AL,AR). Default: all states.",
    )
    parser.add_argument(
        "--metadata-only",
        action="store_true",
        help="Only generate metadata.json",
    )
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if args.metadata_only:
        meta_path = build_metadata()
        print(f"Metadata: {meta_path}")
        return

    # Determine which states to process
    if args.states:
        state_filter = set(args.states.upper().split(","))
    else:
        state_filter = None

    # Build task list
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
        else:
            tasks.append((state_code, None, state_code))

    sims_per_state = (
        len(EARNED_STEPS)
        * len(UNEARNED_STEPS)
        * len(ADULTS_RANGE)
        * len(CHILDREN_RANGE)
        * len(ENROLLED_VALUES)
    )
    total_sims = sims_per_state * len(tasks)

    print(f"Precomputing {len(tasks)} state files...")
    print(
        f"Grid: {len(EARNED_STEPS)} earned x {len(UNEARNED_STEPS)} unearned"
        f" x {len(ADULTS_RANGE)} adults x {len(CHILDREN_RANGE)} children"
        f" x {len(ENROLLED_VALUES)} enrolled"
    )
    print(f"Simulations per state: {sims_per_state:,}")
    print(f"Total simulations: {total_sims:,}")

    start = time.time()

    # Use multiprocessing
    num_workers = min(cpu_count(), len(tasks))
    print(f"Using {num_workers} workers...\n")

    completed = 0
    total_errors = 0

    with Pool(num_workers) as pool:
        for result in pool.imap_unordered(compute_state, tasks):
            name, count, errors = result
            completed += 1
            total_errors += errors
            elapsed = time.time() - start
            rate = count / max(elapsed, 0.001)
            print(
                f"  [{completed}/{len(tasks)}] {name}: "
                f"{count:,} sims, {errors} errors "
                f"({elapsed:.0f}s elapsed, ~{rate:.0f} sims/s)"
            )

    elapsed = time.time() - start
    print(f"\nTotal errors: {total_errors}")
    print(f"Done in {elapsed:.0f}s ({elapsed / 60:.1f}m)")

    # Report file sizes
    total_size = 0
    for f in os.listdir(OUTPUT_DIR):
        fpath = os.path.join(OUTPUT_DIR, f)
        if os.path.isfile(fpath):
            total_size += os.path.getsize(fpath)
    print(f"Total data size: {total_size / 1024:.0f} KB ({total_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
