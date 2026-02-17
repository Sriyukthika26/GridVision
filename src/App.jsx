import React, { useState } from 'react';
import GridMap from './components/GridMap';
import Sidebar from './components/Sidebar';
import SearchBox from './components/SearchBox';

function App() {
    // 1. STATE: Holds the filter settings
    const [filters, setFilters] = useState({
        // -------------------------
        // Voltage values
        // -------------------------
        "765": true,
        "400": true,
        "220": true,
        "132": true,
        "110": true,
        "66": true,
        "Low/Unknown": true,

        // -------------------------
        // Voltage provenance / trust
        // -------------------------
        "OSM": true,
        "Inferred": true,
        "Synthetic": true,
        "Unknown": true,

        // -------------------------
        // Infrastructure
        // -------------------------
        "Tower": false,
        "Monopole_HV": false,
        "Substation_Icon": true,
        "Cable": true,

        // -------------------------
        // Equipment
        // -------------------------
        "Transformer": true,
        "Compensator": true,
        "Switch": false,
        "Busbar": false
    });

    // 2. STATE: Reference to the map instance (needed for SearchBox)
    const [mapInstance, setMapInstance] = useState(null);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            
            {/* SEARCH */}
            <SearchBox mapInstance={mapInstance} />

            {/* SIDEBAR */}
            <Sidebar filters={filters} setFilters={setFilters} />
            
            {/* MAP */}
            <GridMap 
                filters={filters} 
                onMapLoad={(map) => setMapInstance(map)} 
            />
        </div>
    );
}

export default App;