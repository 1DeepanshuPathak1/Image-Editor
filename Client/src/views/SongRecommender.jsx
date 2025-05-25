import React, { useState, useEffect } from 'react';
import { Upload, X, Share2, Loader, RefreshCw } from 'lucide-react';
import '../css/SongRecommender.css';
import FeedbackTabs from '../Components/SongRecComp/FeedbackTabs';
import SongFeedback from '../Components/SongRecComp/FeedbackDialog';
import { ArtistSearch, CustomSelect, genreOptions, moodOptions, popularityOptions, languageOptions } from '../Components/SongRecComp/AdvancedOptions';
import { useImageHandling } from '../Components/SongRecComp/ImageHandling';
import { useSongHandling } from '../Components/SongRecComp/SongHandling';
import SongScoreDisplay from '../Components/SongRecComp/SongScoreDisplay';
import ArtistPreferences from '../Components/SongRecComp/ArtistPreferences';
import SongFeedbackHandler from '../Components/SongRecComp/SongFeedbackHandler';
import AlertDialog from '../..//utils/components/ui/alert-dialog';

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
    const [savedSongs, setSavedSongs] = useState([]);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);
    const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(true);

    useEffect(() => {
        const storedConnection = sessionStorage.getItem('spotifyConnected');
        if (storedConnection === 'true') {
            setIsSpotifyConnected(true);
            setIsDialogOpen(false);
        }
    }, []);

    const toggleSpotifyConnection = () => {
        const newState = !isSpotifyConnected;
        setIsSpotifyConnected(newState);
        setIsDialogOpen(!newState);
        sessionStorage.setItem('spotifyConnected', newState.toString());
    };

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

    const { selectedImage, handleImageUpload, handleRemoveImage } = useImageHandling();
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
                if (!response.ok) {
                    throw new Error(`Failed to fetch preferences: ${response.status}`);
                }
                const data = await response.json();

                setLikedSongs(data.likedSongs || []);
                setDislikedSongs(data.dislikedSongs || []);
                setLikedArtists(data.likedArtists || []);
                setDislikedArtists(data.dislikedArtists || []);
                setSavedSongs(data.savedSongs || []);
            } catch (error) {
                console.error('Error fetching user preferences:', error);
                setError('Failed to fetch user preferences. Please try again.');
            }
        };

        fetchUserPreferences();
    }, [userId]);

    const { handleFeedback, handleSaveSong, handleDeleteItem, handleArtistRemove } = SongFeedbackHandler({
        userId,
        setLikedSongs,
        setDislikedSongs,
        setLikedArtists,
        setDislikedArtists,
        setSavedSongs,
        setHistory,
        selectedImage,
        imageAnalysis,
        maxHistoryItems,
    });

    useEffect(() => {
        setHistory([]);
    }, []);

    if (!isSpotifyConnected) {
        return (
            <AlertDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onConfirm={toggleSpotifyConnection}
            />
        );
    }

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
                                    <ArtistPreferences
                                        likedArtists={likedArtists}
                                        dislikedArtists={dislikedArtists}
                                        onArtistRemove={handleArtistRemove}
                                        userId={userId}
                                    />
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
                                                onSaveSong={handleSaveSong}
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
                            savedItems={savedSongs}
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