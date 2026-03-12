/**
 * Client-side data layer for precomputed TANF benefits.
 * Replaces all backend API calls with local JSON file lookups.
 */

const DATA_BASE = `${import.meta.env.BASE_URL}data`

// Cache for loaded state data files
const stateDataCache = {}

let metadata = null

/**
 * Load metadata.json (states list, counties, FPG, grid config).
 * Cached after first load.
 */
export async function loadMetadata() {
  if (metadata) return metadata
  const res = await fetch(`${DATA_BASE}/metadata.json`)
  metadata = await res.json()
  return metadata
}

/**
 * Load a state's precomputed benefit data.
 * For states with county groups (CA, PA, VA), pass the group number.
 */
export async function loadStateData(stateCode, group = null) {
  const filename = group ? `${stateCode}_${group}` : stateCode
  if (stateDataCache[filename]) return stateDataCache[filename]
  const res = await fetch(`${DATA_BASE}/${filename}.json`)
  const data = await res.json()
  stateDataCache[filename] = data
  return data
}

/**
 * Get the county group number for a given state and county code.
 * Works for CA (regions 1-2), PA (groups 1-4), and VA (groups 2-3).
 */
export function getCountyGroup(stateCode, countyCode) {
  if (!metadata?.county_data?.[stateCode]) return null
  return metadata.county_data[stateCode].county_groups[countyCode] || null
}

/**
 * Bilinear interpolation on the 2D benefit grid.
 */
function interpolate2D(grid, earnedMonthly, unearnedMonthly) {
  const eSteps = metadata.earned_steps
  const uSteps = metadata.unearned_steps
  const eStep = eSteps[1] - eSteps[0]
  const uStep = uSteps[1] - uSteps[0]

  // Clamp to grid bounds
  const eVal = Math.max(0, Math.min(earnedMonthly, eSteps[eSteps.length - 1]))
  const uVal = Math.max(0, Math.min(unearnedMonthly, uSteps[uSteps.length - 1]))

  // Find surrounding grid indices
  const eIdx = eVal / eStep
  const eIdx0 = Math.min(Math.floor(eIdx), eSteps.length - 2)
  const eIdx1 = eIdx0 + 1
  const eFrac = Math.max(0, Math.min(1, (eVal - eSteps[eIdx0]) / eStep))

  const uIdx = uVal / uStep
  const uIdx0 = Math.min(Math.floor(uIdx), uSteps.length - 2)
  const uIdx1 = uIdx0 + 1
  const uFrac = Math.max(0, Math.min(1, (uVal - uSteps[uIdx0]) / uStep))

  // Bilinear interpolation
  const v00 = grid[eIdx0][uIdx0]
  const v01 = grid[eIdx0][uIdx1]
  const v10 = grid[eIdx1][uIdx0]
  const v11 = grid[eIdx1][uIdx1]

  const v0 = v00 + (v01 - v00) * uFrac
  const v1 = v10 + (v11 - v10) * uFrac
  const result = v0 + (v1 - v0) * eFrac

  return Math.round(Math.max(0, result))
}

/**
 * Look up the TANF monthly benefit for a specific household.
 * Returns { tanf_monthly, eligible }
 */
export function lookupBenefit(stateData, numAdults, numChildren, enrolled, earnedMonthly, unearnedMonthly) {
  const key = `${numAdults}_${numChildren}_${String(enrolled).toLowerCase()}`
  const grid = stateData[key]
  if (!grid) return { tanf_monthly: 0, eligible: false }

  const tanf_monthly = interpolate2D(grid, earnedMonthly, unearnedMonthly)
  return { tanf_monthly, eligible: tanf_monthly > 0 }
}

/**
 * Get the max benefit (benefit at $0 income) for a household config.
 */
export function getMaxBenefit(stateData, numAdults, numChildren, enrolled) {
  const key = `${numAdults}_${numChildren}_${String(enrolled).toLowerCase()}`
  const grid = stateData[key]
  if (!grid) return 0
  return grid[0][0] // earned=0, unearned=0
}

/**
 * Generate chart data: TANF benefit over an income range.
 * Sweeps total income from $0 to $maxIncome, maintaining the earned/unearned ratio.
 */
export function generateChartData(stateData, numAdults, numChildren, enrolled, earnedMonthly, unearnedMonthly, maxIncome = 5000, step = 50) {
  const totalIncome = earnedMonthly + unearnedMonthly
  const earnedRatio = totalIncome > 0 ? earnedMonthly / totalIncome : 1.0

  const data = []
  let lastNonZeroIdx = 0
  for (let income = 0; income <= maxIncome; income += step) {
    const earned = income * earnedRatio
    const unearned = income * (1 - earnedRatio)
    const { tanf_monthly, eligible } = lookupBenefit(stateData, numAdults, numChildren, enrolled, earned, unearned)
    data.push({
      total_income_monthly: income,
      tanf_monthly,
      eligible,
    })
    if (tanf_monthly > 0) lastNonZeroIdx = data.length - 1
  }

  // Trim: keep a few points past the last non-zero benefit for context
  const trimIdx = Math.min(lastNonZeroIdx + 4, data.length - 1)
  return data.slice(0, trimIdx + 1)
}

