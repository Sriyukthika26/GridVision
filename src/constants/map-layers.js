// constants/map-layers.jsx

const SOURCE_LAYER = 'public.v_grid_final'; 

export function addMapLayers(map) {
    
    // -----------------------------------------------------------------------
    // 1. SUBSTATION POLYGONS
    // -----------------------------------------------------------------------
    map.addLayer({
        id: 'substations-fill',
        type: 'fill',
        source: 'grid',
        'source-layer': SOURCE_LAYER,
        filter: ['==', ['get', 'type'], 'Substation_Area'], 
        paint: { 'fill-color': '#c0c0c0', 'fill-opacity': 0.6 }
    });
    
    map.addLayer({
        id: 'substations-outline',
        type: 'line',
        source: 'grid',
        'source-layer': SOURCE_LAYER,
        filter: ['==', ['get', 'type'], 'Substation_Area'], 
        paint: { 'line-color': '#666', 'line-width': 1, 'line-opacity': 0.8 }
    });

    // -----------------------------------------------------------------------
    // 2. BUSBARS
    // -----------------------------------------------------------------------
    map.addLayer({
        id: 'busbars',
        type: 'line',
        source: 'grid',
        'source-layer': SOURCE_LAYER,
        filter: ['==', ['get', 'type'], 'Busbar'], 
        minzoom: 11,
        paint: {
            'line-color': '#333',
            'line-width': 2.0
        }
    });

    // -----------------------------------------------------------------------
    // 3. POWER LINES (The Fix for Grey Lines)
    // -----------------------------------------------------------------------
    map.addLayer({
        id: 'power-lines',
        type: 'line',
        source: 'grid',
        'source-layer': SOURCE_LAYER,
        // Broad filter to catch Line, Synthetic, Cable, AND anything else that acts as a line
        filter: ['match', ['get', 'type'], ['Line', 'synthetic', 'Cable'], true, false], 
        paint: {
            'line-color': [
                'case',
                // Priority 1: Synthetic (Pink)
                ['==', ['get', 'type'], 'synthetic'], '#ff00d4',
                ['==', ['get', 'is_synthetic'], true], '#ff00d4',

                // Priority 2: Underground Cables (Dark Grey)
                ['==', ['get', 'type'], 'Cable'], '#555',

                // Priority 3: STANDARD VOLTAGES
                ['match', ['to-string', ['get', 'voltage']],
                    '765', '#6a0dad', 
                    '400', '#b30000', 
                    '220', '#ff8c00', 
                    '132', '#006400', 
                    '110', '#32CD32', 
                    '66',  '#0000FF', 
                    '#999' 
                ]
            ],
            'line-width': [
                'interpolate', ['linear'], ['zoom'], 
                4, 1.2, 
                8, 2, 
                14, 4 
            ],
            'line-offset': [
                'case', 
                ['==', ['%', ['to-number', ['coalesce', ['id'], 0]], 2], 0], 
                1.5, -1.5
            ],
            'line-opacity': [
                'interpolate', ['linear'], ['zoom'],
                4, 1.0, 
                10, 0.8
            ],
            'line-dasharray': [
                'step', ['zoom'],
                ['literal', [1, 0]], 7, 
                [
                    'case',
                    ['==', ['get', 'type'], 'synthetic'], ['literal', [2, 2]], 
                    ['==', ['get', 'type'], 'Cable'], ['literal', [3, 2]],
                    ['!=', ['get', 'voltage_src'], 'OSM'], ['literal', [3, 1]], 
                    ['literal', [1, 0]]
                ]
            ]
        }
    });

    // -----------------------------------------------------------------------
    // 4. POINT LAYERS
    // -----------------------------------------------------------------------
    map.addLayer({
        id: 'switches',
        type: 'circle',
        source: 'grid',
        'source-layer': SOURCE_LAYER,
        filter: ['match', ['get', 'type'], ['Switch', 'Circuit Breaker', 'Disconnector'], true, false],
        minzoom: 13,
        paint: { 'circle-radius': 3, 'circle-color': '#fff', 'circle-stroke-width': 1, 'circle-stroke-color': '#000' }
    });

    map.addLayer({
        id: 'monopoles',
        type: 'circle',
        source: 'grid',
        'source-layer': SOURCE_LAYER,
        filter: ['==', ['get', 'type'], 'Monopole_HV'],
        minzoom: 11,
        paint: { 'circle-radius': 3, 'circle-color': '#444', 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' }
    });

    // -----------------------------------------------------------------------
    // 5. ICON LAYERS
    // -----------------------------------------------------------------------
    const iconAssets = [
        { id: 'transformers',  type: 'Transformer',     icon: 'icon-transformer', size: 0.5, minz: 11 },
        { id: 'compensators',  type: 'Compensator',     icon: 'icon-compensator', size: 0.5, minz: 11 },
        { id: 'towers',        type: 'Tower',           icon: 'icon-tower',       size: 0.6, minz: 10 },
        { id: 'substations',   type: 'Substation_Icon', icon: 'icon-station',     size: 0.7, minz: 6 },
    ];

    iconAssets.forEach(l => {
        map.addLayer({
            id: l.id,
            type: 'symbol',
            source: 'grid',
            'source-layer': SOURCE_LAYER,
            filter: ['==', ['get', 'type'], l.type], 
            minzoom: l.minz,
            layout: {
                'visibility': 'visible',
                'icon-image': l.icon,
                'icon-size': ['interpolate', ['linear'], ['zoom'], l.minz, l.size * 0.8, 16, l.size * 1.5],
                'icon-allow-overlap': true,
                'icon-ignore-placement': true 
            },
            paint: {
                'icon-opacity': ['case', ['==', ['get', 'voltage_src'], 'OSM'], 1.0, 0.8]
            }
        });
    });
}


export function applyFilters(map, filters) {
    if (!map || !filters) return;

    const highVoltages = ['765', '400', '220', '132', '110', '66'];
    const activeHighVolts = highVoltages.filter(v => filters[v]);
    
    const showOther = filters['Other / Distribution'] || filters['Other'] || filters['Distribution'] || filters['Low/Unknown'];

    const voltageFilter = ['any'];

    if (activeHighVolts.length > 0) {
        voltageFilter.push(['match', ['to-string', ['get', 'voltage']], activeHighVolts, true, false]);
    }

    if (showOther) {
        voltageFilter.push([
            '!', 
            ['match', ['to-string', ['get', 'voltage']], highVoltages, true, false]
        ]);
    }

    const finalVoltFilter = voltageFilter.length > 1 ? voltageFilter : ['==', '1', '0'];


    // 2. TRUST FILTER
    const trustConditions = ['any'];
    if (filters['Authoritative (OSM)'] || filters['OSM']) {
        trustConditions.push([
            'any',
            ['==', ['get', 'voltage_src'], 'OSM'],
            ['!', ['has', 'voltage_src']], 
            ['==', ['get', 'voltage_src'], null]
        ]);
    }
    if (filters['Inferred (GridVision)'] || filters['Inferred']) {
        trustConditions.push(['match', ['get', 'voltage_src'], ['Graph-Inferred', 'Inferred-from-Line', 'Inferred-from-Node'], true, false]);
    }
    if (filters['Synthetic Bridges'] || filters['Synthetic']) {
        trustConditions.push([
            'any',
            ['==', ['get', 'is_synthetic'], true],
            ['==', ['get', 'type'], 'synthetic']
        ]);
    }
    const finalTrustFilter = trustConditions.length > 1 ? trustConditions : ['==', '1', '0'];


    // 3. APPLY TO POWER LINES & BUSBARS
    const finalFilter = ['all', finalVoltFilter, finalTrustFilter];

    if (map.getLayer('power-lines')) {
        map.setFilter('power-lines', ['all', ['match', ['get', 'type'], ['Line', 'Cable', 'synthetic'], true, false], finalFilter]);
    }
    if (map.getLayer('busbars')) {
        map.setFilter('busbars', ['all', ['match', ['get', 'type'], ['Busbar'], true, false], finalFilter]);
    }

    // 4. LAYER VISIBILITY
    const assetMap = {
        'Tower': 'towers',
        'Monopole_HV': 'monopoles',
        'Transformer': 'transformers',
        'Compensator': 'compensators',
        'Switch': 'switches',
        'Cable': 'cables',
        'Substation_Icon': ['substations', 'substations-fill', 'substations-outline']
    };

    Object.keys(assetMap).forEach(key => {
        const isVisible = (filters[key] !== false); 
        const visibility = isVisible ? 'visible' : 'none';
        
        const layers = Array.isArray(assetMap[key]) ? assetMap[key] : [assetMap[key]];
        
        layers.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.setLayoutProperty(layerId, 'visibility', visibility);
            }
        });
    });
}