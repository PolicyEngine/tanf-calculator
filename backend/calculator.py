"""
TANF Calculator using PolicyEngine-US
"""
from policyengine_us import Simulation
from config import PILOT_STATES, DEFAULT_YEAR


def _to_float(value):
    """Convert a NumPy array or scalar from PolicyEngine to a Python float."""
    import numpy as np
    if isinstance(value, np.ndarray):
        return float(value.flat[0])
    return float(value)


def _safe_calculate(simulation, variable, year):
    """Safely calculate a PolicyEngine variable, returning None on failure."""
    try:
        value = _to_float(simulation.calculate(variable, year))
        return value
    except Exception:
        return None

# State-specific TANF variable names
# All states with TANF implementations in PolicyEngine-US
# States use different program names - mapped to their PolicyEngine variable
STATE_TANF_VARIABLES = {
    "AK": "ak_atap",    # ATAP = Alaska Temporary Assistance Program
    "AL": "al_tanf",
    "AR": "ar_tea",     # TEA = Transitional Employment Assistance
    "AZ": "az_tanf",
    "CA": "ca_tanf",
    "CO": "co_tanf",
    "CT": "ct_tfa",     # TFA = Temporary Family Assistance
    "DC": "dc_tanf",
    "DE": "de_tanf",    # Note: Only works for 2025+ (parameter issue)
    "FL": "fl_tca",     # TCA = Temporary Cash Assistance
    "GA": "ga_tanf",
    "HI": "hi_tanf",
    "IA": "ia_fip",     # FIP = Family Investment Program
    "ID": "id_tafi",    # TAFI = Temporary Assistance for Families in Idaho
    "IL": "il_tanf",
    "IN": "in_tanf",
    "KS": "ks_tanf",
    "KY": "ky_ktap",    # KTAP = Kentucky Transitional Assistance Program
    "LA": "la_fitap",   # FITAP = Family Independence Temporary Assistance Program
    "MA": "ma_tafdc",   # TAFDC = Transitional Aid to Families with Dependent Children
    "MD": "md_tca",     # TCA = Temporary Cash Assistance
    "ME": "me_tanf",
    "MI": "mi_fip",     # FIP = Family Independence Program
    "MN": "mn_mfip",    # MFIP = Minnesota Family Investment Program (2025+ only)
    "MO": "mo_tanf",
    "MS": "ms_tanf",
    "MT": "mt_tanf",
    "NC": "nc_tanf",
    "ND": "nd_tanf",
    "NE": "ne_adc",     # ADC = Aid to Dependent Children
    "NH": "nh_fanf",    # FANF = Family Assistance Needy Families
    "NJ": "nj_wfnj",   # WFNJ = WorkFirst New Jersey
    "NM": "nm_works",   # New Mexico Works
    "NV": "nv_tanf",
    "NY": "ny_tanf",
    "OH": "oh_owf",     # OWF = Ohio Works First (2025+ only)
    "OK": "ok_tanf",
    "OR": "or_tanf",
    "PA": "pa_tanf",
    "RI": "ri_works",   # RI Works
    "SC": "sc_tanf",
    "SD": "sd_tanf",
    "TN": "tn_ff",      # FF = Families First
    "TX": "tx_tanf",
    "UT": "ut_fep",     # FEP = Family Employment Program
    "VA": "va_tanf",
    "VT": "vt_reach_up", # Reach Up (Vermont's TANF)
    "WA": "wa_tanf",
    "WI": "wi_works",   # Wisconsin Works / W-2 (2025+ only)
    "WV": "wv_works",   # WV Works
    "WY": "wy_power",   # POWER = Personal Opportunities With Employment Responsibilities
}


