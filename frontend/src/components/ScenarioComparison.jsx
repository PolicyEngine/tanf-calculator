import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function ScenarioComparison({ defaultInputs, selectedState, counties, countyRequired, onClose }) {
  // Store income as monthly for user-friendly input (defaultInputs has annual values)
  const [scenarioB, setScenarioB] = useState({
    ...defaultInputs,
    earned_income: Math.round(defaultInputs.earned_income / 12),
    unearned_income: Math.round(defaultInputs.unearned_income / 12),
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setScenarioB(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value),
    }))
  }

  const handleCompare = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/calculate-comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_a: defaultInputs,
          scenario_b: {
            ...scenarioB,
            earned_income: scenarioB.earned_income * 12,
            unearned_income: scenarioB.unearned_income * 12,
          },
        }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Comparison failed')
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isDifferent = (field) => {
    if (field === 'earned_income' || field === 'unearned_income') {
      return Math.round(defaultInputs[field] / 12) !== scenarioB[field]
    }
    return defaultInputs[field] !== scenarioB[field]
  }

  return (
    <section className="scenario-comparison">
      <div className="scenario-header">
        <h3>Compare Scenarios</h3>
        <button className="scenario-close" onClick={onClose}>&times;</button>
      </div>

      <div className="scenario-grid">
        <div className="scenario-col">
          <h4>Scenario A (Current)</h4>
          <div className="scenario-summary">
            <p><strong>Adults:</strong> {defaultInputs.num_adults}</p>
            <p><strong>Children:</strong> {defaultInputs.num_children}</p>
            <p><strong>Earned Income:</strong> {formatCurrency(defaultInputs.earned_income / 12)}/mo</p>
            <p><strong>Unearned Income:</strong> {formatCurrency(defaultInputs.unearned_income / 12)}/mo</p>
            <p><strong>Resources:</strong> {formatCurrency(defaultInputs.resources)}</p>
          </div>
        </div>

        <div className="scenario-col scenario-b">
          <h4>Scenario B (What If)</h4>
          <div className="scenario-form">
            <div className="scenario-field">
              <label>Adults</label>
              <select name="num_adults" value={scenarioB.num_adults} onChange={handleChange}
                className={isDifferent('num_adults') ? 'changed' : ''}>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div className="scenario-field">
              <label>Children</label>
              <input type="number" name="num_children" min="0" max="10"
                value={scenarioB.num_children} onChange={handleChange}
                className={isDifferent('num_children') ? 'changed' : ''} />
            </div>
            <div className="scenario-field">
              <label>Earned Income ($/mo)</label>
              <input type="number" name="earned_income" min="0" step="100"
                value={scenarioB.earned_income} onChange={handleChange}
                className={isDifferent('earned_income') ? 'changed' : ''} />
            </div>
            <div className="scenario-field">
              <label>Unearned Income ($/mo)</label>
              <input type="number" name="unearned_income" min="0" step="100"
                value={scenarioB.unearned_income} onChange={handleChange}
                className={isDifferent('unearned_income') ? 'changed' : ''} />
            </div>
            <div className="scenario-field">
              <label>Resources ($)</label>
              <input type="number" name="resources" min="0" step="100"
                value={scenarioB.resources} onChange={handleChange}
                className={isDifferent('resources') ? 'changed' : ''} />
            </div>
          </div>
        </div>
      </div>

      <div className="scenario-actions">
        <button className="calculate-btn" onClick={handleCompare} disabled={loading}>
          {loading ? 'Comparing...' : 'Compare'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="scenario-results">
          <div className="scenario-result-grid">
            <div className="scenario-result-col">
              <div className="scenario-result-label">Scenario A</div>
              <div className={`scenario-result-amount ${result.scenario_a.eligible ? '' : 'not-eligible'}`}>
                {formatCurrency(result.scenario_a.tanf_monthly)}/mo
              </div>
              <span className={`eligibility-badge ${result.scenario_a.eligible ? 'eligible' : 'not-eligible'}`}>
                {result.scenario_a.eligible ? 'Eligible' : 'Not Eligible'}
              </span>
            </div>

            <div className="scenario-result-diff">
              <div className="diff-arrow">
                {result.difference.tanf_monthly > 0 ? '+' : ''}
                {formatCurrency(result.difference.tanf_monthly)}/mo
              </div>
              {result.difference.eligible_changed && (
                <div className="diff-note">Eligibility changed</div>
              )}
            </div>

            <div className="scenario-result-col">
              <div className="scenario-result-label">Scenario B</div>
              <div className={`scenario-result-amount ${result.scenario_b.eligible ? '' : 'not-eligible'}`}>
                {formatCurrency(result.scenario_b.tanf_monthly)}/mo
              </div>
              <span className={`eligibility-badge ${result.scenario_b.eligible ? 'eligible' : 'not-eligible'}`}>
                {result.scenario_b.eligible ? 'Eligible' : 'Not Eligible'}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ScenarioComparison
