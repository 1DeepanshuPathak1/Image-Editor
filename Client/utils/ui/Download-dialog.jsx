import React, { useState, useEffect } from 'react';
import { X, Expand, Link2, Copy, Check } from 'lucide-react';
import {
    FaWhatsapp,
    FaFacebook,
    FaXTwitter,
    FaEnvelope,
    FaInstagram,
    FaLinkedin,
    FaTelegram,
    FaReddit,
    FaSnapchat
} from 'react-icons/fa6';

const DownloadDialog = ({ isOpen, onClose, imageUrl, onDownload }) => {
    const [fileName, setFileName] = useState('image');
    const [fileType, setFileType] = useState('png');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showExpandedImage, setShowExpandedImage] = useState(false);
    const [showCopySuccess, setShowCopySuccess] = useState(false);

    const fileTypes = ['png', 'jpg', 'jpeg', 'webp'];

    const shareApps = [
        {
            name: 'WhatsApp',
            icon: <FaWhatsapp size={24} />,
            color: '#25D366',
            action: () => window.open(`https://wa.me/?text=${encodeURIComponent('Check out my edited image!')} ${window.location.href}`)
        },
        {
            name: 'Facebook',
            icon: <FaFacebook size={24} />,
            color: '#1877F2',
            action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)
        },
        {
            name: 'X',
            icon: <FaXTwitter size={24} />,
            color: '#000000',
            action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out my edited image!')} ${window.location.href}`)
        },
        {
            name: 'Email',
            icon: <FaEnvelope size={24} />,
            color: '#EA4335',
            action: () => window.open(`mailto:?subject=Check out my edited image!&body=${encodeURIComponent(window.location.href)} ${window.location.href}`)
        },
        {
            name: 'Instagram',
            icon: <FaInstagram size={24} />,
            color: '#E4405F',
            action: () => window.open('https://www.instagram.com/direct/inbox/')
        },
        {
            name: 'LinkedIn',
            icon: <FaLinkedin size={24} />,
            color: '#0A66C2',
            action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`)
        },
        {
            name: 'Telegram',
            icon: <FaTelegram size={24} />,
            color: '#26A5E4',
            action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`)
        },
        {
            name: 'Reddit',
            icon: <FaReddit size={24} />,
            color: '#FF4500',
            action: () => window.open(`https://reddit.com/submit?url=${encodeURIComponent(window.location.href)}`)
        },
        {
            name: 'Snapchat',
            icon: <FaSnapchat size={24} />,
            color: '#FFFC00',
            action: () => alert('Opening Snapchat sharing...')
        }
    ];

    const ImageExpandModal = ({ imageUrl, onClose }) => {
        return (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10001,
                }}
                onClick={onClose}
            >
                <img
                    src={imageUrl}
                    alt="Expanded view"
                    style={{
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        objectFit: 'contain'
                    }}
                    onClick={e => e.stopPropagation()}
                />
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    style={{
                        position: 'absolute',
                        right: '24px',
                        top: '24px',
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: '4px',
                        zIndex: 10002,
                        pointerEvents: 'auto'
                    }}
                >
                    <X size={24} />
                </button>
            </div>
        );
    };

    const itemsPerSlide = 6;
    const totalSlides = Math.ceil(shareApps.length / itemsPerSlide);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    };

    const handleFileNameChange = (e) => {
        const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9-_]/g, '');
        setFileName(sanitizedValue);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShowCopySuccess(true);
            setTimeout(() => setShowCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const handleDownloadClick = () => {
        if (!fileName.trim()) return;
        onDownload(`${fileName}.${fileType}`);
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
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
                        from { transform: scale(0.75); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    .share-carousel {
                        position: relative;
                        overflow: hidden;
                        margin: 16px 0;
                    }
                    .share-carousel-content {
                        display: flex;
                        gap: 12px;
                        transition: transform 0.3s ease;
                        transform: translateX(calc(-${currentSlide * 100}%));
                    }
                    .share-item {
                        flex: 0 0 auto;
                        width: calc((100% - 60px) / 6);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 8px;
                        padding: 12px;
                        border-radius: 8px;
                        background: #1a1a1a;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .share-item:hover {
                        background: #252525;
                        transform: translateY(-2px);
                    }
                    .share-name {
                        font-size: 12px;
                        color: #fff;
                        text-align: center;
                    }
                    .carousel-button {
                        position: absolute;
                        top: 50%;
                        transform: translateY(-50%);
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        width: 36px;
                        height: 36px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        color: white;
                        transition: all 0.2s;
                        z-index: 100;
                        backdrop-filter: blur(4px);
                    }
                    
                    .carousel-button:hover {
                        background: rgba(255, 255, 255, 0.2);
                        border-color: rgba(255, 255, 255, 0.3);
                        transform: translateY(-50%) scale(1.05);
                    }
                    
                    .carousel-button.prev {
                        left: -12px;
                    }
                    
                    .carousel-button.next {
                        right: -12px;
                    }

                    .carousel-button svg {
                        width: 24px;
                        height: 24px;
                        stroke-width: 2.5;
                    }
                    .file-input-container {
                        display: flex;
                        gap: 8px;
                        align-items: flex-start;
                        padding: 0 2px;
                    }
                    .file-input {
                        flex: 1;
                        padding: 8px 12px;
                        border-radius: 6px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        background-color: #1a1a1a;
                        color: #fff;
                        font-size: 14px;
                    }
                    .file-type-select {
                        padding: 8px 12px;
                        border-radius: 6px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        background-color: #1a1a1a;
                        color: #fff;
                        font-size: 14px;
                        cursor: pointer;
                    }
                    .preview-container {
                        position: relative;
                        width: 100%;
                        height: 200px;
                        background-color: #1a1a1a;
                        border-radius: 8px;
                        overflow: hidden;
                        margin-bottom: 16px;
                    }
                    .preview-image {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                    }
                    .expand-button {
                        position: absolute;
                        bottom: 8px;
                        right: 8px;
                        background: rgba(0, 0, 0, 0.5);
                        border: none;
                        border-radius: 4px;
                        padding: 6px;
                        cursor: pointer;
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background-color 0.2s;
                    }
                    .expand-button:hover {
                        background: rgba(0, 0, 0, 0.7);
                    }
                    .link-container {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 12px;
                        background: #1a1a1a;
                        border-radius: 6px;
                        margin-top: 16px;
                    }
                    .link-text {
                        flex: 1;
                        font-size: 14px;
                        color: #fff;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .copy-button {
                        background: none;
                        border: none;
                        color: #fff;
                        cursor: pointer;
                        padding: 4px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    .copy-button:hover {
                        color: #f0f0f0;
                    }
                `}
            </style>
            <div className="dialog-container"
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
                <div style={{
                    backgroundColor: '#0f0f0f',
                    borderRadius: '8px',
                    padding: '20px',
                    width: '90%',
                    maxWidth: '440px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    animation: 'scaleIn 0.25s ease-out',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            right: '16px',
                            top: '16px',
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={20} />
                    </button>

                    <h2 style={{
                        margin: 0,
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#fff',
                        textAlign: 'left'
                    }}>
                        Download Image
                    </h2>

                    <div className="preview-container">
                        <img src={imageUrl} alt="Preview" className="preview-image" />
                        <button
                            className="expand-button"
                            onClick={() => setShowExpandedImage(true)}
                        >
                            <Expand size={20} />
                        </button>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: 'rgba(163, 163, 163)', fontSize: '14px', marginBottom: '8px' }}>
                            File Name
                        </div>
                        <div className="file-input-container">
                            <input
                                type="text"
                                value={fileName}
                                onChange={handleFileNameChange}
                                className="file-input"
                                placeholder="Enter file name"
                                required
                            />
                            <select
                                value={fileType}
                                onChange={(e) => setFileType(e.target.value)}
                                className="file-type-select"
                            >
                                {fileTypes.map(type => (
                                    <option key={type} value={type}>.{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <div style={{ color: 'rgba(163, 163, 163)', fontSize: '14px', marginBottom: '8px' }}>
                            Share via
                        </div>
                        <div className="share-carousel">
                            <button
                                className="carousel-button prev"
                                onClick={prevSlide}
                                style={{
                                    visibility: currentSlide === 0 ? 'hidden' : 'visible',
                                    opacity: currentSlide === 0 ? 0 : 1
                                }}
                                aria-label="Previous slide"
                            >
                                &lt;
                            </button>
                            <div className="share-carousel-content">
                                {shareApps.map((app) => (
                                    <div
                                        key={app.name}
                                        className="share-item"
                                        onClick={app.action}
                                        style={{ color: app.color }}
                                    >
                                        {app.icon}
                                        <span className="share-name">{app.name}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="carousel-button next"
                                onClick={nextSlide}
                                style={{
                                    visibility: currentSlide >= Math.ceil(shareApps.length / 6) - 1 ? 'hidden' : 'visible',
                                    opacity: currentSlide >= Math.ceil(shareApps.length / 6) - 1 ? 0 : 1
                                }}
                                aria-label="Next slide"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>

                    <div>
                        <div style={{ color: 'rgba(163, 163, 163)', fontSize: '14px', marginBottom: '8px' }}>
                            Shareable Link
                        </div>
                        <div className="link-container">
                            <Link2 size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                            <div className="link-text">{window.location.href}</div>
                            <button className="copy-button" onClick={handleCopyLink}>
                                {showCopySuccess ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: '16px'
                    }}>
                        <button
                            onClick={handleDownloadClick}
                            style={{
                                padding: '8px 24px',
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
                            Download
                        </button>
                    </div>
                </div>
            </div>
            {showExpandedImage && (
                <ImageExpandModal
                    imageUrl={imageUrl}
                    onClose={() => setShowExpandedImage(false)}
                />
            )}
        </>
    );
};

export default DownloadDialog;