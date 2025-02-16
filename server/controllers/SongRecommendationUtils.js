class SongRecommendationSystem {
    constructor() {
        this.weights = {

            artistLike: 30,
            artistDislike: -30,

            songLike: 15,
            songDislike: -15,

            genreLike: 20,
            genreDislike: -20,
            genreMatch: 10,

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

        if (song.genre) {
            if (userPreferences.likedGenres?.includes(song.genre)) {
                score += this.weights.genreLike;
            }
            if (userPreferences.dislikedGenres?.includes(song.genre)) {
                score += this.weights.genreDislike;
            }

            const genreMatchCount = userPreferences.likedSongs?.filter(
                s => s.genre === song.genre
            ).length || 0;
            score += this.weights.genreMatch * Math.min(genreMatchCount, 3);
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

        if (song.popularity) {
            const popularityMatches = userPreferences.likedSongs?.filter(
                likedSong => this.isInSamePopularityRange(song.popularity, likedSong.popularity)
            ).length || 0;
            score += this.weights.popularityMatch * Math.min(popularityMatches, 3);
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