import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AlertDialog from "../../utils/ui/alert-dialog";
import '../css/Menu.css';
import { useSonner } from '../../utils/ui/Sonner';

function Menu({ isOpen, toggleMenu, isSignedIn, setIsSignedIn, toggleTheme, isSpotifyConnected, onSpotifyConnection, onSongRecommenderAccess }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showSignOutDialog, setShowSignOutDialog] = useState(false);
    const [showSpotifyDisconnectDialog, setShowSpotifyDisconnectDialog] = useState(false);
    const { toast } = useSonner();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const error = searchParams.get('error');
        if (error === 'spotify_auth_failed') {
            toast.error('Failed to connect Spotify. Please try again.');
        } else if (error === 'spotify_non_premium') {
            toast.error('Spotify connection requires a Premium account or must be added as a test user.');
        } else if (error === 'server_error') {
            toast.error('Server error during Spotify authentication.');
        }
    }, [location.search, toast]);

    const handleSignIn = () => {
        toggleMenu();
        navigate('/signin');
    };

    const handleSignOutClick = () => {
        setShowSignOutDialog(true);
    };

    const handleSignOutConfirm = async () => {
        try {
            const response = await fetch('http://localhost:3000/signout', {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Sign-out failed');
            }
            sessionStorage.clear();
            localStorage.clear();
            setIsSignedIn(false);
            onSpotifyConnection(false);
            toggleMenu();
            navigate('/');
            toast.success('Signed out successfully!');
        } catch (error) {
            console.error('Sign-out error:', error);
            toast.error('Failed to sign out');
        } finally {
            setShowSignOutDialog(false);
        }
    };

    const handleSpotifyConnect = async () => {
        if (!isSignedIn) {
            toast.error('Please sign in to connect Spotify');
            navigate('/signin', { state: { from: '/song-recommender' } });
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/auth/spotify?returnTo=/song-recommender', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const { authUrl } = await response.json();
            if (authUrl) {
                window.location.href = authUrl;
            } else {
                throw new Error('No authorization URL provided');
            }
        } catch (error) {
            console.error('Spotify connect error:', error);
            toast.error('Failed to connect Spotify');
        }
    };

    const handleSpotifyDisconnectClick = () => {
        setShowSpotifyDisconnectDialog(true);
    };

    const handleSpotifyDisconnectConfirm = async () => {
        try {
            const response = await fetch('http://localhost:3000/auth/spotify/disconnect', {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            onSpotifyConnection(false);
            toast.success(data.message || 'Disconnected from Spotify');
        } catch (error) {
            console.error('Spotify disconnect error:', error);
            toast.error('Failed to disconnect Spotify');
        } finally {
            setShowSpotifyDisconnectDialog(false);
        }
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
                        onClick={isSpotifyConnected ? handleSpotifyDisconnectClick : handleSpotifyConnect}
                    >
                        {isSpotifyConnected ? 'Spotify Connected' : (
                            <div className="spotify-button-content">
                                <div className="spotify-button">
                                    <span>Connect Your Spotify</span>
                                    <span id="Spotify">
                                        <img
                                            src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
                                            alt="Spotify Logo"
                                            className="spotify-logo"
                                        />
                                    </span>
                                </div>
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
                title="Confirm Sign Out"
                description="This will sign you out and clear your session."
            />

            <AlertDialog
                isOpen={showSpotifyDisconnectDialog}
                onClose={() => setShowSpotifyDisconnectDialog(false)}
                onConfirm={handleSpotifyDisconnectConfirm}
                title="Disconnect Spotify"
                description="This will disconnect your Spotify account from the application. You can reconnect anytime."
            />
        </>
    );
}

export default Menu;