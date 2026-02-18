import BenefitChart from './BenefitChart'
import EligibilityExplanation from './EligibilityExplanation'
import BenefitBreakdown from './BenefitBreakdown'
import PovertyContext from './PovertyContext'
import CombinedBenefitChart from './CombinedBenefitChart'

function ResultsPanel({ result, chartData, combinedChartData, loading, error, onRetry }) {
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

  return (
    <section className="results-panel">
      <div className={`result-card ${!result.eligible ? 'not-eligible' : ''}`}>
        <h3>Estimated Monthly TANF Benefit</h3>
        <div className="amount">{formatCurrency(result.tanf_monthly)}</div>
        <div className="amount-annual">
          {formatCurrency(result.tanf_annual)} per year
        </div>
        <span className={`eligibility-status ${result.eligible ? 'eligible' : 'not-eligible'}`}>
          {result.eligible ? 'Eligible' : 'Not Eligible'}
        </span>
        <EligibilityExplanation
          eligibilityChecks={result.eligibility_checks}
          eligible={result.eligible}
          stateName={result.state_name}
        />
      </div>

      <div className="result-details">
        <p>
          <strong>State:</strong> {result.state_name} ({result.state})
        </p>
        <p>
          <strong>Year:</strong> {result.year}
        </p>
        <p>
          <strong>Household:</strong> {result.household.num_adults} adult(s), {result.household.num_children} child(ren)
        </p>
      </div>

      <BenefitBreakdown
        breakdown={result.breakdown}
        tanfMonthly={result.tanf_monthly}
      />

      <PovertyContext
        povertyContext={result.poverty_context}
        tanfMonthly={result.tanf_monthly}
      />

      {chartData && (
        <div className="chart-container">
          <h3>TANF Benefit by Household Income</h3>
          <BenefitChart data={chartData.data} />
        </div>
      )}

      {combinedChartData && (
        <CombinedBenefitChart
          data={combinedChartData.data}
          programsAvailable={combinedChartData.programs_available}
        />
      )}
    </section>
  )
}

export default ResultsPanel
