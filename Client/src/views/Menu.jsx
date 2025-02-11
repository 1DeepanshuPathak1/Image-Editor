import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AlertDialog from "../../utils/components/ui/alert-dialog";
import '../css/Menu.css';

function Menu({ isOpen, toggleMenu, isSignedIn, setIsSignedIn, toggleTheme }) {
    const navigate = useNavigate();
    const [showSignOutDialog, setShowSignOutDialog] = useState(false);

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

    return (
        <>
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