def create_situation(
    state: str,
    year: int,
    num_adults: int,
    num_children: int,
    earned_income: float,
    unearned_income: float = 0,
    child_ages: list[int] | None = None,
    county: str | None = None,
    is_tanf_enrolled: bool = False,
    resources: float = 0,
) -> dict:
    """
    Create a PolicyEngine situation dictionary for TANF calculation.

    Args:
        state: Two-letter state code (e.g., "CA")
        year: Tax year
        num_adults: Number of adults in household (1 or 2)
        num_children: Number of children
        earned_income: Annual earned income
        unearned_income: Annual unearned income
        child_ages: List of child ages (defaults to age 5 for each)
        county: County enum name (e.g., "LOS_ANGELES_COUNTY_CA") - optional
        is_tanf_enrolled: Whether currently receiving TANF (affects income tests)
        resources: Total household resources/assets

    Returns:
        PolicyEngine situation dictionary
    """
    if child_ages is None:
        child_ages = [5] * num_children

    # Build people dictionary
    people = {}
    members = []

    # Add adults
    for i in range(num_adults):
        adult_id = f"adult_{i+1}"
        people[adult_id] = {
            "age": {year: 35},
        }
        members.append(adult_id)

        # Assign earned income to first adult
        if i == 0 and earned_income > 0:
            people[adult_id]["employment_income"] = {year: earned_income}

    # Add children
    for i, age in enumerate(child_ages):
        child_id = f"child_{i+1}"
        people[child_id] = {
            "age": {year: age},
        }
        members.append(child_id)

    # Build household with state and optional county
    household_data = {
        "members": members,
        "state_name": {year: state},
    }

    # Add county if provided (important for states like CA with regional rates)
    if county:
        household_data["county"] = {year: county}

    # Build situation
    situation = {
        "people": people,
        "tax_units": {
            "tax_unit": {
                "members": members,
            }
        },
        "spm_units": {
            "spm_unit": {
                "members": members,
            }
        },
        "households": {
            "household": household_data
        },
        "families": {
            "family": {
                "members": members,
            }
        },
        "marital_units": {},
    }

    # Create marital units
    if num_adults == 2:
        situation["marital_units"]["marital_unit"] = {
            "members": ["adult_1", "adult_2"],
        }
    else:
        situation["marital_units"]["marital_unit"] = {
            "members": ["adult_1"],
        }

    # Add unearned income if specified
    if unearned_income > 0:
        situation["spm_units"]["spm_unit"]["spm_unit_unearned_income"] = {
            year: unearned_income
        }

    # Add resources if specified (for resource eligibility tests)
    if resources > 0:
        # Add resources at the SPM unit level
        situation["spm_units"]["spm_unit"]["spm_unit_assets"] = {year: resources}

    # Set TANF enrollment status at SPM unit level
    if is_tanf_enrolled:
        situation["spm_units"]["spm_unit"]["is_tanf_enrolled"] = {year: True}

    return situation


