import { useState } from 'react';
import '../css/UpscaleImage.css';

const UpscalePage = () => {
  const [originalImage, setOriginalImage] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [status, setStatus] = useState('');
  const [settings, setSettings] = useState({
    scale: 4, // Default scale for SwinIR
    model_path: '001_classicalSR_DF2K_s64w8_SwinIR-M_x4.pth', // Path to the SwinIR model
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

  const handleSliderChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleEnhance = async () => {
    try {
      setStatus('Processing image...');
      const formData = new FormData();

      const response = await fetch(originalImage);
      const blob = await response.blob();
      formData.append('image', blob, 'image.png');
      formData.append('settings', JSON.stringify(settings));

      const res = await fetch('http://localhost:3000/upscale', {
        method: 'POST',
        body: formData,
      });
      const responseData = await res.text();
      if (!res.ok) {
        throw new Error(`Server error: ${responseData}`);
      }

      const data = JSON.parse(responseData);
      if (data.image) {
        setEnhancedImage(`data:image/png;base64,${data.image}`);
        setStatus(data.message || 'Image upscaled successfully!');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error('Enhancement error:', error);
    }
  };

  return (
    <div className="upscale-main-container">
      <h1 className="upscale-title">Image Upscaler (SwinIR)</h1>

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
          Upscale Image
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
          <h3 className="upscale-preview-title">Upscaled Image</h3>
          <div className="upscale-image-box">
            {enhancedImage ? (
              <img src={enhancedImage} alt="Enhanced" className="upscale-image" />
            ) : (
              <p className="upscale-placeholder">Upscaled image will appear here</p>
            )}
          </div>
        </div>
      </div>

      <div className="upscale-advanced-options">
        <h3 className="upscale-section-title">Advanced Options</h3>
        <div className="upscale-sliders-container">
          <div className="upscale-slider-group">
            <div className="upscale-slider-label">
              <span>Upscale Factor</span>
              <span className="upscale-slider-value">{settings.scale}</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={settings.scale}
              onChange={(e) => handleSliderChange('scale', parseFloat(e.target.value))}
              className="upscale-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpscalePage;