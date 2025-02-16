import React, { useState } from 'react';
import { Clock, Heart, ThumbsDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './css/FeedbackTabs.css';

const ITEMS_PER_PAGE = 5;
const MAX_ITEMS = 50;

const FeedbackTabs = ({ activeTab, onTabChange, recentItems, likedItems, dislikedItems, onDeleteItem }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const getCurrentItems = () => {
    let items;
    switch (activeTab) {
      case 'recent':
        items = recentItems;
        break;
      case 'liked':
        items = likedItems;
        break;
      case 'disliked':
        items = dislikedItems;
        break;
      default:
        items = [];
    }

    // Keep only the most recent MAX_ITEMS
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
    setCurrentPage(pageNumber);
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const totalPages = getTotalPages();
  const currentItems = getCurrentItems();

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="sr-pagination">
        <button
          className="sr-pagination-button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="sr-pagination-numbers">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              className={`sr-pagination-number ${pageNum === currentPage ? 'sr-pagination-number-active' : ''}`}
              onClick={() => handlePageChange(pageNum)}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          className="sr-pagination-button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={16} />
        </button>
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
                  key={item.id || index} // Use item.id if available, otherwise fallback to index
                  item={item}
                  onDelete={onDeleteItem}
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

const RecommendationItem = ({ item, onDelete }) => {
  const songData = item.song || item;
  
  if (!songData) {
    console.warn('Invalid song data received:', item);
    return null;
  }
  return (
    <div className="sr-history-item">
      <button
        className="sr-delete-button"
        onClick={() => onDelete(item.id)}
        aria-label="Delete recommendation"
      >
        <X size={16} />
      </button>

      <div className="sr-history-content">
        <div className="sr-song-info">
          <img
            src={songData.album_art || '/default-album-art.jpg'}
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

export default FeedbackTabs;