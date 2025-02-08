import React, { useState } from 'react';
import { Upload, Palette, Check, Info } from 'lucide-react';
import ColorThief from 'colorthief';
import '../css/ColorHarmony.css';

const ColorHarmonyPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [suggestedSchemes, setSuggestedSchemes] = useState([]);
  const [copiedColor, setCopiedColor] = useState(null);

  // Enhanced color conversion functions
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  };

  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  };

  const hslToRgb = (h, s, l) => {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  // Enhanced color scheme generation
  const generateMonochromatic = (hsl, steps = 5) => {
    const [h, s, l] = hsl;
    return Array.from({ length: steps }, (_, i) => {
      const newL = Math.max(0, Math.min(100, l - 30 + (i * 15)));
      return rgbToHex(...hslToRgb(h, s, newL));
    });
  };

  const generateComplementary = (hsl) => {
    const [h, s, l] = hsl;
    const complement = (h + 180) % 360;
    return [
      rgbToHex(...hslToRgb(h, s, l)),
      rgbToHex(...hslToRgb(h, s, l + 15)),
      rgbToHex(...hslToRgb(complement, s, l)),
      rgbToHex(...hslToRgb(complement, s, l + 15)),
      rgbToHex(...hslToRgb(h, Math.max(0, s - 20), l))
    ];
  };

  const generateAnalogous = (hsl) => {
    const [h, s, l] = hsl;
    return [
      rgbToHex(...hslToRgb((h - 30 + 360) % 360, s, l)),
      rgbToHex(...hslToRgb((h - 15 + 360) % 360, s, l)),
      rgbToHex(...hslToRgb(h, s, l)),
      rgbToHex(...hslToRgb((h + 15) % 360, s, l)),
      rgbToHex(...hslToRgb((h + 30) % 360, s, l))
    ];
  };

  const generateTriadic = (hsl) => {
    const [h, s, l] = hsl;
    return [
      rgbToHex(...hslToRgb(h, s, l)),
      rgbToHex(...hslToRgb((h + 120) % 360, s, l)),
      rgbToHex(...hslToRgb((h + 240) % 360, s, l)),
      rgbToHex(...hslToRgb(h, Math.min(100, s + 10), l)),
      rgbToHex(...hslToRgb((h + 120) % 360, Math.min(100, s + 10), l))
    ];
  };

  const extractColorsFromImage = async (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 10, 10);
        const hexColors = palette.map(color => rgbToHex(...color));
        resolve(hexColors);
      };
      img.src = imageSrc;
    });
  };

  const generateSuggestedSchemes = (baseColor) => {
    const rgb = hexToRgb(baseColor);
    const hsl = rgbToHsl(...rgb);

    return [
      {
        name: 'Dominant Colors (Most to Least)',
        colors: colorPalette
      },
      {
        name: 'Monochromatic',
        colors: generateMonochromatic(hsl)
      },
      {
        name: 'Complementary',
        colors: generateComplementary(hsl)
      },
      {
        name: 'Analogous',
        colors: generateAnalogous(hsl)
      },
      {
        name: 'Triadic',
        colors: generateTriadic(hsl)
      }
    ];
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageSrc = e.target.result;
        setSelectedImage(imageSrc);
        const extractedColors = await extractColorsFromImage(imageSrc);
        setColorPalette(extractedColors);
        const schemes = generateSuggestedSchemes(extractedColors[0]);
        setSuggestedSchemes(schemes);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyColor = (color) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const getOrdinalSuffix = (i) => {
    const j = i % 10,
          k = i % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const ColorSchemeCard = ({ colors, title }) => (
    <div className="ch-scheme-card">
      <h3 className="ch-scheme-title">
        {title}
        <Info size={16} className="ch-info-icon" />
      </h3>
      <div className="ch-color-grid">
        {colors.map((color, index) => (
          <div
            key={index}
            className="ch-color-swatch-container"
            onClick={() => handleCopyColor(color)}
          >
            <div
              className="ch-color-swatch"
              style={{ backgroundColor: color }}
            />
            <span className="ch-color-tooltip">
              {color}
              {title === 'Dominant Colors (Most to Least)'}
            </span>
            {copiedColor === color && (
              <div className="ch-copy-indicator">
                <Check size={16} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="ch-page-container">
      <div className="ch-content-wrapper">
        <div className="ch-main-card">
          <h1 className="ch-page-title">Color Harmony Explorer</h1>
          
          <div className="ch-upload-section">
            <div className="ch-upload-container">
              <label
                htmlFor="fileInput"
                className="ch-upload-area mb-4"
              >
                <Upload size={24} />
                <span>Choose an image or drag it here</span>
                <input
                  type="file"
                  id="fileInput"
                  className="ch-file-input"
                  onChange={handleImageUpload}
                  accept="image/*"
                />
              </label>
              
              {selectedImage && (
                <div className="w-full">
                  <div className="w-full bg-slate-600" style={{ minHeight: '480px' }}>
                    <img
                      src={selectedImage}
                      alt="Uploaded"
                      style={{
                        minWidth: '100%',
                        maxHeight: '480px',
                        display: 'block',
                        objectFit: 'contain'
                      }}
                    />
                  </div>

                  <div className="mt-8">
                    <h2 className="ch-section-title flex items-center gap-2">
                      <Palette />
                      Image Colors
                    </h2>
                    <ColorSchemeCard 
                      colors={colorPalette} 
                      title="Dominant Colors (Most to Least)" 
                    />
                  </div>

                  <div className="mt-8">
                    <h2 className="ch-section-title">Color Harmonies</h2>
                    <div className="ch-harmonies-grid">
                      {suggestedSchemes.slice(1).map((scheme, index) => (
                        <ColorSchemeCard
                          key={index}
                          colors={scheme.colors}
                          title={scheme.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorHarmonyPage;