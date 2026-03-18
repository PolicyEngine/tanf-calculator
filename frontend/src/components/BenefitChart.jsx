import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

function BenefitChart({ data }) {
  const formatCurrency = (value) => `$${value.toLocaleString()}`

  // Compute clean Y-axis domain based on max benefit
  const yDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, 500]
    const maxVal = Math.max(...data.map(d => d.tanf_monthly))
    // Round up to nearest nice increment
    const niceSteps = [100, 200, 250, 500, 1000, 1500, 2000, 2500, 3000]
    const target = maxVal * 1.1
    const nice = niceSteps.find(s => s >= target) || Math.ceil(target / 500) * 500
    return [0, nice]
  }, [data])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#1a2744',
          padding: '14px 18px',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(26, 39, 68, 0.25)',
          color: 'white',
          fontFamily: "'Inter', sans-serif",
        }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '4px' }}>
            Income: {formatCurrency(label)}/mo
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4FD1C5' }}>
            TANF: {formatCurrency(payload[0].value)}/mo
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e2dd" />
          <XAxis
            dataKey="total_income_monthly"
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            label={{ value: 'Monthly household income', position: 'bottom', offset: -5, fill: '#6b7280', fontSize: 11 }}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: '#e5e2dd' }}
            tickLine={{ stroke: '#e5e2dd' }}
          />
          <YAxis
            type="number"
            domain={yDomain}
            allowDecimals={false}
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            label={{ value: 'Monthly TANF benefit ($)', angle: -90, position: 'insideLeft', dx: -5, style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 } }}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: '#e5e2dd' }}
            tickLine={{ stroke: '#e5e2dd' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#e5e2dd" />
          <Line
            type="stepAfter"
            dataKey="tanf_monthly"
            stroke="#319795"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, fill: '#EF4444', stroke: '#1a2744', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default BenefitChart
