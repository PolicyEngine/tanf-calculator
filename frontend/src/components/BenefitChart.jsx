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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#1a2744',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(26, 39, 68, 0.25)',
          color: 'white',
          fontFamily: "'Source Sans 3', sans-serif",
        }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '4px' }}>
            Monthly Household Income
          </p>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px' }}>
            {formatCurrency(label)}/mo
          </p>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '4px' }}>
            Monthly TANF Benefit
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e85d4c', fontFamily: "'Libre Baskerville', serif" }}>
            {formatCurrency(payload[0].value)}
          </p>
          <p style={{
            marginTop: '12px',
            fontSize: '0.8rem',
            padding: '4px 10px',
            background: payload[0].payload.eligible ? '#0d9488' : 'rgba(255,255,255,0.15)',
            borderRadius: '100px',
            display: 'inline-block',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            fontWeight: 600,
          }}>
            {payload[0].payload.eligible ? '✓ Eligible' : 'Not Eligible'}
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
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e2dd" />
          <XAxis
            dataKey="total_income_monthly"
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            label={{ value: 'Monthly Household Income', position: 'bottom', offset: -5, fill: '#6b7280', fontSize: 12 }}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e2dd' }}
            tickLine={{ stroke: '#e5e2dd' }}
            interval={Math.max(0, Math.ceil((data?.length || 1) / 10) - 1)}
          />
          <YAxis
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            label={{ value: 'Monthly TANF Benefit ($)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e2dd' }}
            tickLine={{ stroke: '#e5e2dd' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#e5e2dd" />
          <Line
            type="stepAfter"
            dataKey="tanf_monthly"
            stroke="#0d9488"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 8, fill: '#e85d4c', stroke: '#1a2744', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default BenefitChart
