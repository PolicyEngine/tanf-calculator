import { useState, useEffect, useRef } from 'react'
import StateMap from './components/StateMap'
import InputPanel from './components/InputPanel'
import ResultsPanel from './components/ResultsPanel'
import StateRanking from './components/StateRanking'
import TotalResourcesChart from './components/TotalResourcesChart'
import ScenarioComparison from './components/ScenarioComparison'
import {
  loadMetadata,
  loadStateData,
  getCountyGroup,
  buildResult,
  generateChartData,
  generateHouseholdSizeData,
  calculateAllStates,
} from './dataLookup'

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
  const [householdSizeData, setHouseholdSizeData] = useState(null)
  const [comparisonData, setComparisonData] = useState(null)
  const [maxBenefit, setMaxBenefit] = useState(0)
  const [lastInputs, setLastInputs] = useState(null)
  const [activeTab, setActiveTab] = useState('Income & Benefits')
  const [metadata, setMetadata] = useState(null)
  const resultsRef = useRef(null)

  // Load metadata on mount
  useEffect(() => {
    loadMetadata()
      .then(meta => {
        setMetadata(meta)
        setStates(meta.states)
      })
      .catch(err => console.error('Failed to load metadata:', err))
  }, [])

  // Update county info when state changes
  useEffect(() => {
    if (!metadata) return
    const stateInfo = metadata.states.find(s => s.code === selectedState)
    if (stateInfo?.requires_county && metadata.county_data?.[selectedState]) {
      setCounties(metadata.county_data[selectedState].counties || [])
      setCountyRequired(true)
    } else {
      setCounties([])
      setCountyRequired(false)
    }
  }, [selectedState, metadata])

  const handleStateSelect = async (stateCode) => {
    setSelectedState(stateCode)

    // If we already have results, recalculate for the new state
    if (lastInputs && result) {
      const updatedInputs = { ...lastInputs, state: stateCode }
      // Remove county for non-county states
      const stateInfo = metadata?.states.find(s => s.code === stateCode)
      if (!stateInfo?.requires_county) {
        delete updatedInputs.county
      }

      try {
        const earnedMonthly = updatedInputs.earned_income / 12
        const unearnedMonthly = updatedInputs.unearned_income / 12
        const group = updatedInputs.county ? getCountyGroup(stateCode, updatedInputs.county) : null

        const stateData = await loadStateData(stateCode, group)
        const stateName = states.find(s => s.code === stateCode)?.name || stateCode

        const calcResult = buildResult(
          stateData, stateCode, stateName,
          updatedInputs.num_adults, updatedInputs.num_children,
          updatedInputs.is_tanf_enrolled, earnedMonthly, unearnedMonthly,
        )
        const rangeData = generateChartData(
          stateData, updatedInputs.num_adults, updatedInputs.num_children,
          updatedInputs.is_tanf_enrolled, earnedMonthly, unearnedMonthly,
        )
        const sizeData = generateHouseholdSizeData(
          stateData, updatedInputs.num_adults,
          updatedInputs.is_tanf_enrolled, earnedMonthly, unearnedMonthly,
        )

        setResult(calcResult)
        setChartData({ data: rangeData })
        setHouseholdSizeData(sizeData)
        setLastInputs(updatedInputs)
      } catch {
        // If state data fails to load, just update the selection
      }
    }
  }

  const clearResults = () => {
    setResult(null)
    setChartData(null)
    setHouseholdSizeData(null)
    setComparisonData(null)
    setMaxBenefit(0)
    setError(null)
    setActiveTab('Income & Benefits')
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
    setActiveTab('Income & Benefits')

    try {
      // Determine which data file to load
      const earnedMonthly = inputs.earned_income / 12
      const unearnedMonthly = inputs.unearned_income / 12
      const group = inputs.county ? getCountyGroup(inputs.state, inputs.county) : null

      const stateData = await loadStateData(inputs.state, group)
      const stateName = states.find(s => s.code === inputs.state)?.name || inputs.state

      // Build result from precomputed data
      const calcResult = buildResult(
        stateData,
        inputs.state,
        stateName,
        inputs.num_adults,
        inputs.num_children,
        inputs.is_tanf_enrolled,
        earnedMonthly,
        unearnedMonthly,
      )

      // Generate chart data from precomputed grid
      const rangeData = generateChartData(
        stateData,
        inputs.num_adults,
        inputs.num_children,
        inputs.is_tanf_enrolled,
        earnedMonthly,
        unearnedMonthly,
      )

      // Generate household size comparison data
      const sizeData = generateHouseholdSizeData(
        stateData,
        inputs.num_adults,
        inputs.is_tanf_enrolled,
        earnedMonthly,
        unearnedMonthly,
      )

      setResult(calcResult)
      setChartData({ data: rangeData })
      setHouseholdSizeData(sizeData)
      setLoading(false)

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)

      // Fire all-states comparison (loads all state files)
      setComparisonLoading(true)
      try {
        const allStatesResult = await calculateAllStates(
          inputs.num_adults,
          inputs.num_children,
          inputs.is_tanf_enrolled,
          earnedMonthly,
          unearnedMonthly,
        )
        setComparisonData(allStatesResult.states)
        setMaxBenefit(allStatesResult.max_benefit)
      } catch {
        console.error('Failed to load state comparison')
      } finally {
        setComparisonLoading(false)
      }
    } catch (err) {
      setError(err.message || 'Calculation failed. Please try again.')
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
        <div className="header-brand">
          <img src={`${import.meta.env.BASE_URL}policyengine-logo.png`} alt="PolicyEngine" className="header-logo" />
          <div>
            <h1>TANF Calculator</h1>
            <p>Estimate your TANF benefits</p>
          </div>
        </div>
      </header>

      <div className="top-layout">
        <InputPanel
          selectedState={selectedState}
          states={states}
          counties={counties}
          countyRequired={countyRequired}
          onCalculate={handleCalculate}
          onInputChange={handleInputChange}
          onReset={handleReset}
          onStateSelect={handleStateSelect}
          loading={loading}
        />

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
      </div>

      <div ref={resultsRef} />
      {(result || loading || error) && (
        <ResultsPanel
          result={result}
          chartData={chartData}
          householdSizeData={householdSizeData}
          comparisonData={comparisonData}
          loading={loading}
          error={error}
          onRetry={lastInputs ? handleRetry : null}
        />
      )}

      {result && (
        <section className="tabbed-section">
          <div className="tab-bar">
            {['Income & Benefits', 'State Comparison', 'Scenario Comparison'].map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="tab-content">
            {activeTab === 'Income & Benefits' && chartData && (
              <div>
                <p className="chart-subtitle">Shows how your total monthly resources change as income rises</p>
                <TotalResourcesChart
                  data={chartData.data}
                  currentIncome={(result.household.earned_income + result.household.unearned_income) / 12}
                  fpgMonthly={result.poverty_context?.fpg_monthly}
                />
                <div className="total-resources-legend">
                  <div className="legend-chip">
                    <span className="legend-dot" style={{ background: '#1E293B' }} />
                    <span>Earned Income</span>
                  </div>
                  <div className="legend-chip">
                    <span className="legend-dot" style={{ background: '#319795' }} />
                    <span>TANF Benefit</span>
                  </div>
                  {result.poverty_context?.fpg_monthly && (
                    <div className="legend-chip">
                      <span className="legend-dot" style={{ background: '#EF4444', width: 16, height: 2, borderRadius: 0 }} />
                      <span>Federal Poverty Level</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'State Comparison' && comparisonData && (
              <StateRanking
                data={comparisonData}
                selectedState={selectedState}
                onStateSelect={handleStateSelect}
                maxBenefit={maxBenefit}
              />
            )}
            {activeTab === 'State Comparison' && !comparisonData && comparisonLoading && (
              <div className="loading">Loading state comparison...</div>
            )}
            {activeTab === 'Scenario Comparison' && lastInputs && (
              <ScenarioComparison
                defaultInputs={lastInputs}
                selectedState={selectedState}
                counties={counties}
                countyRequired={countyRequired}
                metadata={metadata}
                states={states}
                onClose={() => setActiveTab('Income & Benefits')}
              />
            )}
          </div>
        </section>
      )}

      <footer className="app-footer">
        <p>
          Other factors may also affect your TANF benefit, including assets, child care costs, housing expenses, and disability status.
          For a more detailed household simulation with additional inputs, visit <a href="https://policyengine.org" target="_blank" rel="noopener noreferrer">PolicyEngine.org</a>.
        </p>
      </footer>
    </div>
  )
}

export default App
