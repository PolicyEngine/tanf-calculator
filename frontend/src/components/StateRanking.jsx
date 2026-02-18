import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

function StateRanking({ data, selectedState, onStateSelect, maxBenefit }) {
  // Get top 15 states (or all if less)
  const topStates = useMemo(() => {
    if (!data) return []
    return data
      .filter(d => !d.error && d.tanf_monthly > 0)
      .slice(0, 15)
  }, [data])

  // States that failed to calculate
  const failedStates = useMemo(() => {
    if (!data) return []
    return data.filter(d => d.error)
  }, [data])

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Find selected state's rank (among non-error states)
  const selectedStateData = useMemo(() => {
    if (!data || !selectedState) return null
    const validStates = data.filter(d => !d.error)
    const index = validStates.findIndex(d => d.state === selectedState)
    if (index === -1) return null
    return { ...validStates[index], rank: index + 1 }
  }, [data, selectedState])

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div style={{
          background: '#1a2744',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(26, 39, 68, 0.25)',
          color: 'white',
          fontFamily: "'Source Sans 3', sans-serif",
        }}>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>{item.state_name}</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e85d4c', fontFamily: "'Libre Baskerville', serif" }}>
            {formatCurrency(item.tanf_monthly)}/mo
          </p>
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px' }}>
            {formatCurrency(item.tanf_annual)}/year
          </p>
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  return (
    <div className="state-ranking">
      <div className="ranking-header">
        <h3>State Benefit Comparison</h3>
        <p className="ranking-subtitle">
          Top states by monthly TANF benefit for your household
        </p>
      </div>

      {selectedStateData && (
        <div className="selected-state-rank">
          <span className="rank-badge">#{selectedStateData.rank}</span>
          <span className="rank-text">
            <strong>{selectedStateData.state_name}</strong> ranks #{selectedStateData.rank} of {data.filter(d => !d.error && d.tanf_monthly > 0).length} states
            {selectedStateData.tanf_monthly > 0 && (
              <> with <strong>{formatCurrency(selectedStateData.tanf_monthly)}/mo</strong></>
            )}
          </span>
        </div>
      )}

      <div className="ranking-chart">
        <ResponsiveContainer width="100%" height={Math.max(400, topStates.length * 36)}>
          <BarChart
            data={topStates}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
            barCategoryGap={8}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => `$${v}`}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#e5e2dd' }}
              tickLine={{ stroke: '#e5e2dd' }}
            />
            <YAxis
              type="category"
              dataKey="state_name"
              tick={{ fill: '#1a2744', fontSize: 13, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13, 148, 136, 0.1)' }} />
            <Bar
              dataKey="tanf_monthly"
              radius={[0, 4, 4, 0]}
              onClick={(data) => onStateSelect(data.state)}
              style={{ cursor: 'pointer' }}
            >
              {topStates.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.state === selectedState ? '#e85d4c' : '#0d9488'}
                  opacity={entry.state === selectedState ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="ranking-footer">
        <p>Click a bar to select that state. Only states where you're eligible are shown.</p>
      </div>

      {failedStates.length > 0 && (
        <div className="failed-states">
          <p className="failed-states-label">Calculation unavailable:</p>
          <p className="failed-states-list">
            {failedStates.map(d => d.state_name || d.state).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

export default StateRanking
