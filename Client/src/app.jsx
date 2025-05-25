import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import EditPage from './views/EditPage';
import Home from './views/Home';
import Menu from './views/Menu';
import SignIn from './views/SignIn';
import SignUp from './views/SignUp';
import ResizeImagePage from './views/ResizeImagePage';
import UpscalePage from './views/UpscalePage';
import ColorHarmonyPage from './views/ColorHarmony';
import SongRecommenderPage from './views/SongRecommender';
import './css/Menu.css'

function App() {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('http://localhost:3000/auth/check', {
                    credentials: 'include'
                });
                const data = await response.json();
                setIsSignedIn(data.isAuthenticated);
            } catch (error) {
                console.error('Auth check failed:', error);
                setIsSignedIn(false);
            }
        };
        
        checkAuth();
    }, []);

    const toggleMenu = () => {
        setMenuOpen(!isMenuOpen);
    };

    return (
        <div>
            <Menu 
                isOpen={isMenuOpen} 
                toggleMenu={toggleMenu} 
                isSignedIn={isSignedIn} 
                setIsSignedIn={setIsSignedIn} 
            />

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/edit" element={isSignedIn ? <EditPage /> : <Navigate to="/signin" state={{ from: '/edit' }} />} />
                <Route path="/signin" element={<SignIn setIsSignedIn={setIsSignedIn} />} />
                <Route path="/signup" element={<SignUp setIsSignedIn={setIsSignedIn} />} />
                <Route path="/resize-image" element={isSignedIn ? <ResizeImagePage /> : <Navigate to="/signin" state={{from:'/resize-image'}} />} />
                <Route path="/upscale" element={isSignedIn ? <UpscalePage /> : <Navigate to="/signin" state={{from:'/upscale'}} />} />
                <Route path="/Color-Harmony" element={isSignedIn ? <ColorHarmonyPage/> : <Navigate to="/signin" state={{from:'/Color-Harmony'}}/>}/>
                <Route path="/auth/google/callback" element={ <Navigate to="/" replace />} />
                <Route path="/song-recommender" element={isSignedIn ? <SongRecommenderPage /> : <Navigate to="/signin" state={{from:'/song-recommender'}}/>}/>

            </Routes>
        </div>
    );
}

export default App;