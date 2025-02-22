import React, { useState } from 'react';
import { Clock, Heart, ThumbsDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './css/FeedbackTabs.css';

const ITEMS_PER_PAGE = 5;
const MAX_ITEMS = 50;

const RecommendationItem = ({ item, onDelete, tabType, userId }) => {
  const getSongData = () => {
    if (tabType === 'recent') {
      return item.song || item;
    }
    
    return {
      name: item.name,
      artist: item.artist,
      uri: `spotify:track:${item.songId}`,
      album_art: item.songData?.album_art || item.album_art,
      external_url: item.external_url
    };
  };

  const songData = getSongData();
  
  if (!songData) {
    console.warn('Invalid song data received:', item);
    return null;
  }

  const handleDelete = async () => {
    const songId = item.songId || (songData.uri && songData.uri.split(':')[2]);
    if (!songId) {
      console.error('No valid song ID found for deletion');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3000/api/songs/history/${userId}/${songId}`, {
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

  const albumArtUrl = songData.album_art || 
                     (item.songData && item.songData.album_art) || 
                     (item.song && item.song.album_art) || 
                     '/default-album-art.jpg';

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
          <img
            src={albumArtUrl}
            alt={`${songData.name || 'Unknown'} album art`}
            className="sr-history-image"
          />
          <div className="sr-text-content">
            <h4 className="sr-text-truncate" data-tooltip={songData.name}>
              {songData.name || 'Unknown Track'}
            </h4>
            <p className="sr-text-truncate">
              {songData.artist || 'Unknown Artist'}
            </p>
          </div>
        </div>

        <div className="sr-divider"></div>

        <div className="sr-player-container">
          {songData.uri && (
            <iframe
              src={`https://open.spotify.com/embed/track/${songData.uri.split(':')[2]}`}
              width="100%"
              height="80"
              frameBorder="0"
              allowtransparency="true"
              allow="encrypted-media"
              className="sr-spotify-player"
            ></iframe>
          )}
        </div>
      </div>
    </div>
  );
};
const FeedbackTabs = ({ activeTab, onTabChange, recentItems, likedItems, dislikedItems, onDeleteItem, userId }) => {
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
      
      // Add left arrow
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

      // Calculate visible page range
      let startPage = Math.max(1, currentPage - 1);
      let endPage = Math.min(totalPages, currentPage + 1);

      // Adjust range for edge cases
      if (currentPage <= 2) {
        endPage = Math.min(4, totalPages);
      } else if (currentPage >= totalPages - 1) {
        startPage = Math.max(1, totalPages - 3);
      }

      // First page
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

      // Visible pages
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

      // Last page
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

      // Add right arrow
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackTabs;