import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Share2, Clock, Heart, Loader, RefreshCw } from 'lucide-react';
import '../css/SongRecommender.css';

const SongRecommenderPage = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [chatResponse, setChatResponse] = useState('');
    const [suggestedSong, setSuggestedSong] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [imageAnalysis, setImageAnalysis] = useState(null);
    const [skipCount, setSkipCount] = useState(0);
    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem('songFavorites');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Error loading favorites:', error);
            return [];
        }
    });
    const [history, setHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('songHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Error loading history:', error);
            return [];
        }
    });

    const audioRef = useRef(null);
    const maxHistoryItems = 8;

    const safeSetLocalStorage = (key, value) => {
        try {
            const serialized = JSON.stringify(value);
            if (serialized.length > 4500000) {
                throw new Error('Data size exceeds storage limit');
            }
            localStorage.setItem(key, serialized);
        } catch (error) {
            console.warn(`Error saving to localStorage (${key}):`, error);
            if (error.name === 'QuotaExceededError') {
                if (key === 'songHistory') {
                    const truncatedHistory = value.slice(0, Math.max(maxHistoryItems - 2, 1));
                    try {
                        localStorage.setItem(key, JSON.stringify(truncatedHistory));
                        setHistory(truncatedHistory);
                    } catch (e) {
                        console.error('Failed to save even after truncating:', e);
                    }
                }
            }
        }
    };

    useEffect(() => {
        safeSetLocalStorage('songFavorites', favorites);
    }, [favorites]);

    useEffect(() => {
        safeSetLocalStorage('songHistory', history);
    }, [history]);

    useEffect(() => {
        if (suggestedSong?.preview_url && audioRef.current) {
            audioRef.current.src = suggestedSong.preview_url;
            audioRef.current.play().catch(error => {
                console.warn('Error playing audio:', error);
            });
        }
    }, [suggestedSong]);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5000000) {
                setError('Image size too large. Please choose an image under 5MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
                setError(null);
            };
            reader.onerror = () => {
                setError('Failed to load image. Please try another image.');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setError(null);
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const handleSuggestSong = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const base64Response = await fetch(selectedImage);
            const blob = await base64Response.blob();

            const formData = new FormData();
            formData.append('image', blob, 'image.jpg');

            if (showAdvanced) {
                const preferences = {
                    genre: document.querySelector('select[name="genre"]')?.value,
                    mood: document.querySelector('select[name="mood"]')?.value
                };
                formData.append('preferences', JSON.stringify(preferences));
            }

            const apiResponse = await fetch('http://localhost:3000/api/songs/recommend-song', {
                method: 'POST',
                body: formData,
            });

            const data = await apiResponse.json();

            if (!apiResponse.ok) {
                throw new Error(data.error || 'Failed to get song recommendation');
            }

            setChatResponse(data.description || 'Here\'s a song that matches your image...');
            setSuggestedSong(data.song);
            setImageAnalysis(data.analysis);

            // Add the seed track to the song display
            if (data.song.seed_track) {
                const seedTrackInfo = {
                    ...data.song.seed_track,
                    isSeedTrack: true
                };
                setSuggestedSong(prev => ({
                    ...prev,
                    seedTrack: seedTrackInfo
                }));
            }

            const historyItem = {
                id: Date.now(),
                song: data.song,
                imageUrl: selectedImage,
                timestamp: new Date().toISOString()
            };

            setHistory(prev => {
                const newHistory = [historyItem, ...prev].slice(0, maxHistoryItems);
                return newHistory;
            });

        } catch (err) {
            console.error('Error in handleSuggestSong:', err);
            setError(
                err.message === 'Failed to fetch'
                    ? 'Cannot connect to the server. Please check your connection and try again.'
                    : err.message || 'Failed to get song recommendation'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateSong = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`http://localhost:3000/api/songs/recommend-song?skip=${skipCount + 1}`, {
                method: 'POST',
                body: new FormData(document.querySelector('form'))
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get song recommendation');
            }

            setSuggestedSong(data.song);
            setSkipCount(prev => prev + 1);

            if (audioRef.current) {
                audioRef.current.src = data.song.preview_url;
                audioRef.current.play().catch(console.error);
            }

        } catch (err) {
            console.error('Error regenerating song:', err);
            setError(err.message || 'Failed to regenerate song recommendation');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (suggestedSong?.preview_url && audioRef.current) {
            audioRef.current.src = suggestedSong.preview_url;
            audioRef.current.play().catch(console.error);
        }
    }, [suggestedSong]);

    const toggleFavorite = (song) => {
        setFavorites(prev => {
            const exists = prev.some(fav => fav.uri === song.uri);
            if (exists) {
                return prev.filter(fav => fav.uri !== song.uri);
            }
            return [...prev, { ...song, timestamp: new Date().toISOString() }];
        });
    };

    const shareSong = async (song) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${song.name} by ${song.artist}`,
                    text: `Check out this song I discovered: ${song.name} by ${song.artist}`,
                    url: song.external_url
                });
            } catch (err) {
                setError('Failed to share song');
            }
        } else {
            await navigator.clipboard.writeText(song.external_url);
        }
    };

    const deleteHistoryItem = (id) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    return (
        <div className="sr-page-container">
            <div className="sr-content-wrapper">
                <div className="sr-main-card">
                    <h1 className="sr-page-title">Song Recommender</h1>

                    <div className="sr-input-section">
                        <input
                            type="text"
                            className="sr-prompt-input"
                            placeholder="Enter additional preferences (optional)"
                        />

                        <div className="sr-advanced-section">
                            <button
                                className="sr-advanced-toggle"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                            >
                                Advanced Options {showAdvanced ? '▼' : '▶'}
                            </button>

                            {showAdvanced && (
                                <div className="sr-advanced-options">
                                    <select className="sr-select">
                                        <option value="">Select Genre</option>
                                        <option value="pop">Pop</option>
                                        <option value="rock">Rock</option>
                                        <option value="jazz">Jazz</option>
                                    </select>
                                    <select className="sr-select">
                                        <option value="">Select Mood</option>
                                        <option value="happy">Happy</option>
                                        <option value="calm">Calm</option>
                                        <option value="energetic">Energetic</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="sr-image-container">
                            <div className="sr-image-preview">
                                {selectedImage ? (
                                    <>
                                        <button
                                            className="sr-remove-image"
                                            onClick={handleRemoveImage}
                                            aria-label="Remove image"
                                        >
                                            <X size={24} />
                                        </button>
                                        <img
                                            src={selectedImage}
                                            alt="Uploaded"
                                            className="sr-preview-img"
                                        />
                                    </>
                                ) : (
                                    <label htmlFor="fileInput" className="sr-upload-area">
                                        <Upload size={24} />
                                        <span>Choose an image or drag it here</span>
                                        <input
                                            type="file"
                                            id="fileInput"
                                            className="sr-file-input"
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="sr-error">
                                {error}
                            </div>
                        )}

                        <button
                            className="sr-suggest-button"
                            onClick={handleSuggestSong}
                            disabled={!selectedImage || isLoading}
                        >
                            {isLoading ? (
                                <div className="sr-loading">
                                    <Loader className="sr-spinner" />
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                'Suggest Song'
                            )}
                        </button>

                        {(chatResponse || suggestedSong) && (
                            <div className="sr-results-container">
                                <div className="sr-left-column">
                                    <div className="sr-chat-response">
                                        {chatResponse}
                                    </div>

                                    {imageAnalysis && (
                                        <div className="sr-analysis">
                                            <h3>Image Analysis</h3>
                                            <div className="sr-analysis-content">
                                                <p><strong>Mood:</strong> {imageAnalysis.mood}</p>
                                                <p><strong>Energy Level:</strong> {Math.round(imageAnalysis.energy_level * 100)}%</p>
                                                <p><strong>Detected:</strong> {imageAnalysis.predictions[0].label}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {suggestedSong && (
                                    <div className="sr-song-card">
                                        <img
                                            src={suggestedSong.album_art}
                                            alt={`${suggestedSong.name} album art`}
                                            className="sr-album-art"
                                        />
                                        <div className="sr-song-info">
                                            <h3>{suggestedSong.name}</h3>
                                            <p>{suggestedSong.artist}</p>
                                        </div>
                                        <div className="sr-song-actions">
                                            <button
                                                onClick={() => toggleFavorite(suggestedSong)}
                                                className={`sr-action-button ${favorites.some(fav => fav.uri === suggestedSong.uri) ? 'active' : ''}`}
                                            >
                                                <Heart size={20} />
                                            </button>
                                            <button
                                                onClick={() => shareSong(suggestedSong)}
                                                className="sr-action-button"
                                            >
                                                <Share2 size={20} />
                                            </button>
                                            <button
                                                onClick={handleRegenerateSong}
                                                className="sr-action-button"
                                                disabled={isLoading}
                                            >
                                                <RefreshCw size={20} />
                                            </button>
                                        </div>

                                        {/* Add Spotify player iframe */}
                                        <iframe
                                            src={`https://open.spotify.com/embed/track/${suggestedSong.uri.split(':')[2]}`}
                                            width="100%"
                                            height="80"
                                            frameBorder="0"
                                            allowtransparency="true"
                                            allow="encrypted-media"
                                            className="sr-spotify-player"
                                        ></iframe>

                                        {/* If there's a seed track, show it */}
                                        {suggestedSong.seedTrack && (
                                            <div className="sr-seed-track">
                                                <h4>Seed Track:</h4>
                                                <div className="sr-seed-track-info">
                                                    <p>{suggestedSong.seedTrack.name} - {suggestedSong.seedTrack.artist}</p>
                                                    <iframe
                                                        src={`https://open.spotify.com/embed/track/${suggestedSong.seedTrack.uri.split(':')[2]}`}
                                                        width="100%"
                                                        height="80"
                                                        frameBorder="0"
                                                        allowtransparency="true"
                                                        allow="encrypted-media"
                                                        className="sr-spotify-player"
                                                    ></iframe>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {history.length > 0 && (
                            <div className="sr-history-section">
                                <h3>Recent Recommendations</h3>
                                <div className="sr-history-list">
                                    {history.map(item => (
                                        <div key={item.id} className="sr-history-item">
                                            <img
                                                src={item.song.album_art}
                                                alt={`${item.song.name} album art`}
                                                className="sr-history-image"
                                            />
                                            <div className="sr-history-info">
                                                <h4>{item.song.name}</h4>
                                                <p>{item.song.artist}</p>
                                            </div>
                                            <div className="sr-history-actions">
                                                <div className="sr-history-timestamp">
                                                    <Clock size={16} />
                                                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <button
                                                    onClick={() => deleteHistoryItem(item.id)}
                                                    className="sr-delete-button"
                                                    aria-label="Delete recommendation"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SongRecommenderPage;