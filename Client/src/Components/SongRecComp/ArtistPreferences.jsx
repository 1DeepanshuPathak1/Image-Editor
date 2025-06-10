import React, { useState, useEffect } from 'react';
import { UserPlus, X, Plus, User, Check } from 'lucide-react';
import { ArtistSearch } from './AdvancedOptions';
import './css/ArtistPreferences.css';

const ArtistPreferences = ({ likedArtists, dislikedArtists, onArtistRemove, userId }) => {
  const [activeTab, setActiveTab] = useState('liked');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [artistImages, setArtistImages] = useState({});

  useEffect(() => {
    const fetchArtistImages = async () => {
      const allArtists = [...likedArtists, ...dislikedArtists];
      const uniqueArtists = Array.from(new Set(allArtists.map(a => a.artistId)));

      for (const artistId of uniqueArtists) {
        if (!artistImages[artistId]) {
          try {
            const response = await fetch(`http://localhost:3000/api/songs/artist/${artistId}?userId=${userId}`, {
              method: 'GET',
              credentials: 'include',
            });

            if (response.ok) {
              const data = await response.json();
              if (data.images && data.images.length > 0) {
                setArtistImages(prev => ({
                  ...prev,
                  [artistId]: data.images[0].url
                }));
              }
            }
          } catch (error) {
            console.error(`Error fetching image for artist ${artistId}:`, error);
          }
        }
      }
    };

    fetchArtistImages();
  }, [likedArtists, dislikedArtists, userId]);

  const showAddArtist = () => {
    setIsSearching(true);
    setSelectedArtists([]);
  };

  const handleArtistSelect = async (artist) => {
    if (!selectedArtists.find(a => a.id === artist.id)) {
      setSelectedArtists(prev => [...prev, artist]);
      if (artist.images && artist.images.length > 0) {
        setArtistImages(prev => ({
          ...prev,
          [artist.id]: artist.images[0].url
        }));
      }
    }
  };

  const handleRemoveSelected = (artistToRemove) => {
    setSelectedArtists(prev => prev.filter(artist => artist.id !== artistToRemove.id));
  };

  const handleAddArtists = async () => {
    if (selectedArtists.length === 0) return;

    try {
      for (const artist of selectedArtists) {
        const response = await fetch('http://localhost:3000/api/songs/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            artistId: artist.id,
            type: activeTab === 'liked' ? 'like' : 'dislike',
            scope: 'artist',
            userId,
            songId: 'artist-preference',
            songData: {
              artist: artist.name,
              artist_id: artist.id,
              images: artist.images
            }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to add artist preference');
        }

        const data = await response.json();

        if (activeTab === 'liked') {
          onArtistRemove(artist.id, 'disliked');
        } else {
          onArtistRemove(artist.id, 'liked');
        }

        const newArtist = {
          artistId: artist.id,
          name: artist.name,
          timestamp: new Date()
        };

        if (activeTab === 'liked') {
          likedArtists.push(newArtist);
        } else {
          dislikedArtists.push(newArtist);
        }

        if (artist.images && artist.images.length > 0) {
          setArtistImages(prev => ({
            ...prev,
            [artist.id]: artist.images[0].url
          }));
        }
      }

      setIsSearching(false);
      setSelectedArtists([]);

    } catch (error) {
      console.error('Error adding artist preferences:', error);
    }
  };

  const handleRemoveArtist = async (artistId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/songs/preferences/${userId}/artist/${artistId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove artist');
      }

      onArtistRemove(artistId, activeTab);
    } catch (error) {
      console.error('Error removing artist:', error);
    }
  };

  const renderEmptyState = () => {
    const messages = {
      liked: "Like your favorite artists to get more accurate song suggestions based on your taste!",
      disliked: "Add artists you'd prefer not to hear to help us customize your recommendations."
    };

    return (
      <div className="sr-empty-state">
        <User size={48} className="sr-empty-icon" />
        <p className="sr-empty-message">{messages[activeTab]}</p>
      </div>
    );
  };

  return (
    <div className="sr-artist-preferences">
      <div className="sr-artist-preferences-header">
        <div className="sr-artist-preferences-title">
          Artist Preferences
        </div>
        <button className="sr-add-artist-button" onClick={showAddArtist}>
          <UserPlus size={18} />
        </button>
      </div>

      {isSearching ? (
        <div className="sr-artist-search-container">
          <div className="sr-artist-search-header">
            Adding to {activeTab === 'liked' ? 'Liked' : 'Disliked'} Artists
          </div>
          {selectedArtists.length > 0 && (
            <div className="sr-selected-artists">
              {selectedArtists.map(artist => (
                <div key={artist.id} className="sr-selected-artist-chip">
                  {artist.images?.[2]?.url && (
                    <img
                      src={artist.images[2].url}
                      alt={artist.name}
                      className="sr-selected-artist-image"
                    />
                  )}
                  <span>{artist.name}</span>
                  <button
                    className="sr-remove-selected"
                    onClick={() => handleRemoveSelected(artist)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="sr-artist-search-wrapper">
            <div className="sr-artist-search">
              <ArtistSearch onSelect={handleArtistSelect} />
            </div>
            {selectedArtists.length > 0 ? (
              <button
                className="sr-artist-search-add"
                onClick={handleAddArtists}
              >
                <Check size={18} />
              </button>
            ) : (
              <button
                className="sr-artist-search-close"
                onClick={() => setIsSearching(false)}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="sr-artist-tabs">
            <button
              className={`sr-artist-tab ${activeTab === 'liked' ? 'active' : ''}`}
              onClick={() => setActiveTab('liked')}
            >
              Liked Artists
            </button>
            <button
              className={`sr-artist-tab ${activeTab === 'disliked' ? 'active' : ''}`}
              onClick={() => setActiveTab('disliked')}
            >
              Disliked Artists
            </button>
          </div>

          <div className="sr-artists-list">
            {(activeTab === 'liked' ? likedArtists : dislikedArtists).length === 0 ? (
              renderEmptyState()
            ) : (
              (activeTab === 'liked' ? likedArtists : dislikedArtists).map((artist) => (
                <div key={artist.artistId} className="sr-artist-item">
                  <div className="sr-artist-info">
                    <div className="sr-artist-icon">
                      {artistImages[artist.artistId] ? (
                        <img src={artistImages[artist.artistId]} alt={artist.name} />
                      ) : (
                        <div className="sr-artist-icon-placeholder">
                          <User size={16} />
                        </div>
                      )}
                    </div>
                    <span className="sr-artist-name">{artist.name}</span>
                  </div>
                  <button
                    className="sr-remove-artist"
                    onClick={() => handleRemoveArtist(artist.artistId)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ArtistPreferences;