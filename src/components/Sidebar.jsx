import React, { useState } from 'react';
import { SVGS } from '../constants/grid-icons';

const Sidebar = ({ filters, setFilters }) => {
    const [sections, setSections] = useState({ voltages: true, infra: true, equip: true });

    const toggleSection = (id) => {
        setSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCheck = (key) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Helper for styles
    const styles = {
        header: { background: '#e0f2f1', color: '#00695c', padding: 12, fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #b2dfdb', cursor: 'pointer', userSelect: 'none' },
        item: { display: 'flex', alignItems: 'center', margin: '6px 0', fontSize: 13, cursor: 'pointer', padding: 4 },
        icon: { width: 20, height: 20, marginRight: 8, verticalAlign: 'middle', display: 'inline-block' }
    };

    return (
        <div style={{
            position: 'absolute', top: 10, right: 10, width: 280,
            background: 'rgba(255, 255, 255, 0.98)', borderRadius: 4,
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 1000,
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid #ccc'
        }}>
            {/* VOLTAGES */}
            <div style={styles.header} onClick={() => toggleSection('voltages')}>▼ POWER GRID (VOLTAGES)</div>
            {sections.voltages && <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                {[
                    { k: '765', c: '#6a0dad' }, { k: '400', c: '#b30000' }, { k: '220', c: '#ff8c00' },
                    { k: '132', c: '#006400' }, { k: '110', c: '#32CD32' }, { k: '66', c: '#0000FF' },
                    { k: 'Low/Unknown', c: '#999', label: 'Other / Untagged (HV)' }
                ].map(v => (
                    <label key={v.k} style={styles.item}>
                        <input type="checkbox" checked={filters[v.k]} onChange={() => handleCheck(v.k)} style={{ marginRight: 10 }} />
                        <span style={{ width: 14, height: 14, marginRight: 8, background: v.c, border: '1px solid #999' }}></span>
                        {v.label || `${v.k} kV`}
                    </label>
                ))}
            </div>}

            {/* INFRASTRUCTURE */}
            <div style={styles.header} onClick={() => toggleSection('infra')}>▼ INFRASTRUCTURE</div>
            {sections.infra && <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <label style={styles.item}>
                    <input type="checkbox" checked={filters['Substation_Icon']} onChange={() => handleCheck('Substation_Icon')} style={{ marginRight: 10 }} />
                    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(SVGS['icon-station'])}`} style={styles.icon} alt="" /> Substations
                </label>
                <label style={styles.item}>
                    <input type="checkbox" checked={filters['Tower']} onChange={() => handleCheck('Tower')} style={{ marginRight: 10 }} />
                    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(SVGS['icon-tower'])}`} style={styles.icon} alt="" /> Towers
                </label>
                <label style={styles.item}>
                    <input type="checkbox" checked={filters['Monopole_HV']} onChange={() => handleCheck('Monopole_HV')} style={{ marginRight: 10 }} />
                    <span style={{...styles.icon, width:10, height:10, borderRadius:'50%', background:'#444', border:'1px solid #fff'}}></span> Monopoles
                </label>
                <label style={styles.item}>
                    <input type="checkbox" checked={filters['Cable']} onChange={() => handleCheck('Cable')} style={{ marginRight: 10 }} />
                    <span style={{width: 16, height: 0, borderBottom: '2px dashed #555', marginRight: 8, marginBottom: 4}}></span> Cables
                </label>
            </div>}

            {/* EQUIPMENT */}
            <div style={styles.header} onClick={() => toggleSection('equip')}>▼ EQUIPMENT</div>
            {sections.equip && <div style={{ padding: 8 }}>
                <label style={styles.item}>
                    <input type="checkbox" checked={filters['Transformer']} onChange={() => handleCheck('Transformer')} style={{ marginRight: 10 }} />
                    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(SVGS['icon-transformer'])}`} style={styles.icon} alt="" /> Transformers
                </label>
                <label style={styles.item}>
                    <input type="checkbox" checked={filters['Compensator']} onChange={() => handleCheck('Compensator')} style={{ marginRight: 10 }} />
                    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(SVGS['icon-compensator'])}`} style={styles.icon} alt="" /> Compensators
                </label>
                <label style={styles.item}>
                    <input type="checkbox" checked={filters['Switch']} onChange={() => handleCheck('Switch')} style={{ marginRight: 10 }} />
                    <span style={{...styles.icon, width:8, height:8, border:'1px solid #000', background:'#fff'}}></span> Switches
                </label>
                <label style={styles.item}>
                    <input type="checkbox" checked={filters['Busbar']} onChange={() => handleCheck('Busbar')} style={{ marginRight: 10 }} />
                    <span style={{width: 14, height: 3, background: '#000', marginRight: 8}}></span> Busbars
                </label>
            </div>}
        </div>
    );
};

export default Sidebar;