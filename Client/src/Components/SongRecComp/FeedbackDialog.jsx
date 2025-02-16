// FeedbackDialog.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import './css/FeedbackDialog.css';

const FeedbackDropdown = ({ isOpen, onClose, type, onSelect }) => {
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const options = type === 'like' 
        ? [
            { id: 'song', label: 'Like this song', icon: <ThumbsUp /> },
            { id: 'artist', label: 'Like this artist', icon: <ThumbsUp /> }
        ]
        : [
            { id: 'song', label: 'Dislike this song', icon: <ThumbsDown /> },
            { id: 'artist', label: 'Dislike this artist', icon: <ThumbsDown /> }
        ];

    return (
        <div ref={dropdownRef} className="feedback-dropdown">
            {options.map(option => (
                <button
                    key={option.id}
                    className="feedback-option"
                    onClick={() => {
                        onSelect(option.id);
                        onClose();
                    }}
                >
                    {option.icon}
                    {option.label}
                </button>
            ))}
        </div>
    );
};

const FeedbackButton = ({ type, isActive, onClick, dropdownOpen, onDropdownClose, onOptionSelect }) => {
    const handleClick = (e) => {
        e.stopPropagation();
        onClick();
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                className={`feedback-button ${isActive ? 'active' : ''} ${type}`}
            >
                {type === 'like' ? <ThumbsUp size={20} /> : <ThumbsDown size={20} />}
            </button>
            <FeedbackDropdown
                isOpen={dropdownOpen}
                onClose={onDropdownClose}
                type={type}
                onSelect={onOptionSelect}
            />
        </div>
    );
};

const SongFeedback = ({ suggestedSong, onFeedbackChange }) => {
    const [activeFeedback, setActiveFeedback] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(null);

    useEffect(() => {
        setActiveFeedback(null);
        setDropdownOpen(null);
    }, [suggestedSong?.uri]);

    const handleFeedbackClick = (type) => {
        if (activeFeedback === type) {
            setDropdownOpen(type);
        } else {
            setActiveFeedback(type);
            setDropdownOpen(type);
        }
    };

    const handleOptionSelect = (scope) => {
        if (!suggestedSong) {
            console.error('No song selected for feedback');
            return;
        }
        
        const feedbackType = dropdownOpen;
        onFeedbackChange(feedbackType, scope, suggestedSong);
        setActiveFeedback(feedbackType);
        setDropdownOpen(null);
    };

    if (!suggestedSong) return null;

    return (
        <div className="feedback-container">
            <FeedbackButton
                type="like"
                isActive={activeFeedback === 'like'}
                onClick={() => handleFeedbackClick('like')}
                dropdownOpen={dropdownOpen === 'like'}
                onDropdownClose={() => setDropdownOpen(null)}
                onOptionSelect={handleOptionSelect}
            />
            <FeedbackButton
                type="dislike"
                isActive={activeFeedback === 'dislike'}
                onClick={() => handleFeedbackClick('dislike')}
                dropdownOpen={dropdownOpen === 'dislike'}
                onDropdownClose={() => setDropdownOpen(null)}
                onOptionSelect={handleOptionSelect}
            />
        </div>
    );
};

export default SongFeedback;