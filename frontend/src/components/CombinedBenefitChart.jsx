import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts'

const PROGRAM_COLORS = {
  tanf: '#0d9488',
  snap: '#1a2744',
  eitc: '#e85d4c',
  ctc: '#d97706',
}

const PROGRAM_LABELS = {
  tanf: 'TANF',
  snap: 'SNAP',
  eitc: 'EITC',
  ctc: 'CTC',
}

function CombinedBenefitChart({ data, programsAvailable }) {
  if (!data || data.length === 0) return null

  const programs = (programsAvailable || ['tanf', 'snap', 'eitc', 'ctc']).filter(
    p => PROGRAM_COLORS[p]
  )

  const formatCurrency = (value) => `$${value.toLocaleString()}`

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload || {}
      return (
        <div style={{
          background: '#1a2744',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(26, 39, 68, 0.25)',
          color: 'white',
          fontFamily: "'Source Sans 3', sans-serif",
          minWidth: '180px',
        }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '4px' }}>
            Monthly Household Income
          </p>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px' }}>
            {formatCurrency(label)}/mo
          </p>
          {programs.map(prog => {
            const key = `${prog}_monthly`
            const val = point[key]
            if (val == null) return null
            return (
              <div key={prog} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: PROGRAM_COLORS[prog], display: 'inline-block' }} />
                  {PROGRAM_LABELS[prog]}
                </span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(Math.round(val))}</span>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ color: '#e85d4c' }}>{formatCurrency(Math.round(point.total_benefits_monthly || 0))}</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="chart-container">
      <h3>Combined Benefits by Household Income</h3>
      <p className="chart-subtitle">TANF + SNAP + EITC + CTC estimated monthly benefits</p>
      <div className="combined-chart-legend">
        {programs.map(prog => (
          <span key={prog} className="legend-chip">
            <span className="legend-dot" style={{ background: PROGRAM_COLORS[prog] }} />
            {PROGRAM_LABELS[prog]}
          </span>
        ))}
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
            />
            <YAxis
              tickFormatter={(v) => `$${v.toLocaleString()}`}
              label={{ value: 'Monthly Benefits ($)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#e5e2dd' }}
              tickLine={{ stroke: '#e5e2dd' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {programs.map(prog => (
              <Area
                key={prog}
                type="monotone"
                dataKey={`${prog}_monthly`}
                stackId="1"
                stroke={PROGRAM_COLORS[prog]}
                fill={PROGRAM_COLORS[prog]}
                fillOpacity={0.6}
              />
            ))}
            <Line
              type="monotone"
              dataKey="total_benefits_monthly"
              stroke="#e85d4c"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default CombinedBenefitChart
