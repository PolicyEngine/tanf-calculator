import { useState, useEffect, useCallback } from 'react'
import { loadStateData, getCountyGroup, lookupBenefit } from '../dataLookup'

function ScenarioComparison({ defaultInputs, selectedState, counties, countyRequired, metadata, states, onClose }) {
  const earnedA = Math.round(defaultInputs.earned_income / 12)
  const unearnedA = Math.round(defaultInputs.unearned_income / 12)

  const [scenarioB, setScenarioB] = useState({
    num_adults: defaultInputs.num_adults,
    num_children: defaultInputs.num_children,
    earned_income: earnedA,
    unearned_income: unearnedA,
  })
  const [benefitA, setBenefitA] = useState(null)
  const [benefitB, setBenefitB] = useState(null)
  const [stateData, setStateData] = useState(null)

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  // Load state data once
  useEffect(() => {
    const group = defaultInputs.county ? getCountyGroup(defaultInputs.state, defaultInputs.county) : null
    loadStateData(defaultInputs.state, group).then(data => {
      setStateData(data)
    })
  }, [defaultInputs.state, defaultInputs.county])

  // Compute both benefits whenever stateData or scenarioB changes
  const computeBenefits = useCallback(() => {
    if (!stateData) return

    const resultA = lookupBenefit(
      stateData,
      defaultInputs.num_adults,
      defaultInputs.num_children,
      defaultInputs.is_tanf_enrolled,
      earnedA,
      unearnedA,
    )
    setBenefitA(resultA)

    const resultB = lookupBenefit(
      stateData,
      scenarioB.num_adults,
      scenarioB.num_children,
      defaultInputs.is_tanf_enrolled,
      scenarioB.earned_income,
      scenarioB.unearned_income,
    )
    setBenefitB(resultB)
  }, [stateData, scenarioB, defaultInputs, earnedA, unearnedA])

  useEffect(() => {
    computeBenefits()
  }, [computeBenefits])

  const handleSlider = (name, value) => {
    setScenarioB(prev => ({ ...prev, [name]: value }))
  }

  const diff = benefitA && benefitB ? benefitB.tanf_monthly - benefitA.tanf_monthly : 0
  const hasChanges = scenarioB.num_adults !== defaultInputs.num_adults
    || scenarioB.num_children !== defaultInputs.num_children
    || scenarioB.earned_income !== earnedA
    || scenarioB.unearned_income !== unearnedA

  const sliders = [
    {
      name: 'num_children',
      label: 'Children',
      min: 0, max: 7, step: 1,
      value: scenarioB.num_children,
      originalValue: defaultInputs.num_children,
      format: v => String(v),
    },
    {
      name: 'earned_income',
      label: 'Earned income',
      min: 0, max: 3000, step: 100,
      value: scenarioB.earned_income,
      originalValue: earnedA,
      format: v => `${formatCurrency(v)}/mo`,
    },
    {
      name: 'unearned_income',
      label: 'Unearned income',
      min: 0, max: 3000, step: 100,
      value: scenarioB.unearned_income,
      originalValue: unearnedA,
      format: v => `${formatCurrency(v)}/mo`,
    },
  ]

  return (
    <section className="scenario-comparison-v2">
      {/* Current scenario summary */}
      <div className="scenario-current">
        <span className="scenario-current-label">Current</span>
        <div className="scenario-current-chips">
          <span className="scenario-chip">{defaultInputs.num_adults} Adult{defaultInputs.num_adults > 1 ? 's' : ''}</span>
          <span className="scenario-chip">{defaultInputs.num_children} Child{defaultInputs.num_children !== 1 ? 'ren' : ''}</span>
          <span className="scenario-chip">{formatCurrency(earnedA)}/mo earned</span>
          <span className="scenario-chip">{formatCurrency(unearnedA)}/mo unearned</span>
        </div>
        {benefitA && (
          <div className="scenario-current-benefit">
            {formatCurrency(benefitA.tanf_monthly)}/mo
          </div>
        )}
      </div>

      {/* Adults toggle + Sliders */}
      <p className="scenario-hint">Adjust the values below to explore different scenarios</p>
      <div className={`scenario-toggle-row ${scenarioB.num_adults !== defaultInputs.num_adults ? 'changed' : ''}`}>
        <span className="scenario-slider-label">Household</span>
        <div className="scenario-toggle">
          <button
            className={`toggle-btn ${scenarioB.num_adults === 1 ? 'active' : ''}`}
            onClick={() => handleSlider('num_adults', 1)}
          >
            Single parent
          </button>
          <button
            className={`toggle-btn ${scenarioB.num_adults === 2 ? 'active' : ''}`}
            onClick={() => handleSlider('num_adults', 2)}
          >
            Married
          </button>
        </div>
      </div>
      <div className="scenario-sliders">
        {sliders.map(s => {
          const changed = s.value !== s.originalValue
          return (
            <div key={s.name} className={`scenario-slider-row ${changed ? 'changed' : ''}`}>
              <div className="scenario-slider-header">
                <span className="scenario-slider-label">{s.label}</span>
                <span className={`scenario-slider-value ${changed ? 'changed' : ''}`}>
                  {s.format(s.value)}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={s.value}
                onChange={e => handleSlider(s.name, parseFloat(e.target.value))}
                className="scenario-range"
                aria-label={`Adjust ${s.label}`}
                aria-valuemin={s.min}
                aria-valuemax={s.max}
                aria-valuenow={s.value}
                aria-valuetext={s.format(s.value)}
              />
              <div className="scenario-slider-bounds">
                <span>{s.format(s.min)}</span>
                <span>{s.format(s.max)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Live result */}
      {benefitA && benefitB && (
        <div className={`scenario-live-result ${!hasChanges ? 'no-change' : ''}`}>
          <div className="scenario-result-bar">
            <div className="scenario-result-side">
              <span className="scenario-result-tag">Current</span>
              <span className={`scenario-result-val ${benefitA.eligible ? '' : 'not-eligible'}`}>
                {formatCurrency(benefitA.tanf_monthly)}/mo
              </span>
            </div>

            <div className={`scenario-result-diff ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral'}`}>
              <span className="diff-icon">{diff > 0 ? '\u2191' : diff < 0 ? '\u2193' : '='}</span>
              <span className="diff-amount">
                {diff > 0 ? '+' : ''}{formatCurrency(diff)}/mo
              </span>
            </div>

            <div className="scenario-result-side">
              <span className="scenario-result-tag">What if</span>
              <span className={`scenario-result-val ${benefitB.eligible ? '' : 'not-eligible'}`}>
                {formatCurrency(benefitB.tanf_monthly)}/mo
              </span>
            </div>
          </div>

          {benefitA.eligible !== benefitB.eligible && (
            <div className="scenario-eligibility-change">
              Eligibility changes: {benefitA.eligible ? 'Eligible' : 'Not Eligible'} → {benefitB.eligible ? 'Eligible' : 'Not Eligible'}
            </div>
          )}
        </div>
      )}

      {hasChanges && (
        <button
          className="scenario-reset-btn"
          onClick={() => setScenarioB({
            num_adults: defaultInputs.num_adults,
            num_children: defaultInputs.num_children,
            earned_income: earnedA,
            unearned_income: unearnedA,
          })}
        >
          Reset to current
        </button>
      )}
    </section>
  )
}

export default ScenarioComparison
