# Configuration for TANF Calculator

# All states with TANF implementations in PolicyEngine-US
# Note: States use different program names (TANF, TAFDC, TAFI, TFA, etc.)
PILOT_STATES = {
    "CA": "California",
}

# States with working TANF implementations (all of them)
STATES_WITH_TANF = set(PILOT_STATES.keys())

# States that require county selection (affects benefit calculation)
STATES_REQUIRING_COUNTY = {"CA"}

# California counties - format: (enum_name, display_name, region)
# Region 1 = higher cost counties, Region 2 = other counties
CA_COUNTIES = [
    ("ALAMEDA_COUNTY_CA", "Alameda", 1),
    ("ALPINE_COUNTY_CA", "Alpine", 2),
    ("AMADOR_COUNTY_CA", "Amador", 2),
    ("BUTTE_COUNTY_CA", "Butte", 2),
    ("CALAVERAS_COUNTY_CA", "Calaveras", 2),
    ("COLUSA_COUNTY_CA", "Colusa", 2),
    ("CONTRA_COSTA_COUNTY_CA", "Contra Costa", 1),
    ("DEL_NORTE_COUNTY_CA", "Del Norte", 2),
    ("EL_DORADO_COUNTY_CA", "El Dorado", 2),
    ("FRESNO_COUNTY_CA", "Fresno", 2),
    ("GLENN_COUNTY_CA", "Glenn", 2),
    ("HUMBOLDT_COUNTY_CA", "Humboldt", 2),
    ("IMPERIAL_COUNTY_CA", "Imperial", 2),
    ("INYO_COUNTY_CA", "Inyo", 2),
    ("KERN_COUNTY_CA", "Kern", 2),
    ("KINGS_COUNTY_CA", "Kings", 2),
    ("LAKE_COUNTY_CA", "Lake", 2),
    ("LASSEN_COUNTY_CA", "Lassen", 2),
    ("LOS_ANGELES_COUNTY_CA", "Los Angeles", 1),
    ("MADERA_COUNTY_CA", "Madera", 2),
    ("MARIN_COUNTY_CA", "Marin", 1),
    ("MARIPOSA_COUNTY_CA", "Mariposa", 2),
    ("MENDOCINO_COUNTY_CA", "Mendocino", 2),
    ("MERCED_COUNTY_CA", "Merced", 2),
    ("MODOC_COUNTY_CA", "Modoc", 2),
    ("MONO_COUNTY_CA", "Mono", 2),
    ("MONTEREY_COUNTY_CA", "Monterey", 1),
    ("NAPA_COUNTY_CA", "Napa", 1),
    ("NEVADA_COUNTY_CA", "Nevada", 2),
    ("ORANGE_COUNTY_CA", "Orange", 1),
    ("PLACER_COUNTY_CA", "Placer", 2),
    ("PLUMAS_COUNTY_CA", "Plumas", 2),
    ("RIVERSIDE_COUNTY_CA", "Riverside", 2),
    ("SACRAMENTO_COUNTY_CA", "Sacramento", 2),
    ("SAN_BENITO_COUNTY_CA", "San Benito", 2),
    ("SAN_BERNARDINO_COUNTY_CA", "San Bernardino", 2),
    ("SAN_DIEGO_COUNTY_CA", "San Diego", 1),
    ("SAN_FRANCISCO_COUNTY_CA", "San Francisco", 1),
    ("SAN_JOAQUIN_COUNTY_CA", "San Joaquin", 2),
    ("SAN_LUIS_OBISPO_COUNTY_CA", "San Luis Obispo", 1),
    ("SAN_MATEO_COUNTY_CA", "San Mateo", 1),
    ("SANTA_BARBARA_COUNTY_CA", "Santa Barbara", 1),
    ("SANTA_CLARA_COUNTY_CA", "Santa Clara", 1),
    ("SANTA_CRUZ_COUNTY_CA", "Santa Cruz", 1),
    ("SHASTA_COUNTY_CA", "Shasta", 2),
    ("SIERRA_COUNTY_CA", "Sierra", 2),
    ("SISKIYOU_COUNTY_CA", "Siskiyou", 2),
    ("SOLANO_COUNTY_CA", "Solano", 1),
    ("SONOMA_COUNTY_CA", "Sonoma", 1),
    ("STANISLAUS_COUNTY_CA", "Stanislaus", 2),
    ("SUTTER_COUNTY_CA", "Sutter", 2),
    ("TEHAMA_COUNTY_CA", "Tehama", 2),
    ("TRINITY_COUNTY_CA", "Trinity", 2),
    ("TULARE_COUNTY_CA", "Tulare", 2),
    ("TUOLUMNE_COUNTY_CA", "Tuolumne", 2),
    ("VENTURA_COUNTY_CA", "Ventura", 1),
    ("YOLO_COUNTY_CA", "Yolo", 2),
    ("YUBA_COUNTY_CA", "Yuba", 2),
]

# States that may have county-dependent benefit levels
# TODO: NY, VA, and other states may have county-dependent benefit levels

# Default year for calculations
DEFAULT_YEAR = 2025
