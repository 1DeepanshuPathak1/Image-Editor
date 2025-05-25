import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AlertDialog from "../../utils/components/ui/alert-dialog";
import '../css/Menu.css';
function Menu({ isOpen, toggleMenu, isSignedIn, setIsSignedIn, toggleTheme }) {
    const navigate = useNavigate();
    const [showSignOutDialog, setShowSignOutDialog] = useState(false);
    const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
    useEffect(() => {
        const storedConnection = sessionStorage.getItem('spotifyConnected');
        if (storedConnection === 'true') {
            setIsSpotifyConnected(true);
        }
    }, []);

    const handleSignIn = () => {
        toggleMenu();
        navigate('/signin');
    };
    const handleSignOutClick = () => {
        setShowSignOutDialog(true);
    };
    const handleSignOutConfirm = () => {
        setIsSignedIn(false);
        toggleMenu();
        navigate('/');
        setShowSignOutDialog(false);
    };
    const toggleSpotifyConnection = () => {
        const newState = !isSpotifyConnected;
        setIsSpotifyConnected(newState);
        sessionStorage.setItem('spotifyConnected', newState.toString());
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
                        <Link to="/song-recommender" onClick={toggleMenu}>Song Recommender</Link>
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