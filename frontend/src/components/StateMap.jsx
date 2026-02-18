import { useState, memo, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

// US TopoJSON
const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

// FIPS code to state code mapping
const FIPS_TO_STATE = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY',
}

// State code to name for tooltip
const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
  'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
  'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
  'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
  'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
  'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
  'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
  'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
}

// Heatmap color scale (teal-based)
const HEATMAP_COLORS = [
  '#f0fdfa', // 0% - lightest
  '#ccfbf1',
  '#99f6e4',
  '#5eead4',
  '#2dd4bf',
  '#14b8a6',
  '#0d9488',
  '#0f766e',
  '#115e59',
  '#134e4a', // 100% - darkest
]

function StateMap({ selectedState, availableStates, onStateSelect, comparisonData, maxBenefit }) {
  const [hoveredState, setHoveredState] = useState(null)

  // Create a set of available state codes for quick lookup
  const availableSet = new Set(availableStates.map(s => s.code))

  // Create a map of state -> benefit data for quick lookup
  const benefitMap = useMemo(() => {
    if (!comparisonData) return {}
    const map = {}
    comparisonData.forEach(item => {
      map[item.state] = item
    })
    return map
  }, [comparisonData])

  const isHeatmapMode = comparisonData && comparisonData.length > 0 && maxBenefit > 0

  // Get color for heatmap mode based on benefit amount
  const getHeatmapColor = (stateCode) => {
    const data = benefitMap[stateCode]
    if (!data || data.tanf_monthly <= 0) {
      return '#f0ede8' // No benefit - cream
    }
    const ratio = data.tanf_monthly / maxBenefit
    const index = Math.min(Math.floor(ratio * HEATMAP_COLORS.length), HEATMAP_COLORS.length - 1)
    return HEATMAP_COLORS[index]
  }

  const getStateColor = (stateCode) => {
    if (isHeatmapMode) {
      return getHeatmapColor(stateCode)
    }
    // Default mode colors
    if (stateCode === selectedState) {
      return '#0f766e' // Selected state - dark teal
    }
    if (availableSet.has(stateCode)) {
      return '#5eead4' // Available state - light teal
    }
    return '#f0ede8' // Unavailable state - cream
  }

  const getHoverColor = (stateCode) => {
    if (isHeatmapMode) {
      const data = benefitMap[stateCode]
      if (!data || data.tanf_monthly <= 0) {
        return '#e5e2dd'
      }
      // Slightly darker on hover
      const ratio = data.tanf_monthly / maxBenefit
      const index = Math.min(Math.floor(ratio * HEATMAP_COLORS.length) + 1, HEATMAP_COLORS.length - 1)
      return HEATMAP_COLORS[index]
    }
    // Default mode hover colors
    if (stateCode === selectedState) {
      return '#0d9488'
    }
    if (availableSet.has(stateCode)) {
      return '#2dd4bf'
    }
    return '#e5e2dd'
  }

  const handleClick = (stateCode) => {
    if (availableSet.has(stateCode)) {
      onStateSelect(stateCode)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get tooltip content
  const getTooltipContent = () => {
    if (!hoveredState) return null

    const stateName = STATE_NAMES[hoveredState]
    const isAvailable = availableSet.has(hoveredState)

    if (isHeatmapMode && isAvailable) {
      const data = benefitMap[hoveredState]
      if (data) {
        return (
          <>
            <strong>{stateName}</strong>
            <span className="benefit-amount">
              {data.tanf_monthly > 0 ? formatCurrency(data.tanf_monthly) + '/mo' : 'Not eligible'}
            </span>
          </>
        )
      }
    }

    return (
      <>
        <strong>{stateName}</strong>
        {!isAvailable && <span className="unavailable-text"> (Coming soon)</span>}
      </>
    )
  }

  return (
    <div className="state-map-container">
      <div className="map-wrapper">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1100 }}
          width={800}
          height={500}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateCode = FIPS_TO_STATE[geo.id]
                if (!stateCode) return null

                const isAvailable = availableSet.has(stateCode)
                const isSelected = stateCode === selectedState
                const isHovered = stateCode === hoveredState

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isHovered ? getHoverColor(stateCode) : getStateColor(stateCode)}
                    stroke={isSelected ? '#1a2744' : '#fff'}
                    strokeWidth={isSelected ? 2.5 : 0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', cursor: isAvailable ? 'pointer' : 'not-allowed' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={() => setHoveredState(stateCode)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => handleClick(stateCode)}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      <div className="map-tooltip">
        {getTooltipContent() || <span style={{ opacity: 0.5 }}>Hover over a state</span>}
      </div>

      {/* Legend - different for heatmap mode */}
      {isHeatmapMode ? (
        <div className="heatmap-legend">
          <span className="legend-label">Lower benefit</span>
          <div className="gradient-bar">
            {HEATMAP_COLORS.map((color, i) => (
              <div key={i} className="gradient-step" style={{ background: color }} />
            ))}
          </div>
          <span className="legend-label">Higher benefit</span>
        </div>
      ) : (
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-color selected"></span>
            <span>Selected</span>
          </div>
          <div className="legend-item">
            <span className="legend-color available"></span>
            <span>Available</span>
          </div>
          <div className="legend-item">
            <span className="legend-color unavailable"></span>
            <span>Coming Soon</span>
          </div>
        </div>
      )}

      {/* Selected state display */}
      <div className="selected-state-display">
        Selected: <strong>{STATE_NAMES[selectedState] || 'None'}</strong>
        {isHeatmapMode && benefitMap[selectedState] && (
          <span className="selected-benefit">
            {formatCurrency(benefitMap[selectedState].tanf_monthly)}/mo
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(StateMap)
