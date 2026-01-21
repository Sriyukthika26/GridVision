import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';

// Import our modular logic
import { SVGS, loadSvgIcon } from '../constants/grid-icons';
import { addMapLayers, applyFilters } from '../constants/map-layers';

const GridMap = ({ filters, onMapLoad }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (map.current) return; // Initialize only once

        const protocol = new Protocol();
        maplibregl.addProtocol('pmtiles', protocol.tile);

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'carto': {
                        type: 'raster',
                        tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap, © CARTO'
                    },
                    'grid': {
                        type: 'vector',
                        url: 'pmtiles://india_grid.pmtiles',
                        attribution: 'India Power Grid Data'
                    }
                },
                layers: [{ id: 'background', type: 'raster', source: 'carto' }]
            },
            center: [79.0, 22.5],
            zoom: 5
        });

        map.current.on('load', async () => {
            // 1. Load Icons
            await Promise.all([
                loadSvgIcon(map.current, 'icon-tower', SVGS['icon-tower']),
                loadSvgIcon(map.current, 'icon-station', SVGS['icon-station']),
                loadSvgIcon(map.current, 'icon-transformer', SVGS['icon-transformer']),
                loadSvgIcon(map.current, 'icon-compensator', SVGS['icon-compensator'])
            ]);

            // 2. Add Layers (using our imported helper)
            addMapLayers(map.current);

            // 3. Setup Interactions (Popups)
            setupInteractions(map.current);

            setIsLoaded(true);
            
            // Notify parent that map is ready (e.g. for SearchBox)
            if (onMapLoad) onMapLoad(map.current);
        });

    }, []);

    // Watch for filter changes
    useEffect(() => {
        if (isLoaded && map.current) {
            applyFilters(map.current, filters);
        }
    }, [filters, isLoaded]);

    return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
};

// Helper for Popups (kept internal as it depends on DOM events)
function setupInteractions(map) {
    const clickableLayers = ['power-lines', 'cables', 'busbars', 'substations', 'substations-fill', 'towers', 'monopoles', 'transformers', 'compensators', 'switches'];

    map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: clickableLayers });
        if (features.length > 0) {
            const feature = features[0];
            const props = feature.properties;
            const type = props.type || 'Feature';
            
            let tableRows = `<tr><td style="font-weight:bold;color:#555;padding:5px">Coordinates</td><td style="padding:5px">${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}</td></tr>`;
            Object.keys(props).sort().forEach(key => {
                if (key !== 'type' && props[key]) {
                    tableRows += `<tr><td style="font-weight:bold;color:#555;padding:5px">${key}</td><td style="padding:5px">${props[key]}</td></tr>`;
                }
            });

            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`<div style="background:#00695c;color:white;padding:8px;font-weight:bold">${type.toUpperCase()}</div><table style="font-size:12px;width:100%;border-collapse:collapse">${tableRows}</table>`)
                .addTo(map);
        }
    });

    clickableLayers.forEach(layer => {
        map.on('mouseenter', layer, () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', layer, () => map.getCanvas().style.cursor = '');
    });
}

export default GridMap;