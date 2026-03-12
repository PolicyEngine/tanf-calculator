import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const DEFAULT_COUNT = 7

function StateRanking({ data, selectedState, onStateSelect, maxBenefit }) {
  const [expanded, setExpanded] = useState(false)

  const allEligible = useMemo(() => {
    if (!data) return []
    return data.filter(d => !d.error && d.tanf_monthly > 0)
  }, [data])

  const displayStates = expanded ? allEligible : allEligible.slice(0, DEFAULT_COUNT)

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const selectedStateData = useMemo(() => {
    if (!data || !selectedState) return null
    const idx = allEligible.findIndex(d => d.state === selectedState)
    if (idx === -1) return null
    return { ...allEligible[idx], rank: idx + 1 }
  }, [data, selectedState, allEligible])

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
          fontFamily: "'Inter', sans-serif",
        }}>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>{item.state_name}</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4FD1C5' }}>
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

  if (!data || allEligible.length === 0) {
    return <p className="ranking-empty">No eligible states found for this household.</p>
  }

  return (
    <div className="state-ranking">
      {selectedStateData && (
        <div className="selected-state-rank">
          <span className="rank-badge">#{selectedStateData.rank}</span>
          <span className="rank-text">
            <strong>{selectedStateData.state_name}</strong> ranks #{selectedStateData.rank} of {allEligible.length} states
            {selectedStateData.tanf_monthly > 0 && (
              <> with <strong>{formatCurrency(selectedStateData.tanf_monthly)}/mo</strong></>
            )}
          </span>
        </div>
      )}

      <div className="ranking-chart">
        <ResponsiveContainer width="100%" height={Math.max(200, displayStates.length * 36)}>
          <BarChart
            data={displayStates}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            barCategoryGap={6}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => `$${v}`}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#e5e2dd' }}
              tickLine={{ stroke: '#e5e2dd' }}
            />
            <YAxis
              type="category"
              dataKey="state_name"
              tick={{ fill: '#1a2744', fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13, 148, 136, 0.08)' }} />
            <Bar
              dataKey="tanf_monthly"
              radius={[0, 4, 4, 0]}
              onClick={(data) => onStateSelect(data.state)}
              style={{ cursor: 'pointer' }}
            >
              {displayStates.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.state === selectedState ? '#EF4444' : '#319795'}
                  opacity={entry.state === selectedState ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="ranking-footer">
        {allEligible.length > DEFAULT_COUNT && (
          <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show less' : `Show all ${allEligible.length} states`}
          </button>
        )}
        <p>Click a bar to select that state</p>
      </div>
    </div>
  )
}

export default StateRanking
