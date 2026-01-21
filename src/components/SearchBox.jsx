import React, { useState } from 'react';
import maplibregl from 'maplibre-gl';

const SearchBox = ({ mapInstance }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query || !mapInstance) return;
        setLoading(true);

        try {
            // 1. Coordinate Search
            const coordMatch = query.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
            if (coordMatch) {
                const lat = parseFloat(coordMatch[1]);
                const lon = parseFloat(coordMatch[3]);
                
                if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    alert("Invalid coordinates");
                } else {
                    mapInstance.flyTo({ center: [lon, lat], zoom: 12, essential: true });
                    new maplibregl.Marker().setLngLat([lon, lat]).addTo(mapInstance);
                }
            } 
            // 2. Nominatim Search
            else {
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error("Network Error");
                
                const data = await response.json();
                if (data && data.length > 0) {
                    const place = data[0];
                    const bbox = place.boundingbox;
                    if (bbox) {
                        mapInstance.fitBounds([
                            [parseFloat(bbox[2]), parseFloat(bbox[0])],
                            [parseFloat(bbox[3]), parseFloat(bbox[1])]
                        ], { padding: 50, maxZoom: 14 });
                    } else {
                        mapInstance.flyTo({ center: [parseFloat(place.lon), parseFloat(place.lat)], zoom: 12 });
                    }
                } else {
                    alert("Location not found");
                }
            }
        } catch (e) {
            console.error(e);
            alert("Search failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 2000, background: 'white', padding: 8, borderRadius: 4,
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)', display: 'flex', gap: 5
        }}>
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search place or lat,lon..." 
                style={{ border: '1px solid #ccc', padding: 6, borderRadius: 3, width: 250 }}
            />
            <button 
                onClick={handleSearch} 
                disabled={loading}
                style={{
                    background: '#00695c', color: 'white', border: 'none',
                    padding: '6px 12px', borderRadius: 3, cursor: 'pointer', fontWeight: 'bold'
                }}
            >
                {loading ? '...' : 'Go'}
            </button>
        </div>
    );
};

export default SearchBox;