def calculate_tanf(
    state: str,
    year: int,
    num_adults: int,
    num_children: int,
    earned_income: float,
    unearned_income: float = 0,
    child_ages: list[int] | None = None,
    county: str | None = None,
    is_tanf_enrolled: bool = False,
    resources: float = 0,
) -> dict:
    """
    Calculate TANF benefit for a household.

    Returns:
        Dictionary with TANF benefit amount and eligibility details
    """
    situation = create_situation(
        state=state,
        year=year,
        num_adults=num_adults,
        num_children=num_children,
        earned_income=earned_income,
        unearned_income=unearned_income,
        child_ages=child_ages,
        county=county,
        is_tanf_enrolled=is_tanf_enrolled,
        resources=resources,
    )

    simulation = Simulation(situation=situation)

    # Get the appropriate TANF variable for this state
    tanf_variable = STATE_TANF_VARIABLES.get(state, "tanf")

    # Calculate TANF benefit
    try:
        tanf_amount = _to_float(simulation.calculate(tanf_variable, year))
    except Exception:
        # Fall back to generic tanf if state-specific fails
        tanf_amount = _to_float(simulation.calculate("tanf", year))

    # Eligibility is determined by whether benefit is > 0
    tanf_eligible = tanf_amount > 0

    # --- Feature 2: Benefit Breakdown ---
    breakdown = {}
    max_amount = _safe_calculate(simulation, "tanf_max_amount", year)
    if max_amount is not None:
        breakdown["max_benefit_annual"] = max_amount
        breakdown["max_benefit_monthly"] = max_amount / 12
    countable_income = _safe_calculate(simulation, "tanf_countable_income", year)
    if countable_income is not None:
        breakdown["countable_income_annual"] = countable_income
        breakdown["countable_income_monthly"] = countable_income / 12
    gross_earned = _safe_calculate(simulation, "tanf_gross_earned_income", year)
    if gross_earned is not None:
        breakdown["gross_earned_income_annual"] = gross_earned
        breakdown["gross_earned_income_monthly"] = gross_earned / 12
    gross_unearned = _safe_calculate(simulation, "tanf_gross_unearned_income", year)
    if gross_unearned is not None:
        breakdown["gross_unearned_income_annual"] = gross_unearned
        breakdown["gross_unearned_income_monthly"] = gross_unearned / 12

    # --- Feature 1: Eligibility Explanation ---
    eligibility_checks = {}
    is_eligible = _safe_calculate(simulation, "is_tanf_eligible", year)
    if is_eligible is not None:
        eligibility_checks["overall"] = bool(is_eligible)
    is_demo_eligible = _safe_calculate(simulation, "is_tanf_demographically_eligible", year)
    if is_demo_eligible is not None:
        eligibility_checks["demographic"] = bool(is_demo_eligible)
    is_econ_eligible = _safe_calculate(simulation, "is_tanf_economically_eligible", year)
    if is_econ_eligible is not None:
        eligibility_checks["economic"] = bool(is_econ_eligible)

    # Diagnostic simulations: only when NOT eligible
    if not tanf_eligible and eligibility_checks:
        # Test with zero income to isolate income barrier
        try:
            zero_income_situation = create_situation(
                state=state, year=year,
                num_adults=num_adults, num_children=num_children,
                earned_income=0, unearned_income=0,
                child_ages=child_ages, county=county,
                is_tanf_enrolled=is_tanf_enrolled, resources=resources,
            )
            zero_income_sim = Simulation(situation=zero_income_situation)
            zero_income_tanf = _to_float(zero_income_sim.calculate(tanf_variable, year))
            eligibility_checks["eligible_with_zero_income"] = zero_income_tanf > 0
        except Exception:
            pass

        # Test with zero resources to isolate resource barrier
        try:
            zero_resources_situation = create_situation(
                state=state, year=year,
                num_adults=num_adults, num_children=num_children,
                earned_income=earned_income, unearned_income=unearned_income,
                child_ages=child_ages, county=county,
                is_tanf_enrolled=is_tanf_enrolled, resources=0,
            )
            zero_resources_sim = Simulation(situation=zero_resources_situation)
            zero_resources_tanf = _to_float(zero_resources_sim.calculate(tanf_variable, year))
            eligibility_checks["eligible_with_zero_resources"] = zero_resources_tanf > 0
        except Exception:
            pass

    # --- Feature 5: Poverty Context ---
    poverty_context = {}
    fpg = _safe_calculate(simulation, "tax_unit_fpg", year)
    if fpg is not None and fpg > 0:
        fpg_monthly = fpg / 12
        income_monthly = (earned_income + unearned_income) / 12
        tanf_monthly_val = tanf_amount / 12
        poverty_context["fpg_annual"] = fpg
        poverty_context["fpg_monthly"] = fpg_monthly
        poverty_context["income_pct_fpg"] = round(income_monthly / fpg_monthly * 100, 1)
        poverty_context["income_plus_tanf_pct_fpg"] = round(
            (income_monthly + tanf_monthly_val) / fpg_monthly * 100, 1
        )
        poverty_context["tanf_pct_fpg"] = round(tanf_monthly_val / fpg_monthly * 100, 1)

    # Get additional context if available
    result = {
        "tanf_monthly": tanf_amount / 12,
        "tanf_annual": tanf_amount,
        "eligible": tanf_eligible,
        "state": state,
        "state_name": PILOT_STATES.get(state, state),
        "year": year,
        "household": {
            "num_adults": num_adults,
            "num_children": num_children,
            "earned_income": earned_income,
            "unearned_income": unearned_income,
            "is_tanf_enrolled": is_tanf_enrolled,
            "resources": resources,
        }
    }

    if breakdown:
        result["breakdown"] = breakdown
    if eligibility_checks:
        result["eligibility_checks"] = eligibility_checks
    if poverty_context:
        result["poverty_context"] = poverty_context

    # Add county info if provided
    if county:
        result["county"] = county

    return result


def calculate_tanf_over_income_range(
    state: str,
    year: int,
    num_adults: int,
    num_children: int,
    earned_income: float = 0,
    unearned_income: float = 0,
    income_min: float = 0,
    income_max: float = 50000,
    income_step: float = 1000,
    child_ages: list[int] | None = None,
    county: str | None = None,
    is_tanf_enrolled: bool = False,
    resources: float = 0,
) -> list[dict]:
    """
    Calculate TANF benefits over a range of total household income values.
    Splits each total income point into earned/unearned using the ratio
    from the user's actual input. Used for generating charts.

    Returns:
        List of dictionaries with income and corresponding TANF benefit
    """
    total_user_income = earned_income + unearned_income
    if total_user_income > 0:
        earned_ratio = earned_income / total_user_income
    else:
        earned_ratio = 1.0

    results = []
    total_income = income_min

    while total_income <= income_max:
        sweep_earned = total_income * earned_ratio
        sweep_unearned = total_income * (1 - earned_ratio)

        calc = calculate_tanf(
            state=state,
            year=year,
            num_adults=num_adults,
            num_children=num_children,
            earned_income=sweep_earned,
            unearned_income=sweep_unearned,
            child_ages=child_ages,
            county=county,
            is_tanf_enrolled=is_tanf_enrolled,
            resources=resources,
        )
        results.append({
            "total_income_monthly": round(total_income / 12),
            "tanf_monthly": calc["tanf_monthly"],
            "eligible": calc["eligible"],
        })
        total_income += income_step

    return results


