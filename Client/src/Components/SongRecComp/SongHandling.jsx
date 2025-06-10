import { useState, useEffect, useRef } from 'react';

// SongHandling.jsx - Update the handleSuggestSong function
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
    const [currentIndex, setCurrentIndex] = useState(0);
    const audioRef = useRef(null);
    const OFFSET_INCREMENT = 15;

    const handleSuggestSong = async () => {
        if (!userId) {
            setError('User ID is required to suggest a song. Please try logging in again.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setCurrentIndex(0);
        
        try {
            const base64Response = await fetch(selectedImage);
            const blob = await base64Response.blob();

            const formData = new FormData();
            formData.append('image', blob, 'image.jpg');
            formData.append('userId', userId);

            if (showAdvanced) {
                const preferences = {
                    genre,
                    mood,
                    popularity,
                    language,
                    artist: selectedArtist ? selectedArtist.id : null,
                    likedSongs,
                    dislikedSongs,
                    likedArtists,
                    dislikedArtists
                };
                formData.append('preferences', JSON.stringify(preferences));
            }

            // Log the formData contents
            const formDataEntries = {};
            for (let [key, value] of formData.entries()) {
                formDataEntries[key] = value;
            }

            const apiResponse = await fetch(`http://localhost:3000/api/songs/recommend-song?skip=${skipCount}`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error;
                } catch (e) {
                    errorMessage = errorText || 'Failed to get song recommendation';
                }
                throw new Error(errorMessage);
            }

            const responseText = await apiResponse.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('handleSuggestSong: Failed to parse response:', responseText);
                throw new Error('Invalid response from server');
            }
            
            if (!data.rankedSongs || data.rankedSongs.length === 0) {
                throw new Error('No songs received from server');
            }

            setCachedSongs(data.rankedSongs);
            setChatResponse(data.description || 'Here\'s a song that matches your image...');
            setSuggestedSong(data.rankedSongs[0]);
            setImageAnalysis(data.analysis);

            const historyItem = {
                id: Date.now(),
                song: data.rankedSongs[0],
                imageUrl: selectedImage,
                timestamp: new Date().toISOString(),
                score: data.rankedSongs[0].score,
                analysis: data.analysis
            };

            setHistory(prev => {
                const newHistory = [historyItem, ...prev];
                return newHistory.slice(0, maxHistoryItems);
            });

        } catch (err) {
            console.error('Error in handleSuggestSong:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateSong = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError(null);
    
        try {
            const nextIndex = currentIndex + 1;
            
            if (nextIndex >= cachedSongs.length) {
                setSkipCount(prev => prev + OFFSET_INCREMENT);
                await handleSuggestSong();
                return;
            }
    
            const nextSong = cachedSongs[nextIndex];
            if (!nextSong) {
                throw new Error('No more songs available. Try different preferences.');
            }
    
            setSuggestedSong(nextSong);
            setCurrentIndex(nextIndex);
    
            const historyItem = {
                id: Date.now(),
                song: nextSong,
                imageUrl: selectedImage,
                timestamp: new Date().toISOString(),
                score: nextSong.score,
                analysis: imageAnalysis
            };
    
            setHistory(prev => {
                const newHistory = [historyItem, ...prev];
                return newHistory.slice(0, maxHistoryItems);
            });
    
        } catch (err) {
            console.error('Error regenerating song:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
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