import { useState, useEffect } from 'react'

function InfoTooltip({ text }) {
  return (
    <span className="info-tooltip-wrapper">
      <span className="info-tooltip-icon">i</span>
      <span className="info-tooltip-text">{text}</span>
    </span>
  )
}

const INITIAL_FORM_DATA = {
  num_adults: 1,
  num_children: 2,
  earned_income: 0,
  unearned_income: 0,
  county: '',
  is_tanf_enrolled: false,
}

const formatWithCommas = (value) => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

const parseCommaNumber = (str) => {
  const num = parseFloat(str.replace(/,/g, ''))
  return isNaN(num) ? 0 : num
}

function InputPanel({ selectedState, states, counties, countyRequired, onCalculate, onInputChange, onReset, onStateSelect, loading }) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [incomeDisplay, setIncomeDisplay] = useState({
    earned_income: '0',
    unearned_income: '0',
  })

  // Reset county when state changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      county: '',
    }))
  }, [selectedState])

  // Set default county when counties are loaded
  useEffect(() => {
    if (counties.length > 0 && !formData.county) {
      setFormData(prev => ({
        ...prev,
        county: counties[0].code,
      }))
    }
  }, [counties])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value),
    }))
    if (onInputChange) onInputChange()
  }

  const handleIncomeChange = (e) => {
    const { name, value } = e.target
    const cleaned = value.replace(/[^0-9]/g, '')
    const num = parseFloat(cleaned) || 0
    setIncomeDisplay(prev => ({ ...prev, [name]: num === 0 ? '' : formatWithCommas(num) }))
    setFormData(prev => ({ ...prev, [name]: num }))
    if (onInputChange) onInputChange()
  }

  const handleIncomeBlur = (e) => {
    const { name } = e.target
    setIncomeDisplay(prev => ({ ...prev, [name]: formatWithCommas(formData[name]) }))
  }

  const handleIncomeFocus = (e) => {
    const { name } = e.target
    const val = formData[name]
    setIncomeDisplay(prev => ({ ...prev, [name]: val === 0 ? '' : formatWithCommas(val) }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Build submit data with state from props, converting monthly income to annual
    const submitData = {
      ...formData,
      state: selectedState,
      year: 2025,
      earned_income: formData.earned_income * 12,
      unearned_income: formData.unearned_income * 12,
    }
    if (!countyRequired || !formData.county) {
      delete submitData.county
    }
    onCalculate(submitData)
  }

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA)
    setIncomeDisplay({ earned_income: '0', unearned_income: '0' })
    if (onReset) onReset()
  }

  return (
    <section className="input-panel">
      <h2>Household information</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Row 1: State + County (county always occupies space) */}
          <div className="form-group">
            <label htmlFor="state">State</label>
            <select
              id="state"
              name="state"
              value={selectedState}
              onChange={(e) => onStateSelect(e.target.value)}
            >
              {states.map(s => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={`form-group ${!countyRequired ? 'form-group-hidden' : ''}`}>
            <label htmlFor="county">County</label>
            <select
              id="county"
              name="county"
              value={formData.county}
              onChange={handleChange}
              disabled={!countyRequired}
            >
              {countyRequired && counties.length > 0
                ? counties.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))
                : <option value="">N/A</option>
              }
            </select>
          </div>

          {/* Row 2: Adults + Children */}
          <div className="form-group">
            <label htmlFor="num_adults">Adults</label>
            <select
              id="num_adults"
              name="num_adults"
              value={formData.num_adults}
              onChange={handleChange}
            >
              <option value={1}>1 (Single parent)</option>
              <option value={2}>2 (Two-parent)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="num_children">Children</label>
            <input
              type="number"
              id="num_children"
              name="num_children"
              min="0"
              max="7"
              value={formData.num_children}
              onChange={handleChange}
            />
          </div>

          {/* Row 3: Income */}
          <div className="form-group">
            <label htmlFor="earned_income">
              Earned income ($/month)
              <InfoTooltip text="Income from wages, salaries, tips, and self-employment. This is money you receive from working." />
            </label>
            <input
              type="text"
              inputMode="numeric"
              id="earned_income"
              name="earned_income"
              value={incomeDisplay.earned_income}
              onChange={handleIncomeChange}
              onBlur={handleIncomeBlur}
              onFocus={handleIncomeFocus}
            />
          </div>

          <div className="form-group">
            <label htmlFor="unearned_income">
              Unearned income ($/month)
              <InfoTooltip text="Income not from employment, such as Social Security, child support, pensions, unemployment benefits, or rental income." />
            </label>
            <input
              type="text"
              inputMode="numeric"
              id="unearned_income"
              name="unearned_income"
              value={incomeDisplay.unearned_income}
              onChange={handleIncomeChange}
              onBlur={handleIncomeBlur}
              onFocus={handleIncomeFocus}
            />
          </div>

        </div>

        {/* Action row: buttons */}
        <div className="form-actions">
          <div className="form-buttons">
            <button
              type="button"
              className="reset-btn"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              type="submit"
              className="calculate-btn"
              disabled={loading}
            >
              {loading ? 'Calculating...' : 'Calculate benefits'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

export default InputPanel
