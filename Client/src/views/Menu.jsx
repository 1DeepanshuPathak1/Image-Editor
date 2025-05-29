import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AlertDialog from "../../utils/ui/alert-dialog";
import '../css/Menu.css';

function Menu({ isOpen, toggleMenu, isSignedIn, setIsSignedIn, toggleTheme, isSpotifyConnected, onSpotifyConnection, onSongRecommenderAccess }) {
    const navigate = useNavigate();
    const [showSignOutDialog, setShowSignOutDialog] = useState(false);

    const handleSignIn = () => {
        toggleMenu();
        navigate('/signin');
    };

    const handleSignOutClick = () => {
        setShowSignOutDialog(true);
    };

    const handleSignOutConfirm = async () => {
        await fetch('http://localhost:3000/signout', {
            method: 'POST',
            credentials: 'include'
        });
        sessionStorage.clear();
        localStorage.clear();
        setIsSignedIn(false);
        onSpotifyConnection(false);
        toggleMenu();
        navigate('/');
        setShowSignOutDialog(false);
    };

    const toggleSpotifyConnection = () => {
        const newState = !isSpotifyConnected;
        onSpotifyConnection(newState);
    };

    const handleSongRecommenderClick = (e) => {
        e.preventDefault();
        if (onSongRecommenderAccess(navigate)) {
            toggleMenu();
            navigate('/song-recommender');
        }
    };

    return (
        <>
            <button className="menu-button" onClick={toggleMenu}>
                {isOpen ? '✖' : '☰'}
            </button>
            <div className={`menu ${isOpen ? 'open' : ''}`}>
                <ul>
                    <li>
                        <Link to="/" onClick={toggleMenu}>Home</Link>
                    </li>
                    <li>
                        <Link to="/edit" onClick={toggleMenu}>Edit</Link>
                    </li>
                    <li>
                        <Link to="/resize-image" onClick={toggleMenu}>Resize Image</Link>
                    </li>
                    <li>
                        <Link to="/upscale" onClick={toggleMenu}>Image Enhancer</Link>
                    </li>
                    <li>
                        <Link to="/Color-Harmony" onClick={toggleMenu}>Color Harmony</Link>
                    </li>
                    <li>
                        <a href="#" onClick={handleSongRecommenderClick}>Song Recommender</a>
                    </li>
                    <li>
                        {isSignedIn ? (
                            <button onClick={handleSignOutClick}>Sign Out</button>
                        ) : (
                            <button onClick={handleSignIn}>Login / Sign Up</button>
                        )}
                    </li>
                </ul>
                <div className="menu-footer">
                    <button
                        className={isSpotifyConnected ? 'spotify-connected-button' : 'spotify-connect-button'}
                        onClick={toggleSpotifyConnection}
                    >
                        {isSpotifyConnected ? 'Spotify Connected' : (
                            <div className="spotify-button-content">
                                <span>Connect Your Spotify</span>
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
                                    alt="Spotify Logo"
                                    className="spotify-logo"
                                />
                            </div>
                        )}
                    </button>
                    <button onClick={toggleTheme}>Toggle Theme</button>
                </div>
            </div>

            <AlertDialog
                isOpen={showSignOutDialog}
                onClose={() => setShowSignOutDialog(false)}
                onConfirm={handleSignOutConfirm}
                title="Are you absolutely sure?"
                description="This action cannot be undone. This will permanently delete your account and remove your data from our servers."
            />
        </>
    );
}

export default Menu;