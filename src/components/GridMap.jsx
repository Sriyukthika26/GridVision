import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SVGS, loadSvgIcon } from '../constants/grid-icons';
import { addMapLayers, applyFilters } from '../constants/map-layers';

const GridMap = ({ filters, onMapLoad }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (mapRef.current) return;

        // 1. Initialize with just the Base Map
        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    carto: {
                        type: "raster",
                        tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"],
                        tileSize: 256,
                        attribution: "© OpenStreetMap © CARTO"
                    }
                },
                layers: [
                    { id: "carto-base", type: "raster", source: "carto" }
                ]
            },
            center: [79.0, 22.5], // India Center
            zoom: 5
        });

        mapRef.current = map;

        // 2. LOAD DATA & ICONS (Only after base map is ready)
        map.on("load", async () => {
            console.log("Base Map Loaded. Injecting Grid Data...");

            // A. Add Vector Source
            map.addSource("grid", {
                type: "vector",
                tiles: ["http://localhost:7800/public.v_grid_final/{z}/{x}/{y}.pbf"],
                minzoom: 0,
                maxzoom: 14
            });

            // B. Load Icons Async
            try {
                await Promise.all([
                    loadSvgIcon(map, 'icon-tower', SVGS['icon-tower']),
                    loadSvgIcon(map, 'icon-monopole', SVGS['icon-monopole']),
                    loadSvgIcon(map, 'icon-station', SVGS['icon-station']),
                    loadSvgIcon(map, 'icon-transformer', SVGS['icon-transformer']),
                    loadSvgIcon(map, 'icon-compensator', SVGS['icon-compensator'])
                ]);
                console.log("Icons Loaded");
            } catch (err) {
                console.error("Icon loading failed:", err);
            }

            // C. Add Layers & Interactions
            addMapLayers(map);
            setupInteractions(map);

            setLoaded(true);
            if (onMapLoad) onMapLoad(map);
        });

        // Cleanup
        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // 3. Handle Filters
    useEffect(() => {
        if (loaded && mapRef.current) {
            applyFilters(mapRef.current, filters);
        }
    }, [filters, loaded]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <div 
                ref={mapContainer} 
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%',
                }} 
            />
        </div>
    );
};

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
function toDMS(coord, type) {
    const abs = Math.abs(coord);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = Math.floor((((abs - deg) * 60) - min) * 60);
    const dir = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${deg}°${min}'${sec}" ${dir}`;
}

function setupInteractions(map) {
    const clickable = [
    'power-lines', 
    'busbars', 
    'substations-fill', 
    'substations',      
    'towers', 
    'monopoles', 
    'transformers', 
    'switches'
];

    // 1. Change Cursor on Hover
    clickable.forEach(layer => {
        if (map.getLayer(layer)) {
             map.on('mouseenter', layer, () => map.getCanvas().style.cursor = 'pointer');
             map.on('mouseleave', layer, () => map.getCanvas().style.cursor = '');
        }
    });

    // 2. Click Handler
    map.on('click', (e) => {
        // Filter out layers that don't exist yet to prevent errors
        const validLayers = clickable.filter(id => map.getLayer(id));
        
        // Query only the valid layers
        const features = map.queryRenderedFeatures(e.point, { layers: validLayers });
        
        if (!features.length) return;

        const f = features[0];
        const p = f.properties;
        const lat = e.lngLat.lat;
        const lng = e.lngLat.lng;

        // --- DEFINE DATA VARIABLES ---
        const title = (p.name || p.official_name || 'Unnamed Asset');
        const assetType = (p.type || 'Asset').replace('_', ' ').toUpperCase();
        const voltage = p.voltage && p.voltage > 0 ? `${p.voltage} kV` : 'Unknown Voltage';
        
        let sourceTag = p.voltage_src || 'Unknown';
        if (p.is_synthetic) sourceTag = 'Synthetic Bridge';

        // --- FIX: DEFINE THE URL HERE ---
        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        const popupHTML = `
            <div style="font-family:Segoe UI, sans-serif; width:260px">
                <div style="background:#1a237e;color:#fff;padding:10px;border-radius:4px 4px 0 0">
                    <div style="font-size:10px;text-transform:uppercase;opacity:.8">${assetType}</div>
                    <div style="font-size:14px;font-weight:700">${title}</div>
                </div>
                <div style="padding:10px;font-size:13px;line-height:1.5">
                    <div><b>Voltage:</b> ${voltage}</div>
                    <div><b>Source:</b> <span style="color:${p.is_synthetic ? '#ff00d4' : '#000'}">${sourceTag}</span></div>
                    
                    <div style="margin-top:8px; padding-top:8px; border-top:1px solid #eee; display:flex; justify-content:space-between; align-items:center">
                        <div style="font-size:11px;color:#666">
                            📍 ${toDMS(lat, 'lat')}, ${toDMS(lng, 'lng')}
                        </div>
                        <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" 
                           style="color:#1a237e; text-decoration:none; font-weight:bold; font-size:11px; border:1px solid #1a237e; padding:2px 6px; border-radius:4px">
                           OPEN MAP ↗
                        </a>
                    </div>
                </div>
            </div>
        `;

        new maplibregl.Popup({ closeButton: false, offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(popupHTML)
            .addTo(map);
    });
}

export default GridMap;