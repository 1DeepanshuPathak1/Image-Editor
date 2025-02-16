import { rgbToHex, hslToRgb, rgbToHsl, hexToRgb, combineColors } from './ColorComp';

export const generateMonochromatic = (hsl) => {
  const [h, s, l] = hsl;
  return Array.from({ length: 5 }, (_, i) => {
    const newL = Math.max(0, Math.min(100, l - 30 + (i * 15)));
    return rgbToHex(...hslToRgb(h, s, newL));
  });
};

export const generateComplementary = (hsl) => {
  const [h, s, l] = hsl;
  const complement = (h + 180) % 360;
  return [
    rgbToHex(...hslToRgb(h, s, l)),
    rgbToHex(...hslToRgb(complement, s, l)),
    rgbToHex(...hslToRgb(h, s, l - 10)),
    rgbToHex(...hslToRgb(complement, s, l - 10)),
    rgbToHex(...hslToRgb(h, s, l + 10))
  ];
};

export const generateAnalogous = (hsl) => {
  const [h, s, l] = hsl;
  return [
    rgbToHex(...hslToRgb((h - 30 + 360) % 360, s, l)),
    rgbToHex(...hslToRgb((h - 15 + 360) % 360, s, l)),
    rgbToHex(...hslToRgb(h, s, l)),
    rgbToHex(...hslToRgb((h + 15) % 360, s, l)),
    rgbToHex(...hslToRgb((h + 30) % 360, s, l))
  ];
};

export const generateTriadic = (hsl) => {
  const [h, s, l] = hsl;
  return [
    rgbToHex(...hslToRgb(h, s, l)),
    rgbToHex(...hslToRgb((h + 120) % 360, s, l)),
    rgbToHex(...hslToRgb((h + 240) % 360, s, l)),
    rgbToHex(...hslToRgb(h, s, l - 10)),
    rgbToHex(...hslToRgb((h + 120) % 360, s, l + 10))
  ];
};

export const generateSimilarPalettes = (baseColors) => {
  if (!baseColors || !Array.isArray(baseColors) || baseColors.length === 0) {
    console.warn('Invalid base colors:', baseColors);
    return [];
  }

  const anchorColor = baseColors[0];
  const anchorRgb = hexToRgb(anchorColor);
  const [baseH, baseS, baseL] = rgbToHsl(...anchorRgb);

  const variationStrategies = [
    {
      name: "Vibrant & Bold",
      modifiers: [
        { h: -100, s: 0, l: 5 },    
        { h: -90, s: 0, l: 7.5 }, 
        { h: -80, s: 0, l: 10 }, 
        { h: -70, s: 0, l: 12.5 },  
        { h: -60, s: 0, l: 15 }  
      ]
    },
    {
      name: "Forest Shadows",
      modifiers: [
        { h: -20, s: 10, l: -17.5 }, 
        { h: -30, s: 10, l: -12.5 }, 
        { h: -40, s: 10, l: -7.5 }, 
        { h: -50, s: 10, l: -2.5 }, 
        { h: -60, s: 10, l: 2.5 }  
      ]
    },
    {
      name: "Earthy Gradient",
      modifiers: [
        { h: 20, s: 30, l: -5 },  
        { h: 30, s: 25, l: -2.5 }, 
        { h: 40, s: 20, l: 0 }, 
        { h: 50, s: 15, l: 2.5 },  
        { h: 60, s: 10, l: 5 }   
      ]
    },
    {
      name: "Monochrome Depth",
      modifiers: [
        { h: 100, s: 15, l: 25 }, 
        { h: 110, s: 17.5, l: 20 }, 
        { h: 120, s: 20, l: 15 },  
        { h: 130, s: 22.5, l: 10 }, 
        { h: 140, s: 25, l: 5 }   
      ]
    },
    {
      name: "Mystic Fog",
      modifiers: [
        { h: 270, s: 20, l: -30 },  
        { h: 280, s: 20, l: -25 }, 
        { h: 290, s: 20, l: -20 },  
        { h: 300, s: 20, l: -15 },  
        { h: 310, s: 20, l: -10 }   
      ]
    }
  ];

  return variationStrategies.map(strategy => {
    const colors = strategy.modifiers.map(mod => {

      const newH = (baseH + mod.h + 360) % 360;
      const newS = Math.max(0, Math.min(100, baseS + mod.s));
      const newL = Math.max(0, Math.min(100, baseL + mod.l));

      const rgb = hslToRgb(newH, newS, newL);
      return rgbToHex(...rgb);
    });

    return {
      name: strategy.name,
      colors: colors
    };
  });
};

export const generatePairsBasedPalettes = (baseColors, pairIndex) => {
  if (!baseColors || baseColors.length < 10) return [];

  const totalColors = baseColors.length;
  const pairOffset = Math.floor(pairIndex / 5); 
  const firstColorIndex = pairIndex % totalColors;
  const secondColorIndex = (firstColorIndex + 2 + pairOffset) % totalColors;

  const color1 = baseColors[firstColorIndex];
  const color2 = baseColors[secondColorIndex];

  const baseColor = combineColors(color1, color2);
  const baseRgb = hexToRgb(baseColor);
  const [baseH, baseS, baseL] = rgbToHsl(...baseRgb);

  const variations = [
    {
      name: "Vibrant & Bold",
      modifiers: [
        { h: -100, s: 0, l: 5 },    
        { h: -90, s: 0, l: 7.5 },   
        { h: -80, s: 0, l: 10 },    
        { h: -70, s: 0, l: 12.5 },  
        { h: -60, s: 0, l: 15 }     
      ]
    },
    {
      name: "Forest Shadows",
      modifiers: [
        { h: -20, s: 10, l: -17.5 },  
        { h: -30, s: 10, l: -12.5 },  
        { h: -40, s: 10, l: -7.5 },   
        { h: -50, s: 10, l: -2.5 },   
        { h: -60, s: 10, l: 2.5 }     
      ]
    },
    {
      name: "Earthy Gradient",
      modifiers: [
        { h: 20, s: 30, l: -5 },   
        { h: 30, s: 25, l: -2.5 }, 
        { h: 40, s: 20, l: 0 },    
        { h: 50, s: 15, l: 2.5 },  
        { h: 60, s: 10, l: 5 }     
      ]
    },
    {
      name: "Monochrome Depth",
      modifiers: [
        { h: 100, s: 15, l: 25 },
        { h: 110, s: 17.5, l: 20 },
        { h: 120, s: 20, l: 15 },
        { h: 130, s: 22.5, l: 10 },
        { h: 140, s: 25, l: 5 }
      ]
    },
    {
      name: "Mystic Fog",
      modifiers: [
        { h: 270, s: 20, l: -30 },
        { h: 280, s: 20, l: -25 },
        { h: 290, s: 20, l: -20 },
        { h: 300, s: 20, l: -15 },
        { h: 310, s: 20, l: -10 }
      ]
    }
  ];

  return variations.map((variation) => {
    const colors = variation.modifiers.map((mod) => {
      const newH = (baseH + mod.h + 360) % 360;
      const newS = Math.max(0, Math.min(100, baseS + mod.s));
      const newL = Math.max(0, Math.min(100, baseL + mod.l));

      const rgb = hslToRgb(newH, newS, newL);
      return rgbToHex(...rgb);
    });

    return {
      name: variation.name,
      colors: colors
    };
  });
};