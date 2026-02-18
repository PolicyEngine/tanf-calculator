function EligibilityExplanation({ eligibilityChecks, eligible, stateName }) {
  if (!eligibilityChecks || Object.keys(eligibilityChecks).length === 0) return null

  const checks = []

  // Demographic check
  if (eligibilityChecks.demographic != null) {
    checks.push({
      label: 'Family Composition',
      passed: eligibilityChecks.demographic,
      failText: 'Your household does not meet the family composition requirements.',
    })
  }

  // Economic check
  if (eligibilityChecks.economic != null) {
    let failText = 'Your household does not meet the economic eligibility requirements.'
    // Refine the message using diagnostics
    if (!eligibilityChecks.economic) {
      const incomeBarrier = eligibilityChecks.eligible_with_zero_income === true
      const resourceBarrier = eligibilityChecks.eligible_with_zero_resources === true

      if (incomeBarrier && !resourceBarrier) {
        failText = 'Your income exceeds the eligibility threshold for this state.'
      } else if (!incomeBarrier && resourceBarrier) {
        failText = 'Your resources/assets exceed the eligibility limit.'
      } else if (incomeBarrier && resourceBarrier) {
        failText = 'Both your income and resources exceed the eligibility limits.'
      }
    }

    checks.push({
      label: 'Income Test',
      passed: eligibilityChecks.economic,
      failText,
    })
  }

  // Resource diagnostic (if we ran it and it helped)
  if (eligibilityChecks.eligible_with_zero_resources != null && !eligible) {
    const resourcesPassed = eligibilityChecks.eligible_with_zero_resources
    if (!resourcesPassed) {
      checks.push({
        label: 'Resource Test',
        passed: false,
        failText: 'Your resources/assets exceed the eligibility limit.',
      })
    }
  }

  if (checks.length === 0) return null

  return (
    <div className="eligibility-explanation">
      <h4>{eligible ? 'Eligibility Tests Passed' : 'Why Not Eligible?'}</h4>
      <ul className="eligibility-checklist">
        {checks.map((check, i) => (
          <li key={i} className={`check-item ${check.passed ? 'passed' : 'failed'}`}>
            <span className="check-icon">{check.passed ? '\u2713' : '\u2717'}</span>
            <div>
              <span className="check-label">{check.label}</span>
              {!check.passed && (
                <span className="check-detail">{check.failText}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!eligible && (
        <p className="eligibility-note">
          Eligibility rules vary by state. Contact your local {stateName || 'state'} TANF office for details.
        </p>
      )}
    </div>
  )
}

export default EligibilityExplanation
