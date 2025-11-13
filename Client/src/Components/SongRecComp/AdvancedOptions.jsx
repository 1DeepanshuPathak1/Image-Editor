import  { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Loader } from 'lucide-react';
import './css/ArtistSearch.css';

export const genreOptions = [
    { value: "pop", label: "Pop" },
    { value: "rock", label: "Rock" },
    { value: "hip-hop", label: "Hip Hop" },
    { value: "r-n-b", label: "R&B" },
    { value: "electronic", label: "Electronic" },
    { value: "classical", label: "Classical" },
    { value: "jazz", label: "Jazz" },
    { value: "indie", label: "Indie" },
    { value: "metal", label: "Metal" },
    { value: "folk", label: "Folk" },
    { value: "blues", label: "Blues" },
    { value: "country", label: "Country" },
    { value: "latin", label: "Latin" },
    { value: "reggae", label: "Reggae" }
];

export const moodOptions = [
    { value: "happy", label: "Happy" },
    { value: "calm", label: "Calm" },
    { value: "energetic", label: "Energetic" },
    { value: "melancholic", label: "Melancholic" },
    { value: "romantic", label: "Romantic" },
    { value: "dark", label: "Dark" },
    { value: "dreamy", label: "Dreamy" },
    { value: "epic", label: "Epic" },
    { value: "angry", label: "Angry" },
    { value: "peaceful", label: "Peaceful" }
];

export const popularityOptions = [
    { value: "any", label: "Any Popularity" },
    { value: "mainstream", label: "Mainstream (1M+ monthly listeners)" },
    { value: "rising", label: "Rising Artists (100K-1M listeners)" },
    { value: "underground", label: "Underground (10K-100K listeners)" },
    { value: "undiscovered", label: "Undiscovered (Under 10K listeners)" }
];

export const languageOptions = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "ko", label: "Korean" },
    { value: "ja", label: "Japanese" },
    { value: "hi", label: "Hindi" },
    { value: "ar", label: "Arabic" }
];

export const ArtistSearch = ({ onSelect, userId }) => {
    const [query, setQuery] = useState('');
    const [artists, setArtists] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchArtists = async () => {
            if (query.length < 1) {
                setArtists([]);
                return;
            }
            setLoading(true);
            try {
                const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/songs/search-artists?q=${query}&userId=${userId}`);
                const data = await response.json();
                setArtists(data.artists);
            } catch (error) {
                console.error('Error fetching artists:', error);
            }
            setLoading(false);
        };

        const debounce = setTimeout(fetchArtists, 300);
        return () => clearTimeout(debounce);
    }, [query, userId]);

    return (
        <div className="sr-artist-search" ref={dropdownRef}>
            <div className="sr-search-input-wrapper">
                <Search className="sr-search-icon" size={16} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onClick={() => setIsOpen(true)}
                    placeholder="Search for artists..."
                    className="sr-search-input"
                />
            </div>
            {isOpen && (query || artists.length > 0) && (
                <div className="sr-artist-dropdown">
                    {loading ? (
                        <div className="sr-dropdown-loading">
                            <Loader className="sr-spinner" size={16} />
                            <span>Searching...</span>
                        </div>
                    ) : artists.length > 0 ? (
                        artists.map((artist) => (
                            <div
                                key={artist.id}
                                className="sr-artist-option"
                                onClick={() => {
                                    onSelect(artist);
                                    setQuery(artist.name);
                                    setIsOpen(false);
                                }}
                            >
                                {artist.images?.[2]?.url && (
                                    <img
                                        src={artist.images[2].url}
                                        alt={artist.name}
                                        className="sr-artist-option-image"
                                    />
                                )}
                                <div className="sr-artist-option-info">
                                    <span className="sr-artist-option-name">{artist.name}</span>
                                    <span className="sr-artist-option-followers">
                                        {artist.followers.total.toLocaleString()} followers
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : query && (
                        <div className="sr-no-results">No artists found</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const CustomSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    return (
        <div className="sr-select-container" ref={selectRef}>
            <div className="sr-select-trigger" onClick={() => setIsOpen(!isOpen)}>
                <span>{value ? options.find(opt => opt.value === value)?.label : placeholder}</span>
                <div className="sr-select-actions">
                    {value && (
                        <button
                            className="sr-select-clear"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                        >
                            ✕
                        </button>
                    )}
                    <ChevronDown
                        size={16}
                        className={`sr-select-chevron ${isOpen ? 'sr-select-chevron-open' : ''}`}
                    />
                </div>
            </div>
            {isOpen && (
                <div className="sr-select-dropdown">
                    <div
                        className="sr-select-option sr-select-option-clear"
                        onClick={() => {
                            onChange('');
                            setIsOpen(false);
                        }}
                    >
                        Clear selection
                    </div>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`sr-select-option ${value === option.value ? 'sr-select-option-selected' : ''}`}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};