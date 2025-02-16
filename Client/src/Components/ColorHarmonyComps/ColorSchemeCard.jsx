// ColorSchemeCard.jsx
import React from 'react';
import { Info, Check } from 'lucide-react';
import {harmonyExplanations} from './HarmonyExplanation'

const ColorSchemeCard = ({ colors, title, handleCopyColor, copiedColor }) => {
  const harmonyType = title.split(' ')[0];
  const harmonyInfo = harmonyExplanations[harmonyType];

  return (
    <div className="ch-scheme-card">
      <h3 className="ch-scheme-title flex items-center gap-2">
        {title}
        {harmonyInfo && (
          <div className="ch-info-container">
            <Info size={16} className="ch-info-icon" />
            <div className="ch-info-hover-card">
              <h3 className="ch-info-title">@{harmonyInfo.title}</h3>
              <p className="ch-info-description">{harmonyInfo.description}</p>
            </div>
          </div>
        )}
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
            <span className="ch-color-tooltip">{color}</span>
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
};

export {ColorSchemeCard};