import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EditPage from './views/EditPage';
import Home from './views/Home';
import Menu from './views/Menu';
import SignIn from './views/SignIn';
import SignUp from './views/SignUp';
import ResizeImagePage from './views/ResizeImagePage';
import './css/EditPage.css';

function App() {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!isMenuOpen);
    };

    return (
        <div>
            <button onClick={toggleMenu} className="menu-button">Menu</button>
            <Menu 
                isOpen={isMenuOpen} 
                toggleMenu={toggleMenu} 
                isSignedIn={isSignedIn} 
                setIsSignedIn={setIsSignedIn} 
            />

            <Routes>
                <Route path="/" element={<Home />} state={{ from: '/' }} />
                <Route path="/edit" element={isSignedIn ? <EditPage /> : <Navigate to="/signin" state={{ from: '/edit' }} />} />
                <Route path="/signin" element={<SignIn setIsSignedIn={setIsSignedIn} />} />
                <Route path="/signup" element={<SignUp setIsSignedIn={setIsSignedIn} />} />
                <Route path="/resize-image" element={isSignedIn?<ResizeImagePage /> : <Navigate to="/signin" state={{from:'/resize-image'}} />} />
            </Routes>
        </div>
    );
}

export default App;
