export const SVGS = {
    'icon-tower': `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 5 L75 95 H25 L50 5 Z" fill="none" stroke="black" stroke-width="5"/><line x1="40" y1="40" x2="60" y2="40" stroke="black" stroke-width="5"/><line x1="30" y1="75" x2="70" y2="75" stroke="black" stroke-width="5"/><path d="M50 5 L50 25 M25 95 L40 40 M75 95 L60 40" stroke="black" stroke-width="3"/></svg>`,
    'icon-monopole': `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><line x1="50" y1="95" x2="50" y2="5" stroke="black" stroke-width="8"/><line x1="30" y1="20" x2="70" y2="20" stroke="black" stroke-width="6"/><line x1="35" y1="40" x2="65" y2="40" stroke="black" stroke-width="6"/><line x1="40" y1="60" x2="60" y2="60" stroke="black" stroke-width="6"/></svg>`,
    'icon-station': `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 10 L90 40 V90 H10 Z" fill="#FFD700" stroke="black" stroke-width="5"/><rect x="35" y="55" width="30" height="35" fill="none" stroke="black" stroke-width="5"/></svg>`,
    'icon-transformer': `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="50" r="28" fill="white" stroke="black" stroke-width="8" /><circle cx="65" cy="50" r="28" fill="none" stroke="black" stroke-width="8" /></svg>`,
    'icon-compensator': `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="white" stroke="black" stroke-width="8"/><line x1="10" y1="90" x2="90" y2="10" stroke="black" stroke-width="6"/><path d="M70 15 L90 10 L85 30" fill="none" stroke="black" stroke-width="5"/></svg>`,
};

export const loadSvgIcon = (map, name, svgString) => {
    return new Promise((resolve) => {
        const img = new Image(100, 100);
        img.onload = () => {
            if (!map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 });
            resolve();
        };
        const cleanSvg = svgString.trim().replace(/\n/g, '').replace(/\s+/g, ' ');
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanSvg);
    });
};