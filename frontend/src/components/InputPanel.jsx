import { useState, useEffect } from 'react'

const INITIAL_FORM_DATA = {
  year: 2025,
  num_adults: 1,
  num_children: 2,
  earned_income: 0,
  unearned_income: 0,
  county: '',
  is_tanf_enrolled: false,
  resources: 0,
}

function InputPanel({ selectedState, states, counties, countyRequired, onCalculate, onInputChange, onReset, onStateSelect, loading }) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)

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

  const handleSubmit = (e) => {
    e.preventDefault()
    // Build submit data with state from props, converting monthly income to annual
    const submitData = {
      ...formData,
      state: selectedState,
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
    if (onReset) onReset()
  }

  return (
    <section className="input-panel">
      <h2>Household Information</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
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

          {countyRequired && counties.length > 0 && (
            <div className="form-group">
              <label htmlFor="county">County</label>
              <select
                id="county"
                name="county"
                value={formData.county}
                onChange={handleChange}
              >
                {counties.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.name} {c.region && `(Region ${c.region})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="year">Year</label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
            >
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
            </select>
          </div>

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
              max="10"
              value={formData.num_children}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="earned_income">Earned Income ($/mo)</label>
            <input
              type="number"
              id="earned_income"
              name="earned_income"
              min="0"
              step="100"
              value={formData.earned_income}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="unearned_income">Unearned Income ($/mo)</label>
            <input
              type="number"
              id="unearned_income"
              name="unearned_income"
              min="0"
              step="100"
              value={formData.unearned_income}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="resources">Resources/Assets ($)</label>
            <input
              type="number"
              id="resources"
              name="resources"
              min="0"
              step="100"
              value={formData.resources}
              onChange={handleChange}
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_tanf_enrolled"
                checked={formData.is_tanf_enrolled}
                onChange={handleChange}
              />
              <span>Currently receiving TANF</span>
            </label>
          </div>

          <div className="form-group form-group-button">
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
              {loading ? 'Calculating...' : 'Calculate Benefits'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

export default InputPanel
