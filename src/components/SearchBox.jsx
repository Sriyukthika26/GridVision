import React, { useState } from 'react';
import maplibregl from 'maplibre-gl';

const SearchBox = ({ mapInstance }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [marker, setMarker] = useState(null);

    const handleSearch = async () => {
        if (!query || !mapInstance) return;
        setLoading(true);
        if (marker) marker.remove();

        try {
            // 1. COORDINATE SEARCH
            const coordMatch = query.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
            if (coordMatch) {
                gotoLocation(parseFloat(coordMatch[3]), parseFloat(coordMatch[1]), 14, "Coordinates");
                return;
            }

            // 2. DATABASE SEARCH (Checks v_grid_final names)
            const dbRes = await fetch(`http://localhost:8000/search_assets?q=${encodeURIComponent(query)}`).catch(() => null);
            if (dbRes && dbRes.ok) {
                const dbData = await dbRes.json();
                if (dbData.length > 0) {
                    gotoLocation(dbData[0].lon, dbData[0].lat, 15, `${dbData[0].name} (${dbData[0].type})`);
                    return;
                }
            }

            // 3. OSM FALLBACK
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await res.json();
            if (data.length > 0) {
                gotoLocation(parseFloat(data[0].lon), parseFloat(data[0].lat), 12, data[0].display_name);
            } else { alert("Not found"); }
        } finally { setLoading(false); }
    };

    const gotoLocation = (lon, lat, zoom, label) => {
        mapInstance.flyTo({ center: [lon, lat], zoom, essential: true });
        const newMarker = new maplibregl.Marker({ color: '#b30000' }).setLngLat([lon, lat])
            .setPopup(new maplibregl.Popup().setText(label)).addTo(mapInstance);
        setMarker(newMarker);
    };

    return (
        <div style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 2000, background: 'white', padding: '6px 10px', borderRadius: 8,
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', gap: 8
        }}>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search Asset Name or City..." style={{ border: 'none', width: 280, outline: 'none' }} />
            <button onClick={handleSearch} disabled={loading} style={{ background: '#00695c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>
                {loading ? '...' : 'GO'}
            </button>
        </div>
    );
};

export default SearchBox;