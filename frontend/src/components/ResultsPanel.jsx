import BenefitChart from './BenefitChart'
import HouseholdSizeChart from './HouseholdSizeChart'

function ResultsPanel({ result, chartData, householdSizeData, comparisonData, loading, error, onRetry }) {
  if (error) {
    return (
      <section className="results-panel">
        <div className="error">
          {error}
          {onRetry && (
            <button className="retry-btn" onClick={onRetry}>Try Again</button>
          )}
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="results-panel">
        <div className="loading">Calculating benefits...</div>
      </section>
    )
  }

  if (!result) {
    return (
      <section className="results-panel">
        <div className="placeholder">
          Enter your household information and click Calculate to see your estimated TANF benefit.
        </div>
      </section>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const fpgMonthly = result.poverty_context?.fpg_monthly
  const currentIncome = (result.household.earned_income + result.household.unearned_income) / 12

  // Find the income where benefit drops to $0
  const cutoffIncome = chartData?.data
    ? (() => {
        const d = chartData.data
        for (let i = 0; i < d.length; i++) {
          if (d[i].tanf_monthly === 0 && i > 0 && d[i - 1].tanf_monthly > 0) {
            return d[i].total_income_monthly
          }
        }
        return null
      })()
    : null

  // Max benefit (at $0 income)
  const maxBenefit = result.breakdown?.max_benefit_monthly ?? result.tanf_monthly

  // State rank
  const stateRank = comparisonData
    ? (() => {
        const eligible = comparisonData.filter(d => !d.error && d.tanf_monthly > 0)
        const idx = eligible.findIndex(d => d.state === result.state)
        return idx >= 0 ? { rank: idx + 1, total: eligible.length } : null
      })()
    : null

  return (
    <section className="results-panel">
      <div className={`result-banner ${!result.eligible ? 'not-eligible' : ''}`}>
        <div className="result-banner-main">
          <h3>Estimated Monthly TANF Benefit</h3>
          <div className="amount">{formatCurrency(result.tanf_monthly)}</div>
          <div className="amount-annual">{formatCurrency(result.tanf_annual)}/yr</div>
        </div>
        <div className="result-banner-details">
          <span className={`eligibility-status ${result.eligible ? 'eligible' : 'not-eligible'}`}>
            {result.eligible ? 'Eligible' : 'Not Eligible'}
          </span>
          <div className="result-meta">
            <span>{result.state_name} ({result.state})</span>
            <span>{result.household.num_adults} adult(s), {result.household.num_children} child(ren)</span>
            {result.eligible && fpgMonthly && (
              <span>{Math.round(result.tanf_monthly / fpgMonthly * 100)}% of FPL</span>
            )}
          </div>
        </div>
        <div className="result-banner-stats">
          <div className="stat-item">
            <span className="stat-label">Max benefit</span>
            <span className="stat-value">{formatCurrency(maxBenefit)}/mo</span>
          </div>
          {cutoffIncome && (
            <div className="stat-item">
              <span className="stat-label">Benefit ends at</span>
              <span className="stat-value">{formatCurrency(cutoffIncome)}/mo income</span>
            </div>
          )}
          {stateRank && (
            <div className="stat-item">
              <span className="stat-label">State rank</span>
              <span className="stat-value">#{stateRank.rank} of {stateRank.total}</span>
            </div>
          )}
        </div>
        {!result.eligible && (
          <div className="result-banner-ineligible">
            This household does not qualify for TANF in {result.state_name}. Contact your local TANF office for details.
          </div>
        )}
      </div>

      {chartData && householdSizeData && (
        <div className="charts-grid">
          <div className="chart-container">
            <h3>Benefit by Income</h3>
            <BenefitChart data={chartData.data} />
          </div>
          <div className="chart-container">
            <h3>Benefit by Household Size</h3>
            <HouseholdSizeChart
              data={householdSizeData}
              currentChildren={result.household.num_children}
            />
          </div>
        </div>
      )}

    </section>
  )
}

export default ResultsPanel
