// Adds visual layers to the map
export function addMapLayers(map) {
    // 1. Substation Background (Grey Area)
    map.addLayer({
        id: 'substations-fill',
        type: 'fill',
        source: 'grid',
        'source-layer': 'grid',
        filter: ['==', ['get', 'type'], 'Substation_Area'],
        paint: { 'fill-color': '#c0c0c0', 'fill-opacity': 0.6 }
    });
    map.addLayer({
        id: 'substations-outline',
        type: 'line',
        source: 'grid',
        'source-layer': 'grid',
        filter: ['==', ['get', 'type'], 'Substation_Area'],
        paint: { 'line-color': '#666', 'line-width': 1, 'line-opacity': 0.8 }
    });

    // 2. Busbars
    map.addLayer({
        id: 'busbars',
        type: 'line',
        source: 'grid',
        'source-layer': 'grid',
        filter: ['==', ['get', 'type'], 'Busbar'],
        minzoom: 11,
        paint: {
            'line-color': [
                'match', ['to-string', ['get', 'voltage']],
                '765', '#6a0dad', '400', '#b30000', '220', '#ff8c00', 
                '132', '#006400', '110', '#32CD32', '66', '#0000FF', '#333'
            ],
            'line-width': 2.5
        }
    });

    // 3. Power Lines 
    map.addLayer({
        id: 'power-lines',
        type: 'line',
        source: 'grid',
        'source-layer': 'grid',
        filter: ['==', ['get', 'type'], 'Line'],
        paint: {
            'line-color': [
                'match', ['to-string', ['get', 'voltage']],
                '765', '#6a0dad', '400', '#b30000', '220', '#ff8c00', 
                '132', '#006400', '110', '#32CD32', '66', '#0000FF', '#999'
            ],
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 2.5],
            'line-offset': ['case', ['==', ['%', ['to-number', ['id']], 2], 0], 1.5, -1.5]
        }
    });

    // 4. Cables
    map.addLayer({
        id: 'cables',
        type: 'line',
        source: 'grid',
        'source-layer': 'grid',
        filter: ['==', ['get', 'type'], 'Cable'],
        paint: { 'line-color': '#555', 'line-width': 1.5, 'line-dasharray': [3, 2] }
    });

    // 5. Generic Switches
    map.addLayer({
        id: 'switches',
        type: 'circle',
        source: 'grid',
        'source-layer': 'grid',
        filter: ['==', ['get', 'type'], 'Switch'],
        minzoom: 14,
        paint: { 'circle-radius': 2.5, 'circle-color': '#fff', 'circle-stroke-width': 1, 'circle-stroke-color': '#000' }
    });

    // 6. Monopoles
    map.addLayer({
        id: 'monopoles',
        type: 'circle',
        source: 'grid',
        'source-layer': 'grid',
        filter: ['==', ['get', 'type'], 'Monopole_HV'],
        minzoom: 11,
        paint: { 'circle-radius': 2.5, 'circle-color': '#444', 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' }
    });

    // 7. Icon Layers 
    const iconLayers = [
        { id: 'transformers', filter: 'Transformer', icon: 'icon-transformer', size: 0.35, minz: 11 },
        { id: 'compensators', filter: 'Compensator', icon: 'icon-compensator', size: 0.35, minz: 11 },
        { id: 'towers', filter: 'Tower', icon: 'icon-tower', size: 0.3, minz: 12 },
        { id: 'substations', filter: 'Substation_Icon', icon: 'icon-station', size: 0.5, minz: 6 },
    ];

    iconLayers.forEach(l => {
        map.addLayer({
            id: l.id,
            type: 'symbol',
            source: 'grid',
            'source-layer': 'grid',
            filter: ['match', ['get', 'type'], [l.filter, l.filter.toLowerCase()], true, false],
            minzoom: l.minz,
            layout: {
                'visibility': 'visible',
                'icon-image': l.icon,
                'icon-size': ['interpolate', ['linear'], ['zoom'], l.minz, l.size * 0.5, 16, l.size],
                'icon-allow-overlap': true
            }
        });
    });
}

// Applies the Sidebar filters to the map layers
export function applyFilters(map, filters) {
    const voltageFilter = ['any'];
    const knownVoltages = ['765', '400', '220', '132', '110', '66'];
    
    // Build Voltage Filter
    knownVoltages.forEach(v => {
        if (filters[v]) voltageFilter.push(['==', ['to-string', ['get', 'voltage']], v]);
    });

    if (filters['Low/Unknown']) {
        voltageFilter.push([
            'all',
            ['!', ['in', ['to-string', ['get', 'voltage']], ['literal', knownVoltages]]],
            ['!=', ['to-string', ['get', 'voltage']], '33'],
            ['!=', ['to-string', ['get', 'voltage']], '11'],
            ['!=', ['to-string', ['get', 'voltage']], '0.4'],
            ['!=', ['get', 'usage'], 'distribution']
        ]);
    }

    const finalVoltFilter = voltageFilter.length > 1 ? voltageFilter : ['==', '1', '0']; // '1'=='0' is always false (hide all)

    // Apply to Lines & Busbars
    if(map.getLayer('power-lines')) map.setFilter('power-lines', ['all', ['==', ['get', 'type'], 'Line'], finalVoltFilter]);
    if(map.getLayer('busbars')) map.setFilter('busbars', ['all', ['==', ['get', 'type'], 'Busbar'], finalVoltFilter]);

    // Apply Visibility (Show/Hide) to other layers
    const layerMap = {
        'Tower': 'towers',
        'Monopole_HV': 'monopoles',
        'Transformer': 'transformers',
        'Compensator': 'compensators',
        'Switch': 'switches',
        'Cable': 'cables',
        'Substation_Icon': ['substations', 'substations-fill', 'substations-outline']
    };

    Object.keys(layerMap).forEach(key => {
        const targets = Array.isArray(layerMap[key]) ? layerMap[key] : [layerMap[key]];
        const visibility = filters[key] ? 'visible' : 'none';
        
        targets.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.setLayoutProperty(layerId, 'visibility', visibility);
            }
        });
    });
}