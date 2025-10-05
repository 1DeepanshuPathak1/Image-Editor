import React, { useState } from 'react';
import { Clock, Heart, ThumbsDown, X, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import './css/FeedbackTabs.css';

const ITEMS_PER_PAGE = 5;
const MAX_ITEMS = 250;

const RecommendationItem = ({ item, onDelete, tabType, userId }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const getSongData = () => {
    if (tabType === 'recent') {
      return {
        name: item.song?.name || 'Unknown Track',
        artist: item.song?.artist || 'Unknown Artist',
        uri: item.song?.uri || `spotify:track:${item.song?.songId || item.id}`,
        album_art: item.song?.album_art || '/default-album-art.jpg',
        external_url: item.song?.external_url || ''
      };
    }
    if (tabType === 'saved') {
      return {
        name: item.name || 'Unknown Track',
        artist: item.artist || 'Unknown Artist',
        uri: item.uri || `spotify:track:${item.songId}`,
        album_art: item.album_art || '/default-album-art.jpg',
        external_url: item.external_url || '',
        image: item.image
      };
    }
    
    return {
      name: item.name || 'Unknown Track',
      artist: item.artist || 'Unknown Artist',
      uri: `spotify:track:${item.songId}`,
      album_art: item.songData?.album_art || item.album_art || '/default-album-art.jpg',
      external_url: item.external_url || ''
    };
  };

  const songData = getSongData();
  
  if (!songData) {
    console.warn('Invalid song data received:', item);
    return null;
  }

  const handleDelete = async () => {
    const songId = item.songId || (songData.uri && songData.uri.split(':')[2]) || item.id;
    if (!songId) {
      console.error('No valid song ID found for deletion');
      return;
    }
    
    try {
      const endpoint = tabType === 'saved' 
        ? `${import.meta.env.VITE_SERVER_URL}/api/songs/saved/${userId}/${songId}`
        : `${import.meta.env.VITE_SERVER_URL}/api/songs/history/${userId}/${songId}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete song');
      }

      onDelete(songId);
    } catch (error) {
      console.error('Error deleting song:', error);
    }
  };

  const albumArtUrl = songData.album_art || '/default-album-art.jpg';

  const handleImageInteraction = () => {
    setIsFlipped(!isFlipped);
  };

  const trackId = songData.uri ? songData.uri.split(':')[2] : null;
  if (!trackId) {
    console.error('Invalid track ID for song:', songData);
  }

  return (
    <div className="sr-history-item">
      <button
        className="sr-delete-button"
        onClick={handleDelete}
        aria-label="Delete recommendation"
      >
        <X size={16} />
      </button>

      <div className="sr-history-content">
        <div className="sr-song-info">
          {tabType === 'saved' && songData.image ? (
            <div 
              className="sr-image-flipper"
              onClick={handleImageInteraction}
              onMouseEnter={() => setIsFlipped(true)}
              onMouseLeave={() => setIsFlipped(false)}
            >
              <div className={`sr-image-container ${isFlipped ? 'flipped' : ''}`}>
                <img
                  src={songData.image}
                  alt="Uploaded image"
                  className="sr-history-image-uploaded front"
                />
                <img
                  src={albumArtUrl}
                  alt={`${songData.name} album art`}
                  className="sr-history-image back"
                />
              </div>
            </div>
          ) : (
            <img
              src={albumArtUrl}
              alt={`${songData.name} album art`}
              className="sr-history-image"
            />
          )}
          <div className="sr-text-content">
            <h4 className="sr-text-truncate" data-tooltip={songData.name}>
              {songData.name}
            </h4>
            <p className="sr-text-truncate">
              {songData.artist}
            </p>
          </div>
        </div>

        <div className="sr-divider"></div>

        <div className="sr-player-container">
          {trackId ? (
            <iframe
              src={`https://open.spotify.com/embed/track/${trackId}`}
              width="100%"
              height="80"
              frameBorder="0"
              allowtransparency="true"
              allow="encrypted-media"
              className="sr-spotify-player"
              title={`${songData.name} by ${songData.artist}`}
              loading="lazy"
            ></iframe>
          ) : (
            <div className="sr-player-error">
              Unable to load player: Invalid track ID
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FeedbackTabs = ({ activeTab, onTabChange, recentItems, likedItems, dislikedItems, savedItems, onDeleteItem, userId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [prevPage, setPrevPage] = useState(null);
  const [animationDirection, setAnimationDirection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const getCurrentItems = () => {
    let items;
    switch (activeTab) {
      case 'recent':
        items = recentItems;
        break;
      case 'liked':
        items = [...likedItems].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        break;
      case 'disliked':
        items = [...dislikedItems].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        break;
      case 'saved':
        items = [...savedItems].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        break;
      default:
        items = [];
    }

    items = items.slice(0, MAX_ITEMS);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return items.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    let totalItems;
    switch (activeTab) {
      case 'recent':
        totalItems = Math.min(recentItems.length, MAX_ITEMS);
        break;
      case 'liked':
        totalItems = Math.min(likedItems.length, MAX_ITEMS);
        break;
      case 'disliked':
        totalItems = Math.min(dislikedItems.length, MAX_ITEMS);
        break;
      case 'saved':
        totalItems = Math.min(savedItems.length, MAX_ITEMS);
        break;
      default:
        totalItems = 0;
    }
    return Math.ceil(totalItems / ITEMS_PER_PAGE);
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber === currentPage || isAnimating) return;

    setIsAnimating(true);
    setPrevPage(currentPage);
    setAnimationDirection(pageNumber > currentPage ? 'forward' : 'backward');
    setCurrentPage(pageNumber);
    setTimeout(() => {
      setIsAnimating(false);
    }, 400); 
  };

  React.useEffect(() => {
    setCurrentPage(1);
    setPrevPage(null);
    setAnimationDirection(null);
  }, [activeTab]);

  const totalPages = getTotalPages();
  const currentItems = getCurrentItems();

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
      const pageNumbers = [];
      
      pageNumbers.push(
        <button
          key="prev"
          className="sr-pagination-button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isAnimating}
        >
          <ChevronLeft size={16} />
        </button>
      );

      let startPage = Math.max(1, currentPage - 1);
      let endPage = Math.min(totalPages, currentPage + 1);

      if (currentPage <= 2) {
        endPage = Math.min(4, totalPages);
      } else if (currentPage >= totalPages - 1) {
        startPage = Math.max(1, totalPages - 3);
      }

      if (startPage > 1) {
        pageNumbers.push(
          <button
            key={1}
            className={`sr-pagination-number ${1 === currentPage ? 'sr-pagination-number-active' : ''}`}
            onClick={() => handlePageChange(1)}
            disabled={isAnimating}
          >
            1
          </button>
        );

        if (startPage > 2) {
          pageNumbers.push(
            <span key="start-ellipsis" className="sr-pagination-ellipsis">...</span>
          );
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        let animationClass = '';
        
        if (animationDirection === 'forward') {
          if (i === currentPage) {
            animationClass = 'fade-in-right scale-up';
          } else if (i === prevPage) {
            animationClass = 'fade-out-left scale-down';
          }
        } else if (animationDirection === 'backward') {
          if (i === currentPage) {
            animationClass = 'fade-in-left scale-up';
          } else if (i === prevPage) {
            animationClass = 'fade-out-right scale-down';
          }
        }

        pageNumbers.push(
          <button
            key={i}
            className={`sr-pagination-number ${i === currentPage ? 'sr-pagination-number-active' : ''} ${animationClass}`}
            onClick={() => handlePageChange(i)}
            disabled={isAnimating}
          >
            {i}
          </button>
        );
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pageNumbers.push(
            <span key="end-ellipsis" className="sr-pagination-ellipsis">...</span>
          );
        }
        
        pageNumbers.push(
          <button
            key={totalPages}
            className={`sr-pagination-number ${totalPages === currentPage ? 'sr-pagination-number-active' : ''}`}
            onClick={() => handlePageChange(totalPages)}
            disabled={isAnimating}
          >
            {totalPages}
          </button>
        );
      }

      pageNumbers.push(
        <button
          key="next"
          className="sr-pagination-button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isAnimating}
        >
          <ChevronRight size={16} />
        </button>
      );

      return pageNumbers;
    };

    return (
      <div className="sr-pagination">
        <div className="sr-pagination-numbers-container">
          {renderPageNumbers()}
        </div>
      </div>
    );
  };

  return (
    <div className="sr-tabs-container">
      <div className="sr-tabs-list">
        <button
          className={`sr-tab ${activeTab === 'recent' ? 'sr-tab-active' : ''}`}
          onClick={() => onTabChange('recent')}
        >
          <Clock size={16} />
          Recent
        </button>
        <button
          className={`sr-tab ${activeTab === 'liked' ? 'sr-tab-active' : ''}`}
          onClick={() => onTabChange('liked')}
        >
          <Heart size={16} />
          Liked
        </button>
        <button
          className={`sr-tab ${activeTab === 'disliked' ? 'sr-tab-active' : ''}`}
          onClick={() => onTabChange('disliked')}
        >
          <ThumbsDown size={16} />
          Disliked
        </button>
        <button
          className={`sr-tab ${activeTab === 'saved' ? 'sr-tab-active' : ''}`}
          onClick={() => onTabChange('saved')}
        >
          <Bookmark size={16} />
          Saved
        </button>
      </div>

      <div className="sr-tab-content">
        <div className="sr-tab-panel">
          {currentItems.length > 0 ? (
            <>
              {currentItems.map((item, index) => (
                <RecommendationItem
                  key={`${activeTab}-${item.id || item.songId || index}`}
                  item={item}
                  onDelete={onDeleteItem}
                  tabType={activeTab}
                  userId={userId}
                />
              ))}
              <Pagination />
            </>
          ) : (
            <div className="sr-empty-state">
              {activeTab === 'recent' && 'No recent recommendations'}
              {activeTab === 'liked' && 'No liked songs yet'}
              {activeTab === 'disliked' && 'No disliked songs yet'}
              {activeTab === 'saved' && 'No saved songs yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackTabs;