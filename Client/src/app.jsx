import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import EditPage from './views/EditPage';
import Home from './views/home';
import Menu from './views/Menu';
import SignIn from './views/SignIn';
import SignUp from './views/SignUp';
import ResizeImagePage from './views/ResizeImagePage';
import UpscalePage from './views/UpscalePage';
import ColorHarmonyPage from './views/ColorHarmony';
import SongRecommenderPage from './views/SongRecommender';
import { useSonner } from '../utils/ui/Sonner';
import CustomCursor from './Components/SiteComps/CustomCursor';
import './css/Menu.css';

function App() {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const { showToast, ToastContainer } = useSonner();
    const location = useLocation();

    const checkAuth = async () => {
        try {
            setIsAuthLoading(true);
            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/check`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            const data = await response.json();
            setIsSignedIn(data.isAuthenticated);
            setIsSpotifyConnected(data.spotifyConnected);
        } catch (error) {
            console.error('Auth check failed:', error);
            setIsSignedIn(false);
            setIsSpotifyConnected(false);
        } finally {
            setIsAuthLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('auth') === 'success' || searchParams.get('spotifyCallback') === 'true') {
            checkAuth();
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [location]);

    const handleSpotifyConnection = (connected) => {
        setIsSpotifyConnected(connected);
        sessionStorage.setItem('spotifyConnected', connected.toString());
    };

    const handleSongRecommenderAccess = (navigate) => {
        if (!isSignedIn) {
            showToast("Authentication Required", "Please sign in to access the Song Recommender.");
            navigate('/signin', { state: { from: '/song-recommender' } });
            return false;
        }

        if (!isSpotifyConnected) {
            showToast("Spotify Connection Required", "Please connect your Spotify account to access the Song Recommender.");
            return false;
        }

        return true;
    };

    if (isAuthLoading) return <div>Loading...</div>;

    return (
        <div>
            <CustomCursor />
            <Menu 
                isOpen={isMenuOpen} 
                toggleMenu={() => setMenuOpen(!isMenuOpen)} 
                isSignedIn={isSignedIn} 
                setIsSignedIn={setIsSignedIn}
                isSpotifyConnected={isSpotifyConnected}
                onSpotifyConnection={handleSpotifyConnection}
                onSongRecommenderAccess={handleSongRecommenderAccess}
            />

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/edit" element={isSignedIn ? <EditPage /> : <Navigate to="/signin" state={{ from: '/edit' }} />} />
                <Route path="/signin" element={<SignIn setIsSignedIn={setIsSignedIn} />} />
                <Route path="/signup" element={<SignUp setIsSignedIn={setIsSignedIn} />} />
                <Route path="/resize-image" element={isSignedIn ? <ResizeImagePage /> : <Navigate to="/signin" state={{from:'/resize-image'}} />} />
                <Route path="/upscale" element={isSignedIn ? <UpscalePage /> : <Navigate to="/signin" state={{from:'/upscale'}} />} />
                <Route path="/Color-Harmony" element={isSignedIn ? <ColorHarmonyPage/> : <Navigate to="/signin" state={{from:'/Color-Harmony'}}/>}/>
                <Route path="/auth/google/callback" element={<Navigate to="/" replace />} />
                <Route path="/song-recommender" element={isSignedIn && isSpotifyConnected ? <SongRecommenderPage /> : <Navigate to="/signin" state={{from:'/song-recommender'}}/>}/>
            </Routes>
            
            <ToastContainer />
        </div>
    );
}

export default App;