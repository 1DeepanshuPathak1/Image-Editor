import React, { useState, useEffect } from 'react';
import '../css/Sonner.css';

const Sonner = ({ title, description, visible, onClose, onExited }) => {
  const [render, setRender] = useState(false);
  const [animation, setAnimation] = useState('');

  useEffect(() => {
    if (visible) {
      setRender(true);
      const inTimer = setTimeout(() => setAnimation('sonner-slide-in'), 10);
      return () => clearTimeout(inTimer);
    } else {
      setAnimation('sonner-slide-out');
      const outTimer = setTimeout(() => {
        setRender(false);
        onExited();
      }, 300);
      return () => clearTimeout(outTimer);
    }
  }, [visible]);

  const handleClose = () => setAnimation('sonner-slide-out');

  useEffect(() => {
    if (animation === 'sonner-slide-out') {
      const exitTimer = setTimeout(() => {
        setRender(false);
        onExited();
      }, 300);
      return () => clearTimeout(exitTimer);
    }
  }, [animation]);

  if (!render) return null;

  return (
    <div className={`sonner-toast ${animation}`}>
      <div className="sonner-content">
        <div className="sonner-header">
          <div className="sonner-title">{title}</div>
        </div>
        {description && (
          <div className="sonner-description">{description}</div>
        )}
      </div>
      <div className="sonner-actions">
        <button className="sonner-button" onClick={handleClose} type="button">
          Okay
        </button>
      </div>
    </div>
  );
};

export const useSonner = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (title, description) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      title,
      description,
      visible: true,
    };
    setToasts(prev => [...prev, newToast]);
    const autoDismiss = setTimeout(() => dismissToast(id), 5000);
    return () => clearTimeout(autoDismiss);
  };

  const dismissToast = (id) => {
    setToasts(prev =>
      prev.map(toast =>
        toast.id === id ? { ...toast, visible: false } : toast
      )
    );
  };

  const handleExited = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div className="sonner-portal">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="sonner-container"
          style={{
            bottom: `${1 + index * 6.2}rem`,
            zIndex: 10000 - index,
          }}
        >
          <Sonner
            title={toast.title}
            description={toast.description}
            visible={toast.visible}
            onClose={() => dismissToast(toast.id)}
            onExited={() => handleExited(toast.id)}
          />
        </div>
      ))}
    </div>
  );

  return { showToast, dismissToast, ToastContainer };
};
