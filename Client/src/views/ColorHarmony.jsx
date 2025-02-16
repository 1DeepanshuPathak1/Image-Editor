// ColorHarmony.jsx
import React, { useState } from 'react';
import { Upload, Palette, RotateCcw, Undo2 } from 'lucide-react';
import '../css/ColorHarmony.css';
import { ColorSchemeCard } from '../Components/ColorHarmonyComps/ColorSchemeCard';
import { useColorLogic } from '../Components/ColorHarmonyComps/useColorLogic';

const ColorHarmonyPage = () => {
  const [copiedColor, setCopiedColor] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const {
    selectedImage,
    colorPalette,
    harmonies,
    similarPalettes,
    previousPalettes,
    handleUndoPalettes,
    handleImageUpload,
    handleRegeneratePalettes,
  } = useColorLogic();

  const handleCopyColor = (color) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const handleRegenerate = () => {
    setIsSpinning(true);
    handleRegeneratePalettes();
    setTimeout(() => setIsSpinning(false), 1000);
  };

  return (
    <div className="ch-page-container">
      <div className="ch-content-wrapper">
        <div className="ch-main-card">
          <h1 className="ch-page-title">Color Harmony Explorer</h1>

          <div className="ch-upload-section">
            <div className="ch-upload-container">
              <label htmlFor="fileInput" className="ch-upload-area mb-4">
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
                      handleCopyColor={handleCopyColor}
                      copiedColor={copiedColor}
                    />
                  </div>

                  <div className="mt-8">
                    <h2 className="ch-section-title">Color Harmonies</h2>
                    <div className="ch-harmonies-grid">
                      {harmonies.map((scheme, index) => (
                        <ColorSchemeCard
                          key={index}
                          colors={scheme.colors}
                          title={scheme.name}
                          handleCopyColor={handleCopyColor}
                          copiedColor={copiedColor}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="Similar-Palettes">
                      <h2 className="ch-section-title">Similar Color Palettes</h2>
                      <div className="buttons-container">
                        <button
                          className={`regenerate-button ${isSpinning ? 'spinning' : ''}`}
                          onClick={handleRegenerate}
                          aria-label="Regenerate palettes"
                        >
                          <RotateCcw className="regenerate-icon" />
                        </button>
                        <button
                          className="undo-button"
                          onClick={handleUndoPalettes}
                          disabled={!previousPalettes?.length}
                          aria-label="Undo last palette change"
                        >
                          <Undo2 className="undo-icon" />
                        </button>
                      </div>
                    </div>
                    <div className="ch-similar-palettes-grid">
                      {similarPalettes.map((scheme, index) => (
                        <ColorSchemeCard
                          key={index}
                          colors={scheme.colors}
                          title={scheme.name}
                          handleCopyColor={handleCopyColor}
                          copiedColor={copiedColor}
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