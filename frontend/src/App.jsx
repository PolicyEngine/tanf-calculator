import { useState, useEffect } from 'react'
import StateMap from './components/StateMap'
import InputPanel from './components/InputPanel'
import ResultsPanel from './components/ResultsPanel'
import StateRanking from './components/StateRanking'
import ScenarioComparison from './components/ScenarioComparison'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function App() {
  const [states, setStates] = useState([])
  const [selectedState, setSelectedState] = useState('CA')
  const [counties, setCounties] = useState([])
  const [countyRequired, setCountyRequired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [combinedChartData, setCombinedChartData] = useState(null)
  const [comparisonData, setComparisonData] = useState(null)
  const [maxBenefit, setMaxBenefit] = useState(0)
  const [lastInputs, setLastInputs] = useState(null)
  const [showComparison, setShowComparison] = useState(false)

  // Fetch available states on mount
  useEffect(() => {
    fetch(`${API_BASE}/states`)
      .then(res => res.json())
      .then(data => setStates(data.states))
      .catch(err => console.error('Failed to fetch states:', err))
  }, [])

  // Fetch counties when state changes
  useEffect(() => {
    const fetchCounties = async () => {
      try {
        const res = await fetch(`${API_BASE}/counties/${selectedState}`)
        const data = await res.json()
        setCounties(data.counties || [])
        setCountyRequired(data.required || false)
      } catch (err) {
        console.error('Failed to fetch counties:', err)
        setCounties([])
        setCountyRequired(false)
      }
    }
    if (selectedState) {
      fetchCounties()
    }
  }, [selectedState])

  const handleStateSelect = (stateCode) => {
    setSelectedState(stateCode)
  }

  const clearResults = () => {
    setResult(null)
    setChartData(null)
    setCombinedChartData(null)
    setComparisonData(null)
    setMaxBenefit(0)
    setError(null)
    setShowComparison(false)
  }

  const handleInputChange = () => {
    clearResults()
  }

  const handleReset = () => {
    clearResults()
    setLastInputs(null)
  }

  const handleCalculate = async (inputs) => {
    setLoading(true)
    setError(null)
    setLastInputs(inputs)
    setShowComparison(false)

    try {
      // Fire single calculation + TANF range + combined range in parallel
      const [calcRes, rangeRes, combinedRes] = await Promise.all([
        fetch(`${API_BASE}/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputs),
        }),
        fetch(`${API_BASE}/calculate-range`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...inputs,
            income_min: 0,
            income_max: 50000,
            income_step: 500,
          }),
        }),
        fetch(`${API_BASE}/calculate-combined-range`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...inputs,
            income_min: 0,
            income_max: 50000,
            income_step: 2000,
          }),
        }),
      ])

      if (!calcRes.ok) {
        const errData = await calcRes.json()
        throw new Error(errData.detail || 'Calculation failed')
      }

      const calcData = await calcRes.json()
      const rangeData = rangeRes.ok ? await rangeRes.json() : null
      const combinedData = combinedRes.ok ? await combinedRes.json() : null

      setResult(calcData)
      setChartData(rangeData)
      setCombinedChartData(combinedData)
      setLoading(false)

      // Now fire all-states comparison as a follow-up
      setComparisonLoading(true)
      try {
        const allStatesRes = await fetch(`${API_BASE}/calculate-all-states`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: inputs.year,
            num_adults: inputs.num_adults,
            num_children: inputs.num_children,
            earned_income: inputs.earned_income,
            unearned_income: inputs.unearned_income,
            child_ages: inputs.child_ages,
            is_tanf_enrolled: inputs.is_tanf_enrolled,
            resources: inputs.resources,
          }),
        })
        if (allStatesRes.ok) {
          const allStatesData = await allStatesRes.json()
          setComparisonData(allStatesData.states)
          setMaxBenefit(allStatesData.max_benefit)
        }
      } catch {
        // Comparison failure is non-critical — results are already shown
        console.error('Failed to load state comparison')
      } finally {
        setComparisonLoading(false)
      }
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to the calculator service. Please check that the backend is running.')
      } else {
        setError(err.message)
      }
      setLoading(false)
    }
  }

  const handleRetry = () => {
    if (lastInputs) {
      handleCalculate(lastInputs)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>TANF Calculator</h1>
        <p>Estimate your Temporary Assistance for Needy Families (TANF) benefits</p>
      </header>

      <InputPanel
        selectedState={selectedState}
        counties={counties}
        countyRequired={countyRequired}
        onCalculate={handleCalculate}
        onInputChange={handleInputChange}
        onReset={handleReset}
        loading={loading}
      />

      {(result || loading || error) && (
        <ResultsPanel
          result={result}
          chartData={chartData}
          combinedChartData={combinedChartData}
          loading={loading}
          error={error}
          onRetry={lastInputs ? handleRetry : null}
        />
      )}

      {result && !showComparison && (
        <div className="compare-button-container">
          <button
            className="compare-btn"
            onClick={() => setShowComparison(true)}
          >
            Compare Scenarios
          </button>
        </div>
      )}

      {showComparison && lastInputs && (
        <ScenarioComparison
          defaultInputs={lastInputs}
          selectedState={selectedState}
          counties={counties}
          countyRequired={countyRequired}
          onClose={() => setShowComparison(false)}
        />
      )}

      <section className="map-section">
        <h2>{comparisonData ? 'Benefit Comparison by State' : 'Select Your State'}</h2>
        {comparisonLoading && (
          <div className="loading">Loading state comparison...</div>
        )}
        <StateMap
          selectedState={selectedState}
          availableStates={states}
          onStateSelect={handleStateSelect}
          comparisonData={comparisonData}
          maxBenefit={maxBenefit}
        />
      </section>

      {comparisonData && (
        <section className="comparison-section">
          <StateRanking
            data={comparisonData}
            selectedState={selectedState}
            onStateSelect={handleStateSelect}
            maxBenefit={maxBenefit}
          />
        </section>
      )}
    </div>
  )
}

export default App
