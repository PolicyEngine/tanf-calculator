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
import { niceTicks } from '../utils/niceTicks'

const fmt = (v) => v.toLocaleString('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
})

function BenefitChart({ data }) {
  const { xTicks, yTicks } = useMemo(() => {
    if (!data || data.length === 0) return { xTicks: [0], yTicks: [0] }
    const xMax = Math.max(...data.map(d => d.total_income_monthly))
    const yMax = Math.max(...data.map(d => d.tanf_monthly))
    return { xTicks: niceTicks(xMax), yTicks: niceTicks(yMax) }
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
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '4px' }}>
            Income: {fmt(label)}/mo
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4FD1C5' }}>
            TANF: {fmt(payload[0].value)}/mo
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
            domain={[0, xTicks[xTicks.length - 1]]}
            ticks={xTicks}
            tickFormatter={fmt}
            label={{ value: 'Monthly household income', position: 'bottom', offset: -5, fill: '#6b7280', fontSize: 11 }}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: '#e5e2dd' }}
            tickLine={{ stroke: '#e5e2dd' }}
          />
          <YAxis
            domain={[0, yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickFormatter={fmt}
            label={{ value: 'Monthly TANF benefit', angle: -90, position: 'insideLeft', dx: -5, style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 } }}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: '#e5e2dd' }}
            tickLine={{ stroke: '#e5e2dd' }}
          />
          <Tooltip content={<CustomTooltip />} separator=": " />
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
