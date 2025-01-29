import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../css/Menu.css'; 

function Menu({ isOpen, toggleMenu, isSignedIn, setIsSignedIn, toggleTheme }) {
    const navigate = useNavigate();

    const handleSignIn = () => {
        toggleMenu();
        navigate('/signin'); 
    };

    const handleSignOut = () => {
        const confirmSignOut = window.confirm("Are you sure you want to sign out?");
        if (confirmSignOut) {
            setIsSignedIn(false); 
            toggleMenu(); 
            navigate('/');
        }
    };

    return (
        <div className={`menu ${isOpen ? 'open' : ''}`}>
            <ul>
                <li>
                    <Link to="/">Home</Link>
                </li>
                <li>
                    <Link to="/edit">Edit</Link>
                </li>
                <li>
                    <Link to="/resize-image">Resize Image</Link>
                </li>
                <li>
                    <Link to="/upscale">Image Enhancer</Link>
                </li>
                <li>
                    {isSignedIn ? (
                        <button onClick={handleSignOut}>Sign Out</button>
                    ) : (
                        <button onClick={handleSignIn}>Login / Sign Up</button>
                    )}
                </li>
            </ul>
            <div className="menu-footer">
                <button onClick={toggleTheme}>Toggle Theme</button>
            </div>
        </div>
    );
}

export default Menu;
