function BenefitBreakdown({ breakdown, tanfMonthly }) {
  if (!breakdown || Object.keys(breakdown).length === 0) return null

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const maxMonthly = breakdown.max_benefit_monthly
  const countableMonthly = breakdown.countable_income_monthly
  const earnedMonthly = breakdown.gross_earned_income_monthly
  const unearnedMonthly = breakdown.gross_unearned_income_monthly

  // Hide if there's no detail beyond the total
  const hasDetail = maxMonthly != null || (countableMonthly != null && countableMonthly > 0)
  if (!hasDetail) return null

  return (
    <details className="benefit-breakdown">
      <summary>How is this calculated?</summary>
      <div className="breakdown-content">
        {maxMonthly != null && (
          <div className="breakdown-row">
            <span className="breakdown-label">Maximum Benefit</span>
            <span className="breakdown-value positive">{formatCurrency(maxMonthly)}/mo</span>
          </div>
        )}
        {countableMonthly != null && countableMonthly > 0 && (
          <div className="breakdown-row">
            <span className="breakdown-label">Countable Income</span>
            <span className="breakdown-value negative">- {formatCurrency(countableMonthly)}/mo</span>
          </div>
        )}
        {(earnedMonthly != null || unearnedMonthly != null) && (
          <div className="breakdown-sub">
            {earnedMonthly != null && earnedMonthly > 0 && (
              <div className="breakdown-row sub">
                <span className="breakdown-label">Gross Earned Income</span>
                <span className="breakdown-value">{formatCurrency(earnedMonthly)}/mo</span>
              </div>
            )}
            {unearnedMonthly != null && unearnedMonthly > 0 && (
              <div className="breakdown-row sub">
                <span className="breakdown-label">Gross Unearned Income</span>
                <span className="breakdown-value">{formatCurrency(unearnedMonthly)}/mo</span>
              </div>
            )}
          </div>
        )}
        <div className="breakdown-divider" />
        <div className="breakdown-row total">
          <span className="breakdown-label">Your Estimated Benefit</span>
          <span className="breakdown-value">{formatCurrency(tanfMonthly)}/mo</span>
        </div>
      </div>
    </details>
  )
}

export default BenefitBreakdown
