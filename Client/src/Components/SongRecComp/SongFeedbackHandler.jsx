import React, { useState, useEffect } from 'react';

const SongFeedbackHandler = ({
    userId,
    setLikedSongs,
    setDislikedSongs,
    setLikedArtists,
    setDislikedArtists,
    setSavedSongs,
    setHistory,
    selectedImage,
    imageAnalysis,
}) => {
    const [error, setError] = useState(null);

    const handleFeedback = async (type, scope, song) => {
        if (!userId || !song || !song.uri) {
            console.error('Invalid user ID or song data');
            setError('Invalid user ID or song data');
            return;
        }

        try {
            const genre = Array.isArray(song.genres) ? song.genres[0] : song.genre || '';
            const songData = {
                name: song.name,
                artist: song.artist,
                artist_id: song.artist_id,
                uri: song.uri,
                external_url: song.external_url,
                album_art: song.album_art,
                genre: genre,
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

    const handleSaveSong = async (song) => {
        if (!userId || !song || !song.uri || !selectedImage) {
            console.error('Invalid user ID, song data, or no image selected');
            setError('Cannot save song: Missing required data');
            return;
        }

        try {
            const formData = new FormData();
            const imageResponse = await fetch(selectedImage);
            if (!imageResponse.ok) {
                throw new Error('Failed to fetch image');
            }
            const imageBlob = await imageResponse.blob();
            formData.append('image', imageBlob);
            formData.append('songId', song.uri.split(':')[2]);
            formData.append('userId', userId);
            formData.append('songData', JSON.stringify({
                name: song.name || 'Unknown Track',
                artist: song.artist || 'Unknown Artist',
                artist_id: song.artist_id,
                uri: song.uri,
                external_url: song.external_url,
                album_art: song.album_art || '/default-album-art.jpg',
                genre: song.genre || '',
                mood: imageAnalysis?.mood
            }));

            const response = await fetch('http://localhost:3000/api/songs/save-song', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server error:', errorData);
                throw new Error(errorData.error || 'Failed to save song');
            }

            const data = await response.json();
            setSavedSongs(prev => {
                const exists = prev.some(s => s.songId === song.uri.split(':')[2]);
                if (!exists) {
                    return [...prev, {
                        songId: song.uri.split(':')[2],
                        name: song.name || 'Unknown Track',
                        artist: song.artist || 'Unknown Artist',
                        artistId: song.artist_id,
                        album_art: song.album_art || '/default-album-art.jpg',
                        uri: song.uri,
                        image: selectedImage,
                        timestamp: new Date()
                    }];
                }
                return prev;
            });

        } catch (error) {
            console.error('Error saving song:', error);
            setError(`Failed to save song: ${error.message}`);
        }
    };

    const handleDeleteItem = async (songId) => {
        setHistory(prev => prev.filter(item => {
            const itemId = item.song?.uri?.split(':')[2] || item.id;
            return itemId !== songId;
        }));
        setLikedSongs(prev => prev.filter(item => item.songId !== songId));
        setDislikedSongs(prev => prev.filter(item => item.songId !== songId));
        setSavedSongs(prev => prev.filter(item => item.songId !== songId));
    };

    const handleArtistRemove = (artistId, type) => {
        if (type === 'liked') {
            setLikedArtists(prev => prev.filter(artist => artist.artistId !== artistId));
        } else {
            setDislikedArtists(prev => prev.filter(artist => artist.artistId !== artistId));
        }
    };

    return { error, handleFeedback, handleSaveSong, handleDeleteItem, handleArtistRemove };
};

export default SongFeedbackHandler;