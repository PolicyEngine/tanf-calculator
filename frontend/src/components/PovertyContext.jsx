function PovertyContext({ povertyContext, tanfMonthly }) {
  if (!povertyContext || !povertyContext.fpg_monthly) return null

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const incomePct = Math.min(povertyContext.income_pct_fpg, 100)
  const tanfPct = Math.min(povertyContext.tanf_pct_fpg, 100 - incomePct)
  const totalPct = povertyContext.income_plus_tanf_pct_fpg

  return (
    <div className="poverty-context">
      <h4>Benefit in Context</h4>
      <p className="poverty-subtitle">
        How your income + TANF compares to the Federal Poverty Level ({formatCurrency(povertyContext.fpg_monthly)}/mo)
      </p>
      <div className="poverty-bar-container">
        <div className="poverty-bar">
          {incomePct > 0 && (
            <div
              className="poverty-segment income"
              style={{ width: `${incomePct}%` }}
              title={`Income: ${povertyContext.income_pct_fpg}% of FPL`}
            />
          )}
          {tanfPct > 0 && (
            <div
              className="poverty-segment tanf"
              style={{ width: `${tanfPct}%` }}
              title={`TANF: ${povertyContext.tanf_pct_fpg}% of FPL`}
            />
          )}
          <div className="poverty-line" title="Federal Poverty Level" />
        </div>
        <div className="poverty-labels">
          {incomePct > 0 && (
            <span className="poverty-label income-label">
              Income: {povertyContext.income_pct_fpg}%
            </span>
          )}
          {tanfMonthly > 0 && (
            <span className="poverty-label tanf-label">
              TANF: {povertyContext.tanf_pct_fpg}%
            </span>
          )}
          <span className="poverty-label total-label">
            Total: {totalPct}% of FPL
          </span>
        </div>
      </div>
    </div>
  )
}

export default PovertyContext
