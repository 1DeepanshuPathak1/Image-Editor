import React, { useState, useEffect } from 'react';
import './css/CustomCursor.css';

const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleClick = (e) => {
      const newRipple = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY
      };
      setRipples(prev => [...prev, newRipple]);
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 1000);
    };

    const handleMouseEnter = (e) => {
      const target = e.target;
      const isInteractive = (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        (target.tagName === 'INPUT' && (target.type === 'submit' || target.type === 'button')) ||
        target.tagName === 'SELECT' ||
        target.closest('.vizion-nav-dot') ||
        target.closest('.vizion-primary-btn') ||
        target.closest('.vizion-feature-btn') ||
        target.closest('.vizion-social-btn') ||
        target.closest('.menu-button') ||
        target.closest('.SigninButton') ||
        target.closest('.PasswordIcon') ||
        target.closest('.MailIcon') ||
        target.closest('.sr-advanced-toggle') ||
        target.closest('.sr-upload-area') ||
        target.closest('.sr-remove-image') ||
        target.closest('.sr-suggest-button') ||
        target.closest('.sr-action-button') ||
        target.closest('.sr-delete-button') ||
        target.closest('.sr-select-trigger') ||
        target.closest('.sr-select-option') ||
        target.closest('.sr-select-clear') ||
        target.closest('.upload-button') ||
        target.closest('.action-buttons') ||
        target.closest('.action-button') ||
        target.closest('.download-button') ||
        target.closest('.save-button') ||
        target.closest('.apply-button') ||
        target.closest('.spotify-connect-button') ||
        target.closest('.spotify-connected-button') ||
        target.closest('.ch-upload-area') ||
        target.closest('.ch-close-button') ||
        target.closest('.ch-info-icon') ||
        target.closest('.ch-color-swatch-container') ||
        target.closest('.regenerate-button') ||
        target.closest('.undo-button') ||
        target.closest('.ResizeButton') ||
        target.closest('.DownloadButton') ||
        target.closest('.upscale-enhance-button') ||
        // Check for elements with an onClick handler
        target.onclick ||
        target.hasAttribute('onClick')
      );

      if (isInteractive) {
        setIsHovering(true);
      }
    };

    const handleMouseLeave = (e) => {
      const target = e.target;
      const isInteractive = (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        (target.tagName === 'INPUT' && (target.type === 'submit' || target.type === 'button')) ||
        target.tagName === 'SELECT' ||
        target.closest('.vizion-nav-dot') ||
        target.closest('.vizion-primary-btn') ||
        target.closest('.vizion-feature-btn') ||
        target.closest('.vizion-social-btn') ||
        target.closest('.menu-button') ||
        target.closest('.SigninButton') ||
        target.closest('.PasswordIcon') ||
        target.closest('.MailIcon') ||
        target.closest('.sr-advanced-toggle') ||
        target.closest('.sr-upload-area') ||
        target.closest('.sr-remove-image') ||
        target.closest('.sr-suggest-button') ||
        target.closest('.sr-action-button') ||
        target.closest('.sr-delete-button') ||
        target.closest('.sr-select-trigger') ||
        target.closest('.sr-select-option') ||
        target.closest('.sr-select-clear') ||
        target.closest('.upload-button') ||
        target.closest('.action-buttons') ||
        target.closest('.action-button') ||
        target.closest('.download-button') ||
        target.closest('.save-button') ||
        target.closest('.apply-button') ||
        target.closest('.spotify-connect-button') ||
        target.closest('.spotify-connected-button') ||
        target.closest('.ch-upload-area') ||
        target.closest('.ch-close-button') ||
        target.closest('.ch-info-icon') ||
        target.closest('.ch-color-swatch-container') ||
        target.closest('.regenerate-button') ||
        target.closest('.undo-button') ||
        target.closest('.ResizeButton') ||
        target.closest('.DownloadButton') ||
        target.closest('.upscale-enhance-button') ||
        target.onclick ||
        target.hasAttribute('onClick')
      );

      if (isInteractive) {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    document.addEventListener('mouseover', handleMouseEnter);
    document.addEventListener('mouseout', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
    };
  }, []);

  return (
    <>
      <div
        className={`vizion-cursor ${isHovering ? 'vizion-cursor--hover' : ''}`}
        style={{
          left: mousePosition.x,
          top: mousePosition.y
        }}
      >
        <div className="vizion-cursor-dot" />
        <div className="vizion-cursor-ring" />
      </div>

      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="vizion-click-ripple"
          style={{
            left: ripple.x,
            top: ripple.y
          }}
        />
      ))}
    </>
  );
};

export default CustomCursor;