/**
 * Calculate all-states comparison for a given household profile.
 * Loads all state data files and looks up benefit for each.
 * Returns sorted array (highest benefit first) + maxBenefit.
 */
export async function calculateAllStates(numAdults, numChildren, enrolled, earnedMonthly, unearnedMonthly) {
  const meta = await loadMetadata()
  const results = []

  // Default groups for state comparison (use first/most common group)
  const defaultGroups = { CA: 1, PA: 2, VA: 2 }

  // Load all state data in parallel
  const loadPromises = meta.states.map(async (s) => {
    try {
      const group = defaultGroups[s.code] || null
      const stateData = await loadStateData(s.code, group)
      const { tanf_monthly, eligible } = lookupBenefit(stateData, numAdults, numChildren, enrolled, earnedMonthly, unearnedMonthly)
      return {
        state: s.code,
        state_name: s.name,
        tanf_monthly,
        tanf_annual: tanf_monthly * 12,
        eligible,
      }
    } catch {
      return {
        state: s.code,
        state_name: s.name,
        tanf_monthly: 0,
        tanf_annual: 0,
        eligible: false,
        error: true,
      }
    }
  })

  const allResults = await Promise.all(loadPromises)

  // Sort by benefit (highest first)
  allResults.sort((a, b) => b.tanf_monthly - a.tanf_monthly)

  const maxBenefit = allResults.length > 0 ? allResults[0].tanf_monthly : 0

  return { states: allResults, max_benefit: maxBenefit }
}

/**
 * Calculate Federal Poverty Guidelines for a household.
 */
export function calculateFPG(numAdults, numChildren, stateCode) {
  if (!metadata) return null

  const familySize = numAdults + numChildren
  const fpgData = stateCode === 'AK' ? metadata.fpg.AK
    : stateCode === 'HI' ? metadata.fpg.HI
    : metadata.fpg.default

  const annual = fpgData.base + Math.max(0, familySize - 1) * fpgData.per_additional
  const monthly = annual / 12

  return { annual, monthly }
}

/**
 * Build a full result object similar to the old API /calculate response.
 * Used by the main calculation flow.
 */
export function buildResult(stateData, stateCode, stateName, numAdults, numChildren, enrolled, earnedMonthly, unearnedMonthly) {
  const { tanf_monthly, eligible } = lookupBenefit(stateData, numAdults, numChildren, enrolled, earnedMonthly, unearnedMonthly)
  const maxBenefit = getMaxBenefit(stateData, numAdults, numChildren, enrolled)

  const fpg = calculateFPG(numAdults, numChildren, stateCode)

  const result = {
    tanf_monthly,
    tanf_annual: tanf_monthly * 12,
    eligible,
    state: stateCode,
    state_name: stateName,
    year: metadata?.year || 2025,
    household: {
      num_adults: numAdults,
      num_children: numChildren,
      earned_income: earnedMonthly * 12,
      unearned_income: unearnedMonthly * 12,
      is_tanf_enrolled: enrolled,
    },
  }

  // Simplified breakdown (max benefit from precomputed data)
  if (maxBenefit > 0) {
    result.breakdown = {
      max_benefit_monthly: maxBenefit,
      max_benefit_annual: maxBenefit * 12,
    }
  }

  // Poverty context
  if (fpg) {
    const incomeMonthly = earnedMonthly + unearnedMonthly
    result.poverty_context = {
      fpg_annual: fpg.annual,
      fpg_monthly: fpg.monthly,
      income_pct_fpg: fpg.monthly > 0 ? Math.round(incomeMonthly / fpg.monthly * 1000) / 10 : 0,
      income_plus_tanf_pct_fpg: fpg.monthly > 0 ? Math.round((incomeMonthly + tanf_monthly) / fpg.monthly * 1000) / 10 : 0,
      tanf_pct_fpg: fpg.monthly > 0 ? Math.round(tanf_monthly / fpg.monthly * 1000) / 10 : 0,
    }
  }

  return result
}

/**
 * Generate household size comparison data.
 * For a given state/income/enrolled, shows benefit across 0-10 children.
 */
export function generateHouseholdSizeData(stateData, numAdults, enrolled, earnedMonthly, unearnedMonthly) {
  const data = []
  for (let children = 0; children <= 10; children++) {
    const { tanf_monthly } = lookupBenefit(stateData, numAdults, children, enrolled, earnedMonthly, unearnedMonthly)
    data.push({
      children,
      label: `${numAdults}A + ${children}C`,
      tanf_monthly,
    })
  }
  return data
}
