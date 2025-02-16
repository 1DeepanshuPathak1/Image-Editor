import { useState, useEffect, useRef } from 'react';

export const useSongHandling = (
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
    maxHistoryItems = 50
) => {
    const [chatResponse, setChatResponse] = useState('');
    const [suggestedSong, setSuggestedSong] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [imageAnalysis, setImageAnalysis] = useState(null);
    const [skipCount, setSkipCount] = useState(0);
    const [cachedSongs, setCachedSongs] = useState([]);
    const audioRef = useRef(null);

    // Simple function to check if a song exists in an array
    const isSongInList = (song, list) => {
        if (!Array.isArray(list)) return false;
        for (let i = 0; i < list.length; i++) {
            if (list[i].songId === song.uri.split(':')[2]) {
                return true;
            }
        }
        return false;
    };

    const handleSuggestSong = async () => {
        setIsLoading(true);
        setError(null);
        setSkipCount(0);

        try {
            const base64Response = await fetch(selectedImage);
            const blob = await base64Response.blob();

            const formData = new FormData();
            formData.append('image', blob, 'image.jpg');

            if (showAdvanced) {
                const preferences = {
                    genre,
                    mood,
                    popularity,
                    language,
                    artist: selectedArtist ? selectedArtist.id : null
                };
                formData.append('preferences', JSON.stringify(preferences));
            }

            // Add userId to the request if available
            if (userId) {
                formData.append('userId', userId);
            }

            const apiResponse = await fetch('http://localhost:3000/api/songs/recommend-song', {
                method: 'POST',
                body: formData,
            });

            const data = await apiResponse.json();

            if (!apiResponse.ok) {
                throw new Error(data.error || 'Failed to get song recommendation');
            }

            const songsWithScores = data.rankedSongs || [{ ...data.song, score: 100 }];

            // Filter out liked/disliked songs
            const filteredSongs = songsWithScores.filter(song => 
                !isSongInList(song, likedSongs) && !isSongInList(song, dislikedSongs)
            );

            setCachedSongs(filteredSongs);

            if (filteredSongs.length === 0) {
                throw new Error('No new songs available. Try adjusting your preferences.');
            }


            const currentSong = filteredSongs[0];
            setChatResponse(data.description || 'Here\'s a song that matches your image...');
            setSuggestedSong(currentSong);
            setImageAnalysis(data.analysis);

            const historyItem = {
                id: Date.now(),
                song: currentSong,
                imageUrl: selectedImage,
                timestamp: new Date().toISOString(),
                score: currentSong.score || 100
            };

            setHistory(prev => {
                const newHistory = [historyItem, ...prev];
                return newHistory.slice(0, maxHistoryItems);
            });

        } catch (err) {
            console.error('Error in handleSuggestSong:', err);
            setError(
                err.message === 'Failed to fetch'
                    ? 'Cannot connect to the server. Please check your connection and try again.'
                    : err.message
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateSong = async () => {
        if (cachedSongs.length > skipCount + 1) {
            const nextSong = cachedSongs[skipCount + 1];

            if (!isSongInList(nextSong, likedSongs) && !isSongInList(nextSong, dislikedSongs)) {
                setSuggestedSong(nextSong);
                setSkipCount(prev => prev + 1);

                const historyItem = {
                    id: Date.now(),
                    song: nextSong,
                    imageUrl: selectedImage,
                    timestamp: new Date().toISOString(),
                    score: nextSong.score
                };

                setHistory(prev => {
                    const newHistory = [historyItem, ...prev];
                    return newHistory.slice(0, maxHistoryItems);
                });

                return;
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            const base64Response = await fetch(selectedImage);
            const blob = await base64Response.blob();

            const formData = new FormData();
            formData.append('image', blob, 'image.jpg');

            if (showAdvanced) {
                const preferences = {
                    genre,
                    mood,
                    popularity,
                    language,
                    artist: selectedArtist ? selectedArtist.id : null
                };
                formData.append('preferences', JSON.stringify(preferences));
            }

            // Add userId to the request if available
            if (userId) {
                formData.append('userId', userId);
            }

            const apiResponse = await fetch(`http://localhost:3000/api/songs/recommend-song?skip=${skipCount + 1}`, {
                method: 'POST',
                body: formData,
            });

            const data = await apiResponse.json();

            if (!apiResponse.ok) {
                throw new Error(data.error || 'Failed to regenerate song recommendation');
            }

            const newSong = data.song;
            if (isSongInList(newSong, likedSongs) || isSongInList(newSong, dislikedSongs)) {
                throw new Error('Received already rated song. Try regenerating again.');
            }

            newSong.score = newSong.score || Math.max(20, 100 - (skipCount * 15));

            setChatResponse(data.description || 'Here\'s another song that matches your image...');
            setSuggestedSong(newSong);
            setSkipCount(prev => prev + 1);

            const historyItem = {
                id: Date.now(),
                song: newSong,
                imageUrl: selectedImage,
                timestamp: new Date().toISOString(),
                score: newSong.score
            };

            setHistory(prev => {
                const newHistory = [historyItem, ...prev];
                return newHistory.slice(0, maxHistoryItems);
            });

        } catch (err) {
            console.error('Error regenerating song:', err);
            setError(err.message || 'Failed to regenerate song recommendation');
        } finally {
            setIsLoading(false);
        }
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

    useEffect(() => {
        if (suggestedSong?.preview_url && audioRef.current) {
            audioRef.current.src = suggestedSong.preview_url;
            audioRef.current.play().catch(error => {
                console.warn('Error playing audio:', error);
            });
        }
    }, [suggestedSong]);

    return {
        chatResponse,
        suggestedSong,
        isLoading,
        error,
        imageAnalysis,
        audioRef,
        handleSuggestSong,
        handleRegenerateSong,
        shareSong,
    };
};