def calculate_combined_benefits_over_income_range(
    state: str,
    year: int,
    num_adults: int,
    num_children: int,
    earned_income: float = 0,
    unearned_income: float = 0,
    income_min: float = 0,
    income_max: float = 50000,
    income_step: float = 2000,
    child_ages: list[int] | None = None,
    county: str | None = None,
    is_tanf_enrolled: bool = False,
    resources: float = 0,
    include_programs: list[str] | None = None,
) -> list[dict]:
    """
    Calculate TANF + SNAP + EITC + CTC over an income range.
    Returns per data point the monthly benefit for each program.
    """
    if include_programs is None:
        include_programs = ["tanf", "snap", "eitc", "ctc"]

    total_user_income = earned_income + unearned_income
    if total_user_income > 0:
        earned_ratio = earned_income / total_user_income
    else:
        earned_ratio = 1.0

    tanf_variable = STATE_TANF_VARIABLES.get(state, "tanf")
    results = []
    total_income = income_min

    while total_income <= income_max:
        sweep_earned = total_income * earned_ratio
        sweep_unearned = total_income * (1 - earned_ratio)

        situation = create_situation(
            state=state, year=year,
            num_adults=num_adults, num_children=num_children,
            earned_income=sweep_earned, unearned_income=sweep_unearned,
            child_ages=child_ages, county=county,
            is_tanf_enrolled=is_tanf_enrolled, resources=resources,
        )
        simulation = Simulation(situation=situation)

        point = {"total_income_monthly": round(total_income / 12)}

        # TANF
        if "tanf" in include_programs:
            tanf_val = _safe_calculate(simulation, tanf_variable, year)
            if tanf_val is None:
                tanf_val = _safe_calculate(simulation, "tanf", year) or 0
            point["tanf_monthly"] = round(tanf_val / 12, 2)

        # SNAP
        if "snap" in include_programs:
            snap_val = _safe_calculate(simulation, "snap", year) or 0
            point["snap_monthly"] = round(snap_val / 12, 2)

        # EITC
        if "eitc" in include_programs:
            eitc_val = _safe_calculate(simulation, "eitc", year) or 0
            point["eitc_monthly"] = round(eitc_val / 12, 2)

        # CTC
        if "ctc" in include_programs:
            ctc_val = _safe_calculate(simulation, "ctc_value", year)
            if ctc_val is None:
                ctc_val = _safe_calculate(simulation, "ctc", year) or 0
            point["ctc_monthly"] = round(ctc_val / 12, 2)

        # Total
        point["total_benefits_monthly"] = round(
            point.get("tanf_monthly", 0)
            + point.get("snap_monthly", 0)
            + point.get("eitc_monthly", 0)
            + point.get("ctc_monthly", 0),
            2,
        )

        results.append(point)
        total_income += income_step

    return results


if __name__ == "__main__":
    # Quick test - LA County (Region 1) vs Sacramento (Region 2)
    print("=== CA Region Comparison ===")

    result_la = calculate_tanf(
        state="CA",
        year=2024,
        num_adults=1,
        num_children=2,
        earned_income=0,
        county="LOS_ANGELES_COUNTY_CA",
    )
    print(f"LA County (Region 1): ${result_la['tanf_monthly']:.2f}/month")

    result_sac = calculate_tanf(
        state="CA",
        year=2024,
        num_adults=1,
        num_children=2,
        earned_income=0,
        county="SACRAMENTO_COUNTY_CA",
    )
    print(f"Sacramento (Region 2): ${result_sac['tanf_monthly']:.2f}/month")

    # Test enrolled vs not enrolled
    print("\n=== Enrollment Status Comparison ===")
    result_new = calculate_tanf(
        state="CA",
        year=2024,
        num_adults=1,
        num_children=2,
        earned_income=10000,
        is_tanf_enrolled=False,
    )
    print(f"New applicant ($10k income): ${result_new['tanf_monthly']:.2f}/month")

    result_enrolled = calculate_tanf(
        state="CA",
        year=2024,
        num_adults=1,
        num_children=2,
        earned_income=10000,
        is_tanf_enrolled=True,
    )
    print(f"Current recipient ($10k income): ${result_enrolled['tanf_monthly']:.2f}/month")
