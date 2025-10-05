import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AlertDialog from "../../utils/ui/alert-dialog";
import { useSonner } from '../../utils/ui/Sonner';
import '../css/Menu.css';

function Menu({ isOpen, toggleMenu, isSignedIn, setIsSignedIn, toggleTheme, isSpotifyConnected, onSpotifyConnection, onSongRecommenderAccess }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showSignOutDialog, setShowSignOutDialog] = useState(false);
    const [showSpotifyDisconnectDialog, setShowSpotifyDisconnectDialog] = useState(false);
    const { showToast,ToastContainer } = useSonner();

    const checkAuthStatus = async () => { 
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/check`, {
                credentials: 'include'
            });
            
            if (response?.ok) {
                const data = await response.json();
                setIsSignedIn(data.isAuthenticated);
                onSpotifyConnection(data.spotifyConnected);
            } else {
                setIsSignedIn(false);
                onSpotifyConnection(false);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setIsSignedIn(false);
            onSpotifyConnection(false);
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, [location.pathname]);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const error = searchParams.get('error');
        const spotifyCallback = searchParams.get('spotifyCallback');
        
        if (error === 'spotify_auth_failed') {
            showToast('Error', 'Failed to connect Spotify. Please try again.');
        } else if (error === 'spotify_non_premium') {
            showToast('Error', 'Spotify connection requires a Premium account or must be added as a test user.');
        } else if (error === 'server_error') {
            showToast('Error', 'Server error during Spotify authentication.');
        }
        
        if (spotifyCallback === 'true') {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [location.search, showToast]);

    const handleSignIn = () => {
        toggleMenu();
        navigate('/signin');
    };

    const handleSignOutConfirm = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/signout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response?.ok) {
                sessionStorage.clear();
                localStorage.clear();
                setIsSignedIn(false);
                onSpotifyConnection(false);
                toggleMenu();
                navigate('/');
            } else {
                const errorData = response ? await response.json().catch(() => ({})) : {};
                throw new Error(errorData.message || 'Sign-out failed');
            }
        } catch (error) {
            console.error('Sign-out error:', error);
        } finally {
            setShowSignOutDialog(false);
        }
    };

    const handleSpotifyConnect = async () => {
        if (!isSignedIn) {
            showToast('Error', 'Please sign in to connect Spotify');
            navigate('/signin', { state: { from: '/song-recommender' } });
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/spotify?returnTo=/song-recommender`, {
                credentials: 'include'
            });

            if (!response?.ok) {
                throw new Error(`HTTP error! Status: ${response?.status || 'Network Error'}`);
            }

            const data = await response.json();
            if (data.authUrl) {
                window.location.href = data.authUrl;
            } else {
                throw new Error('No authorization URL provided');
            }
        } catch (error) {
            console.error('Spotify connect error:', error);
            showToast('Error', 'Failed to connect Spotify');
        }
    };

    const handleSpotifyDisconnectConfirm = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/spotify/disconnect`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response?.ok) {
                const errorData = response ? await response.json().catch(() => ({})) : {};
                throw new Error(errorData.message || `HTTP error! Status: ${response?.status || 'Network Error'}`);
            }

            onSpotifyConnection(false);
        } catch (error) {
            console.error('Spotify disconnect error:', error);
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
                    <li><Link to="/" onClick={toggleMenu}>Home</Link></li>
                    <li><Link to="/edit" onClick={toggleMenu}>Edit</Link></li>
                    <li><Link to="/resize-image" onClick={toggleMenu}>Resize Image</Link></li>
                    <li><Link to="/upscale" onClick={toggleMenu}>Image Enhancer</Link></li>
                    <li><Link to="/Color-Harmony" onClick={toggleMenu}>Color Harmony</Link></li>
                    <li><a href="#" onClick={handleSongRecommenderClick}>Song Recommender</a></li>
                    <li>
                        {isSignedIn ? (
                            <button onClick={() => setShowSignOutDialog(true)}>Sign Out</button>
                        ) : (
                            <button onClick={handleSignIn}>Login / Sign Up</button>
                        )}
                    </li>
                </ul>
                <div className="menu-footer">
                    <button
                        className={isSpotifyConnected ? 'spotify-connected-button' : 'spotify-connect-button'}
                        onClick={isSpotifyConnected ? () => setShowSpotifyDisconnectDialog(true) : handleSpotifyConnect}
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
            <ToastContainer />
        </>
    );
}

export default Menu;