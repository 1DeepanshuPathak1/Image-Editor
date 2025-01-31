import React, { useEffect } from 'react';

const AlertDialog = ({ isOpen, onClose, onConfirm }) => {
  // Prevent scrolling of background content when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Add a class to handle background blur
      document.body.classList.add('dialog-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('dialog-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('dialog-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          .dialog-open > *:not(.dialog-container) {
            pointer-events: none;
          }
          .dialog-container {
            pointer-events: auto !important;
          }
          @keyframes scaleIn {
            from {
              transform: scale(0.75);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
      <div 
        className="dialog-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}
      >
        <div 
          style={{
            backgroundColor: '#0f0f0f',
            borderRadius: '8px',
            padding: '20px',
            width: '90%',
            maxWidth: '440px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: 'scaleIn 0.25s ease-out',
            transform: 'scale(1)',
          }}
        >
          <h2 style={{ 
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#fff',
            textAlign: 'left'
          }}>
            Are you absolutely sure?
          </h2>
          <p style={{ 
            margin: 0,
            color: 'rgba(163, 163, 163)',
            fontSize: '14px',
            lineHeight: '1.5',
            textAlign: 'left'
          }}>
            Are you sure you want to sign out? You'll need to sign back in to access your account.
          </p>
          <div style={{ 
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '8px'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: '#0f0f0f',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#1a1a1a'}
              onMouseLeave={e => e.target.style.backgroundColor = '#0f0f0f'}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#fff',
                color: '#000',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={e => e.target.style.backgroundColor = '#fff'}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AlertDialog;