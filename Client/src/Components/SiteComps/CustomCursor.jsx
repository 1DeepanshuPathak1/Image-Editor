import { useState, useEffect, useRef, useCallback } from 'react';
import './css/CustomCursor.css';

const EnhancedCustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [floatingParticles, setFloatingParticles] = useState([]);
  const [clickRipples, setClickRipples] = useState([]);
  
  const cursorRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const rippleIdRef = useRef(0);

  const updateCursor = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    lastTimeRef.current = timestamp;

    setMousePosition(prevPos => {
      const easing = isHovering ? 0.15 : 0.12;
      
      const newX = prevPos.x + (targetPosition.x - prevPos.x) * easing;
      const newY = prevPos.y + (targetPosition.y - prevPos.y) * easing;
      
      return { x: newX, y: newY };
    });

    animationRef.current = requestAnimationFrame(updateCursor);
  }, [targetPosition, isHovering]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateCursor);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [updateCursor]);

  useEffect(() => {
    const generateFloatingParticles = () => {
      const particles = [];
      for (let i = 0; i < 3; i++) {
        particles.push({
          id: i,
          angle: (i * 120) * (Math.PI / 180),
          radius: 20 + i * 6,
          speed: 0.02 + i * 0.005,
          opacity: 0.6 - i * 0.15
        });
      }
      setFloatingParticles(particles);
    };

    generateFloatingParticles();
  }, []);

  const createRipple = useCallback((x, y) => {
    const rippleId = rippleIdRef.current++;
    const newRipple = { id: rippleId, x, y };
    
    setClickRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setClickRipples(prev => prev.filter(ripple => ripple.id !== rippleId));
    }, 600);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setTargetPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = (e) => {
      setIsClicking(true);
      createRipple(e.clientX, e.clientY);
      
      setTimeout(() => {
        setIsClicking(false);
      }, 400);
    };

    const handleMouseEnter = (e) => {
      const target = e.target;
      const isInteractive = (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        (target.tagName === 'INPUT' && (target.type === 'submit' || target.type === 'button')) ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
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
        target.closest('[role="button"]') ||
        target.closest('.interactive') ||
        target.hasAttribute('data-magnetic') ||
        target.onclick ||
        target.hasAttribute('onClick') ||
        getComputedStyle(target).cursor === 'pointer'
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
        target.tagName === 'TEXTAREA' ||
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
        target.closest('[role="button"]') ||
        target.closest('.interactive') ||
        target.hasAttribute('data-magnetic') ||
        target.onclick ||
        target.hasAttribute('onClick') ||
        getComputedStyle(target).cursor === 'pointer'
      );

      if (isInteractive) {
        setIsHovering(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseover', handleMouseEnter);
    document.addEventListener('mouseout', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
    };
  }, [createRipple]);

  return (
    <>
      {clickRipples.map(ripple => (
        <div
          key={ripple.id}
          className="enhanced-cursor-click-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}

      <div 
        ref={cursorRef} 
        className={`enhanced-cursor ${isHovering ? 'enhanced-cursor--hover' : ''} ${isClicking ? 'enhanced-cursor--click' : ''}`}
        style={{
          transform: `translate3d(${mousePosition.x}px, ${mousePosition.y}px, 0)`,
        }}
      >
        <div className="enhanced-cursor-outer-ring" />
        
        <div className="enhanced-cursor-middle-ring" />
        
        <div className="enhanced-cursor-dot" />
        
        {floatingParticles.map(particle => (
          <div
            key={particle.id}
            className="enhanced-cursor-floating-particle"
            style={{
              opacity: particle.opacity,
              animationDelay: `${particle.id * 0.5}s`,
              animationDuration: `${3 + particle.id * 0.5}s`,
            }}
          />
        ))}
      </div>
    </>
  );
};

export default EnhancedCustomCursor;