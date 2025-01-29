import { useState } from 'react';
import '../css/UpscaleImage.css';

const UpscalePage = () => {
  const [originalImage, setOriginalImage] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [status, setStatus] = useState('');
  const [settings, setSettings] = useState({
    seed: 42,
    upscaleFactor: 2,
    controlNetScale: 0.6,
    controlNetScaleDecay: 1,
    conditionScale: 6,
    latentTileWidth: 112,
    latentTileHeight: 144,
    denoiseStrength: 0.35,
    inferenceSteps: 18
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setStatus('File size should be less than 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target.result);
        setStatus('Image loaded successfully');
      };
      reader.readAsDataURL(file);
    }
  };


  const handleEnhance = async () => {
    try {
      setStatus('Processing image...');
      const formData = new FormData();

      // Convert base64 to blob
      const response = await fetch(originalImage);
      const blob = await response.blob();
      formData.append('image', blob, 'image.png');

      // Add settings to formData
      formData.append('settings', JSON.stringify(settings));

      const res = await fetch('http://localhost:3000/upscale', {
        method: 'POST',
        body: formData,
      });
      const responseData = await res.text();
      if (!res.ok) {
        throw new Error(`Server error: ${responseData}`);
      }

      // Parse JSON after checking response
      const data = JSON.parse(responseData);
      if (data.image) {
        setEnhancedImage(`data:image/png;base64,${data.image}`);
        setStatus(data.message || 'Image enhanced successfully!');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error('Enhancement error:', error);
    }
  };
  const handleSliderChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const sliderConfigs = [
    { name: 'seed', label: 'Seed', min: 0, max: 10000, step: 1 },
    { name: 'upscaleFactor', label: 'Upscale Factor', min: 1, max: 4, step: 0.1 },
    { name: 'controlNetScale', label: 'ControlNet Scale', min: 0, max: 1.5, step: 0.05 },
    { name: 'controlNetScaleDecay', label: 'ControlNet Scale Decay', min: 0, max: 1, step: 0.05 },
    { name: 'conditionScale', label: 'Condition Scale', min: 0, max: 20, step: 0.5 },
    { name: 'latentTileWidth', label: 'Latent Tile Width', min: 64, max: 256, step: 4 },
    { name: 'latentTileHeight', label: 'Latent Tile Height', min: 64, max: 256, step: 4 },
    { name: 'denoiseStrength', label: 'Denoise Strength', min: 0, max: 1, step: 0.05 },
    { name: 'inferenceSteps', label: 'Number of Inference Steps', min: 1, max: 30, step: 1 }
  ];

  return (
    <div className="upscale-main-container">
      <h1 className="upscale-title">Image Enhancer</h1>

      <div className="upscale-upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="upscale-file-input"
        />
        <button
          onClick={handleEnhance}
          className="upscale-enhance-button"
          disabled={!originalImage}
        >
          Enhance Image
        </button>
      </div>

      <div className="upscale-preview-container">
        <div className="upscale-preview">
          <h3 className="upscale-preview-title">Original Image</h3>
          <div className="upscale-image-box">
            {originalImage ? (
              <img src={originalImage} alt="Original" className="upscale-image" />
            ) : (
              <p className="upscale-placeholder">Upload an image to begin</p>
            )}
          </div>
        </div>

        <div className="upscale-preview">
          <h3 className="upscale-preview-title">Enhanced Image</h3>
          <div className="upscale-image-box">
            {enhancedImage ? (
              <img src={enhancedImage} alt="Enhanced" className="upscale-image" />
            ) : (
              <p className="upscale-placeholder">Enhanced image will appear here</p>
            )}
          </div>
        </div>
      </div>

      <div className="upscale-advanced-options">
        <h3 className="upscale-section-title">Advanced Options</h3>
        <div className="upscale-sliders-container">
          {sliderConfigs.map((config) => (
            <div key={config.name} className="upscale-slider-group">
              <div className="upscale-slider-label">
                <span>{config.label}</span>
                <span className="upscale-slider-value">{settings[config.name]}</span>
              </div>
              <input
                type="range"
                min={config.min}
                max={config.max}
                step={config.step}
                value={settings[config.name]}
                onChange={(e) => handleSliderChange(config.name, parseFloat(e.target.value))}
                className="upscale-slider"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpscalePage;