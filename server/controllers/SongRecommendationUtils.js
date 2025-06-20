class SongRecommendationSystem {
    constructor() {
        this.weights = {
            artistLike: 30,
            artistDislike: -60,
            songLike: 15,
            songDislike: -15,
            genreMatch: 20,
            genreMismatch: -20,
            moodPreference: 15,
            moodMatch: 10,
            languageMatch: 15,
            popularityMatch: 5
        };

        this.suggestedSongs = new Set();
    }

    markSongAsSuggested(uri) {
        this.suggestedSongs.add(uri);
    }

    isInSamePopularityRange(pop1, pop2) {
        return Math.abs(pop1 - pop2) <= 20;
    }

    calculateSongScore(song, userPreferences) {
        if (!song || !userPreferences) return 50;
    
        let score = song.score || song.popularity || 50;
    
        if (userPreferences.likedArtists?.some(artist => artist.artistId === song.artist_id)) {
            score += this.weights.artistLike;
        }
        if (userPreferences.dislikedArtists?.some(artist => artist.artistId === song.artist_id)) {
            score += this.weights.artistDislike;
        }
    
        if (userPreferences.likedSongs?.some(s => s.songId === song.uri.split(':')[2])) {
            score += this.weights.songLike;
        }
        if (userPreferences.dislikedSongs?.some(s => s.songId === song.uri.split(':')[2])) {
            score += this.weights.songDislike;
        }
    
        const songGenre = song.genre || '';
        
        const genreMatchCount = userPreferences.likedSongs?.filter(
            likedSong => likedSong.genre === songGenre
        ).length || 0;
        
        if (genreMatchCount > 0) {
            score += this.weights.genreMatch;
        }
    
        const genreMismatchCount = userPreferences.dislikedSongs?.filter(
            dislikedSong => dislikedSong.genre === songGenre
        ).length || 0;
    
        if (genreMismatchCount > 0) {
            score += this.weights.genreMismatch;
        }
    
        if (song.mood) {
            if (userPreferences.preferredMoods?.includes(song.mood)) {
                score += this.weights.moodPreference;
            }
    
            const moodMatchCount = userPreferences.likedSongs?.filter(
                s => s.mood === song.mood
            ).length || 0;
            score += this.weights.moodMatch * Math.min(moodMatchCount, 3);
        }
    
        if (song.language && userPreferences.preferredLanguages?.includes(song.language)) {
            score += this.weights.languageMatch;
        }
    
        if (userPreferences.popularity && userPreferences.popularity !== 'any') {
            const popularityThresholds = {
                'mainstream': 70,
                'rising': 50,
                'underground': 30,
                'undiscovered': 0
            };
            
            const minPopularity = popularityThresholds[userPreferences.popularity];
            if (song.artistPopularity >= minPopularity) {
                score += this.weights.popularityMatch * 2; 
            } else {
                score -= this.weights.popularityMatch; 
            }
        }
    
        return Math.max(0, Math.min(100, score));
    }

    async rankAndFilterSongs(songs, userPreferences) {
        const newSongs = songs.filter(song => !this.suggestedSongs.has(song.uri));

        const scoredSongs = newSongs.map(song => ({
            ...song,
            score: this.calculateSongScore(song, userPreferences)
        }));

        return scoredSongs.sort((a, b) => b.score - a.score);
    }
}

module.exports = new SongRecommendationSystem();