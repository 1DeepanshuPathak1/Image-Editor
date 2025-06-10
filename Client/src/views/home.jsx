import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Sparkles, Palette, Zap, Scissors, Edit3, Music, ArrowRight, Play, Star, Github, Twitter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSonner } from '../../utils/ui/Sonner';
import '../css/home.css';

const Home = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const containerRef = useRef(null);
  const { showToast, ToastContainer } = useSonner();

  const slides = [
    {
      id: 'hero',
      title: 'Transform Your Vision',
      subtitle: 'AI-Powered Creative Suite',
      description: 'Experience the future of image processing and creative discovery with our cutting-edge AI platform. Every pixel tells a story.',
      icon: Sparkles,
      features: ['Real-time Processing', 'AI-Powered Analysis', 'Cloud Integration', 'Professional Tools']
    },
    {
      id: 'song-recommender',
      title: 'Song Recommender',
      subtitle: 'Music Meets Vision',
      description: 'Upload any image and discover the perfect soundtrack. Our AI analyzes mood, atmosphere, and emotional context to recommend songs that resonate with your visual story.',
      icon: Music,
      stats: { accuracy: '94%', songs: '10M+', genres: '150+' }
    },
    {
      id: 'color-harmony',
      title: 'Color Harmony',
      subtitle: 'Palette Perfection',
      description: 'Extract stunning color palettes from any image. Generate harmonious color schemes and discover endless design inspiration with intelligent palette analysis.',
      icon: Palette,
      stats: { palettes: '2M+', accuracy: '98%', formats: '12+' }
    },
    {
      id: 'image-enhancer',
      title: 'Image Enhancer',
      subtitle: 'Pixel Perfect AI',
      description: 'Transform low-resolution images into crystal-clear masterpieces. Our advanced AI enhancement technology preserves details while dramatically improving quality.',
      icon: Zap,
      stats: { enhancement: '4x', speed: '2s', quality: '99%' }
    },
    {
      id: 'image-resizer',
      title: 'Smart Resizer',
      subtitle: 'Intelligent Scaling',
      description: 'Resize and compress images with zero quality loss. Dynamic optimization ensures perfect dimensions while maintaining visual integrity across all formats.',
      icon: Scissors,
      stats: { compression: '80%', formats: '15+', speed: '1s' }
    },
    {
      id: 'image-editor',
      title: 'Pro Editor',
      subtitle: 'Creative Control',
      description: 'Professional-grade editing tools in your browser. Apply stunning filters, adjust lighting, and export in any format with our intuitive editor interface.',
      icon: Edit3,
      stats: { filters: '50+', tools: '25+', exports: '10+' }
    }
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:3000/auth/check', {
          credentials: 'include'
        });
        const data = await response.json();
        setIsSignedIn(data.isAuthenticated);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsSignedIn(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const storedConnection = sessionStorage.getItem('spotifyConnected');
    if (storedConnection === 'true') {
      setIsSpotifyConnected(true);
    }
  }, []);

  useEffect(() => {
    const handleScroll = (e) => {
      if (isScrolling) return;

      setIsScrolling(true);

      if (e.deltaY > 0 && currentSlide < slides.length - 1) {
        setCurrentSlide(prev => prev + 1);
      } else if (e.deltaY < 0 && currentSlide > 0) {
        setCurrentSlide(prev => prev - 1);
      }

      setTimeout(() => setIsScrolling(false), 1000);
    };

    window.addEventListener('wheel', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleScroll);
    };
  }, [currentSlide, isScrolling, slides.length]);

  const goToSlide = (index) => {
    if (!isScrolling) {
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleFeatureClick = (slideId) => {
    const routeMap = {
      'song-recommender': '/song-recommender',
      'color-harmony': '/Color-Harmony',
      'image-enhancer': '/upscale',
      'image-resizer': '/resize-image',
      'image-editor': '/edit'
    };

    if (!isSignedIn) {
      showToast(
        "Authentication Required",
        "Please sign in to access this feature."
      );
      setTimeout(() => {
        navigate('/signin', { state: { from: routeMap[slideId] } });
      }, 1000);
      return;
    }

    if (slideId === 'song-recommender' && !isSpotifyConnected) {
      showToast(
        "Spotify Connection Required",
        "Please connect your Spotify account to access the Song Recommender."
      );
      return;
    }

    if (routeMap[slideId]) {
      navigate(routeMap[slideId]);
    }
  };

  return (
    <div className="vizion-homepage-container" ref={containerRef}>
      <div className="vizion-grid-background">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="vizion-grid-line" style={{ '--delay': `${i * 0.1}s` }} />
        ))}
      </div>

      <div className="vizion-floating-orbs">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="vizion-orb"
            style={{
              '--orb-delay': `${i * 2}s`,
              '--orb-duration': `${15 + i * 3}s`,
              '--orb-size': `${40 + i * 20}px`
            }}
          />
        ))}
      </div>

      <nav className="vizion-slide-nav">
        <div className="vizion-nav-track">
          <div
            className="vizion-nav-indicator"
            style={{ transform: `translateY(${currentSlide * 32}px)` }}
          />
          {slides.map((_, index) => (
            <button
              key={index}
              className={`vizion-nav-dot ${currentSlide === index ? 'vizion-nav-dot--active' : ''}`}
              onClick={() => goToSlide(index)}
            >
              <span className="vizion-nav-tooltip">{slides[index].title}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="vizion-slides-wrapper" style={{
        transform: `translateY(-${currentSlide * 100}vh)`
      }}>
        {slides.map((slide, index) => {
          const Icon = slide.icon;
          const isActive = currentSlide === index;

          return (
            <div
              key={slide.id}
              className={`vizion-slide ${isActive ? 'vizion-slide--active' : ''}`}
            >
              <div className="vizion-slide-content">
                <div className="vizion-content-grid">
                  <div className="vizion-icon-section">
                    <div className="vizion-icon-wrapper">
                      <div className="vizion-icon-glow" />
                      <Icon size={64} className="vizion-slide-icon" />
                    </div>

                    {slide.stats && (
                      <div className="vizion-stats-card">
                        {Object.entries(slide.stats).map(([key, value]) => (
                          <div key={key} className="vizion-stat-item">
                            <div className="vizion-stat-value">{value}</div>
                            <div className="vizion-stat-label">{key}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {slide.features && (
                      <div className="vizion-features-list">
                        {slide.features.map((feature, i) => (
                          <div key={i} className="vizion-feature-item">
                            <Star size={12} />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="vizion-text-section">
                    <div className="vizion-text-content">
                      <h1 className="vizion-slide-title">{slide.title}</h1>
                      <h2 className="vizion-slide-subtitle">{slide.subtitle}</h2>
                      <p className="vizion-slide-description">{slide.description}</p>

                      <div className="vizion-action-group">
                        {index === 0 ? (
                          <button
                            className="vizion-primary-btn"
                            onClick={nextSlide}
                          >
                            <span>Explore Features</span>
                            <ArrowRight size={18} />
                          </button>
                        ) : (
                          <button
                            className="vizion-feature-btn"
                            onClick={() => handleFeatureClick(slide.id)}
                            style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1000 }}
                          >
                            <Play size={14} />
                            <span>Try {slide.title}</span>
                          </button>
                        )}

                        {index === 0 && (
                          <div className="vizion-social-links">
                            <button
                              className="vizion-social-btn vizion-clickable"
                            >
                              <Github size={16} />
                            </button>
                            <button
                              className="vizion-social-btn vizion-clickable"
                            >
                              <Twitter size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {index < slides.length - 1 && (
                <div className="vizion-scroll-hint">
                  <div className="vizion-scroll-icon">
                    <ChevronDown size={20} />
                  </div>
                  <span>Scroll to explore</span>
                </div>
              )}

              <div className="vizion-decorative-shapes">
                <div className="vizion-shape vizion-shape--1" />
                <div className="vizion-shape vizion-shape--2" />
                <div className="vizion-shape vizion-shape--3" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="vizion-progress-container">
        <div className="vizion-progress-track">
          <div
            className="vizion-progress-fill"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>
        <div className="vizion-progress-text">
          {String(currentSlide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </div>
      </div>

      <div className="vizion-brand-mark">
        <div className="vizion-brand-icon">
          <Sparkles size={20} />
        </div>
        <span>Vizion</span>
      </div>
      
      <ToastContainer />
    </div>
  );
};

export default Home;