import React, { useState, useEffect } from 'react';
import { Upload, X, Share2, Loader, RefreshCw } from 'lucide-react';
import '../css/SongRecommender.css';
import FeedbackTabs from '../Components/SongRecComp/FeedbackTabs';
import SongFeedback from '../Components/SongRecComp/FeedbackDialog';
import { ArtistSearch, CustomSelect, genreOptions, moodOptions, popularityOptions, languageOptions } from '../Components/SongRecComp/AdvancedOptions';
import { useImageHandling } from '../Components/SongRecComp/ImageHandling';
import { useSongHandling } from '../Components/SongRecComp/SongHandling';
import SongScoreDisplay from '../Components/SongRecComp/SongScoreDisplay';

const SongRecommenderPage = () => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [genre, setGenre] = useState('');
    const [mood, setMood] = useState('');
    const [popularity, setPopularity] = useState('');
    const [language, setLanguage] = useState('');
    const [activeTab, setActiveTab] = useState('recent');
    const [history, setHistory] = useState([]);
    const [likedSongs, setLikedSongs] = useState([]);
    const [dislikedSongs, setDislikedSongs] = useState([]);
    const [likedArtists, setLikedArtists] = useState([]);
    const [dislikedArtists, setDislikedArtists] = useState([]);
    const [userId, setUserId] = useState(null);
    // Replace the existing useEffect for fetching userId with this:
    useEffect(() => {
        const fetchUserId = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/user', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('User data received:', data);

                if (data.userId) {
                    setUserId(data.userId);
                } else {
                    console.log('No user ID in response');
                }
            } catch (error) {
                console.error('Failed to fetch user ID:', error);
            }
        };

        fetchUserId();
    }, []);


    const maxHistoryItems = 50;

    const { selectedImage, error, handleImageUpload, handleRemoveImage, setError } = useImageHandling();
    const { chatResponse, suggestedSong, isLoading, imageAnalysis, handleSuggestSong, handleRegenerateSong, shareSong } =
        useSongHandling(
            selectedImage,
            showAdvanced,
            genre,
            mood,
            popularity,
            language,
            selectedArtist,
            setHistory,
            likedSongs,
            dislikedSongs,
            likedArtists,
            dislikedArtists,
            userId,
            maxHistoryItems
        );

    useEffect(() => {
        const fetchUserPreferences = async () => {
            try {
                if (!userId) return;

                const response = await fetch(`http://localhost:3000/api/songs/preferences/${userId}`);
                const data = await response.json();

                setLikedSongs(data.likedSongs || []);
                setDislikedSongs(data.dislikedSongs || []);
                setLikedArtists(data.likedArtists || []);
                setDislikedArtists(data.dislikedArtists || []);
            } catch (error) {
                console.error('Error fetching user preferences:', error);
            }
        };

        fetchUserPreferences();
    }, [userId]);

    // Handle feedback (like/dislike) for songs or artists
    const handleFeedback = async (type, scope, song) => {
        if (!userId || !song || !song.uri) {
            console.error('Invalid user ID or song data');
            setError('Invalid user ID or song data');
            return;
        }

        try {
            const songData = {
                name: song.name,
                artist: song.artist,
                artist_id: song.artist_id,
                uri: song.uri,
                preview_url: song.preview_url,
                external_url: song.external_url,
                album_art: song.album_art,
                genre: song.genre,
                mood: imageAnalysis?.mood
            };

            const response = await fetch('http://localhost:3000/api/songs/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    songId: song.uri.split(':')[2],
                    artistId: song.artist_id,
                    type,
                    scope,
                    userId,
                    songData
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server error:', errorData);
                throw new Error(errorData.error || 'Failed to save feedback');
            }

            const data = await response.json();

            // Update local state based on feedback
            if (scope === 'song') {
                if (type === 'like') {
                    setDislikedSongs(prev => prev.filter(s => s.songId !== song.uri.split(':')[2]));
                    setLikedSongs(prev => {
                        const exists = prev.some(s => s.songId === song.uri.split(':')[2]);
                        return exists ? prev : [...prev, {
                            songId: song.uri.split(':')[2],
                            name: song.name,
                            artist: song.artist,
                            artistId: song.artist_id,
                            album_art: song.album_art,
                            timestamp: new Date()
                        }];
                    });
                } else {
                    setLikedSongs(prev => prev.filter(s => s.songId !== song.uri.split(':')[2]));
                    setDislikedSongs(prev => {
                        const exists = prev.some(s => s.songId === song.uri.split(':')[2]);
                        return exists ? prev : [...prev, {
                            songId: song.uri.split(':')[2],
                            name: song.name,
                            artist: song.artist,
                            artistId: song.artist_id,
                            album_art: song.album_art,
                            timestamp: new Date()
                        }];
                    });
                }
            } else if (scope === 'artist') {
                if (type === 'like') {
                    setDislikedArtists(prev => prev.filter(a => a.artistId !== song.artist_id));
                    setLikedArtists(prev => {
                        const exists = prev.some(a => a.artistId === song.artist_id);
                        return exists ? prev : [...prev, {
                            artistId: song.artist_id,
                            name: song.artist,
                            timestamp: new Date()
                        }];
                    });
                } else {
                    setLikedArtists(prev => prev.filter(a => a.artistId !== song.artist_id));
                    setDislikedArtists(prev => {
                        const exists = prev.some(a => a.artistId === song.artist_id);
                        return exists ? prev : [...prev, {
                            artistId: song.artist_id,
                            name: song.artist,
                            timestamp: new Date()
                        }];
                    });
                }
            }

            // Update history with feedback
            setHistory(prev => {
                const updatedHistory = prev.map(item => {
                    if (item.song.uri === song.uri) {
                        return { ...item, feedback: { type, scope } };
                    }
                    return item;
                });
                return updatedHistory;
            });

        } catch (error) {
            console.error('Error saving feedback:', error);
            setError('Failed to save feedback. Please try again.');
        }
    };

    // Clear recent recommendations on page refresh
    useEffect(() => {
        setHistory([]);
    }, []);

    const handleDeleteItem = async (songId) => {
        setHistory(prev => prev.filter(item => {
            const itemId = item.song?.uri?.split(':')[2] || item.id;
            return itemId !== songId;
        }));
        setLikedSongs(prev => prev.filter(item => item.songId !== songId));
        setDislikedSongs(prev => prev.filter(item => item.songId !== songId));
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
                                    <div className="sr-advanced-section">
                                        <label className="sr-label">Artist</label>
                                        <ArtistSearch onSelect={setSelectedArtist} />
                                    </div>

                                    <div className="sr-advanced-section">
                                        <label className="sr-label">Genre</label>
                                        <CustomSelect
                                            options={genreOptions}
                                            value={genre}
                                            onChange={setGenre}
                                            placeholder="Select Genre"
                                        />
                                    </div>

                                    <div className="sr-advanced-section">
                                        <label className="sr-label">Mood</label>
                                        <CustomSelect
                                            options={moodOptions}
                                            value={mood}
                                            onChange={setMood}
                                            placeholder="Select Mood"
                                        />
                                    </div>

                                    <div className="sr-advanced-section">
                                        <label className="sr-label">Artist Popularity</label>
                                        <CustomSelect
                                            options={popularityOptions}
                                            value={popularity}
                                            onChange={setPopularity}
                                            placeholder="Select Popularity"
                                        />
                                    </div>

                                    <div className="sr-advanced-section">
                                        <label className="sr-label">Language</label>
                                        <CustomSelect
                                            options={languageOptions}
                                            value={language}
                                            onChange={setLanguage}
                                            placeholder="Select Language"
                                        />
                                    </div>
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
                                        <div className="sr-songs-info">
                                            <h3>{suggestedSong.name}</h3>
                                            <p>{suggestedSong.artist}</p>
                                        </div>
                                        <SongScoreDisplay score={suggestedSong.score} />
                                        <div className="sr-song-actions">
                                            <SongFeedback
                                                suggestedSong={suggestedSong}
                                                onFeedbackChange={handleFeedback}
                                            />
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

                                        <iframe
                                            src={`https://open.spotify.com/embed/track/${suggestedSong.uri.split(':')[2]}`}
                                            width="100%"
                                            height="80"
                                            frameBorder="0"
                                            allowtransparency="true"
                                            allow="encrypted-media"
                                            className="sr-spotify-player"
                                        ></iframe>

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

                        <FeedbackTabs
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            recentItems={history}
                            likedItems={likedSongs}
                            dislikedItems={dislikedSongs}
                            onDeleteItem={handleDeleteItem}
                            userId={userId}  
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SongRecommenderPage;