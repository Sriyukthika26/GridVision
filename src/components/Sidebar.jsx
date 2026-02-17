import React, { useState } from 'react';
import { SVGS } from '../constants/grid-icons';

const Sidebar = ({ filters, setFilters }) => {
    const [sections, setSections] = useState({
        voltages: true,
        trust: true,
        infra: true,
        equip: true
    });

    const toggleSection = (id) => {
        setSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCheck = (key) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const styles = {
        header: {
            background: '#e0f2f1',
            color: '#00695c',
            padding: 12,
            fontWeight: 'bold',
            fontSize: 11,
            letterSpacing: '0.5px',
            borderBottom: '1px solid #b2dfdb',
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            justifyContent: 'space-between'
        },
        item: {
            display: 'flex',
            alignItems: 'center',
            margin: '4px 0',
            fontSize: 12,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background 0.2s'
        },
        icon: {
            width: 18,
            height: 18,
            marginRight: 10,
            verticalAlign: 'middle',
            display: 'inline-block'
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 10, right: 10, width: 260,
            background: 'rgba(255, 255, 255, 0.95)', borderRadius: 6,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 1000,
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid #ddd',
            fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
        }}>
            
            {/* --- VOLTAGES --- */}
            <div style={styles.header} onClick={() => toggleSection('voltages')}>
                <span> VOLTAGE LEVELS</span>
                <span>{sections.voltages ? '−' : '+'}</span>
            </div>
            {sections.voltages && (
                <div style={{ padding: '8px 4px', borderBottom: '1px solid #eee' }}>
                    {[
                        { k: '765', c: '#6a0dad' },
                        { k: '400', c: '#b30000' },
                        { k: '220', c: '#ff8c00' },
                        { k: '132', c: '#006400' },
                        { k: '110', c: '#32CD32' },
                        { k: '66',  c: '#0000FF' },
                        { k: 'Low/Unknown', c: '#999', label: 'Other / Distribution' }
                    ].map(v => (
                        <label key={v.k} style={styles.item} className="filter-item">
                            <input type="checkbox" checked={!!filters[v.k]} onChange={() => handleCheck(v.k)} style={{ marginRight: 10 }} />
                            <span style={{ width: 12, height: 12, marginRight: 8, background: v.c, border: '1px solid #666', borderRadius: '2px' }} />
                            {v.label || `${v.k} kV`}
                        </label>
                    ))}
                </div>
            )}

            {/* --- DATA TRUST / SOURCE --- */}
            <div style={styles.header} onClick={() => toggleSection('trust')}>
                <span> DATA PROVENANCE</span>
                <span>{sections.trust ? '−' : '+'}</span>
            </div>
            {sections.trust && (
                <div style={{ padding: '8px 4px', borderBottom: '1px solid #eee' }}>
                    {[
                        { k: 'OSM'  , label: 'Authoritative (OSM)' },
                        { k: 'Inferred', label: 'Inferred (GridVision)' },
                        { k: 'Synthetic', c: '#ff00d4', label: 'Synthetic Bridges' }
                    ].map(v => (
                        <label key={v.k} style={styles.item}>
                            <input type="checkbox" checked={filters[v.k] !== false} onChange={() => handleCheck(v.k)} style={{ marginRight: 10 }} />
                            <span style={{ 
                                width: 12, height: 12, marginRight: 8, background: v.c, 
                                border: v.k === 'Inferred' ? '1px dashed #000' : '1px solid #000' 
                            }} />
                            {v.label}
                        </label>
                    ))}
                </div>
            )}

            {/* --- INFRASTRUCTURE --- */}
            <div style={styles.header} onClick={() => toggleSection('infra')}>
                <span> INFRASTRUCTURE</span>
                <span>{sections.infra ? '−' : '+'}</span>
            </div>
            {sections.infra && (
                <div style={{ padding: '8px 4px', borderBottom: '1px solid #eee' }}>
                    {[
                        { k: 'Substation_Icon', label: 'Substations', icon: 'icon-station' },
                        { k: 'Tower', label: 'Lattice Towers', icon: 'icon-tower' },
                        { k: 'Monopole_HV', label: 'Monopoles', icon: 'icon-monopole' }
                    ].map(item => (
                        <label key={item.k} style={styles.item}>
                            <input type="checkbox" checked={!!filters[item.k]} onChange={() => handleCheck(item.k)} style={{ marginRight: 10 }} />
                            <img src={`data:image/svg+xml;utf8,${encodeURIComponent(SVGS[item.icon])}`} style={styles.icon} alt="" />
                            {item.label}
                        </label>
                    ))}
                    <label style={styles.item}>
                        <input type="checkbox" checked={!!filters['Cable']} onChange={() => handleCheck('Cable')} style={{ marginRight: 10 }} />
                        <span style={{ width: 16, height: 0, borderBottom: '2px dashed #555', marginRight: 10 }} />
                        Underground Cables
                    </label>
                </div>
            )}

            {/* --- EQUIPMENT --- */}
            <div style={styles.header} onClick={() => toggleSection('equip')}>
                <span> GRID EQUIPMENT</span>
                <span>{sections.equip ? '−' : '+'}</span>
            </div>
            {sections.equip && (
                <div style={{ padding: '8px 4px' }}>
                    {[
                        { k: 'Transformer', label: 'Transformers', icon: 'icon-transformer' },
                        { k: 'Compensator', label: 'Compensators', icon: 'icon-compensator' }
                    ].map(item => (
                        <label key={item.k} style={styles.item}>
                            <input type="checkbox" checked={!!filters[item.k]} onChange={() => handleCheck(item.k)} style={{ marginRight: 10 }} />
                            <img src={`data:image/svg+xml;utf8,${encodeURIComponent(SVGS[item.icon])}`} style={styles.icon} alt="" />
                            {item.label}
                        </label>
                    ))}
                    <label style={styles.item}>
                        <input type="checkbox" checked={!!filters['Switch']} onChange={() => handleCheck('Switch')} style={{ marginRight: 10 }} />
                        <span style={{ width: 8, height: 8, border: '2px solid #b30000', borderRadius: '50%', background: '#fff', marginRight: 10 }} />
                        Switchgear
                    </label>
                    <label style={styles.item}>
                        <input type="checkbox" checked={!!filters['Busbar']} onChange={() => handleCheck('Busbar')} style={{ marginRight: 10 }} />
                        <span style={{ width: 14, height: 3, background: '#000', marginRight: 10 }} />
                        Busbars
                    </label>
                </div>
            )}
        </div>
    );
};

export default Sidebar;