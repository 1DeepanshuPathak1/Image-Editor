import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../css/Menu.css'; // Assuming your CSS is here

function Menu({ isOpen, toggleMenu, isSignedIn, setIsSignedIn }) {
    const navigate = useNavigate(); // Hook to programmatically navigate

    const handleSignIn = () => {
        toggleMenu(); // Close the menu
        navigate('/signin'); // Redirect to the sign-in page
    };

    const handleSignOut = () => {
        const confirmSignOut = window.confirm("Are you sure you want to sign out?");
        if (confirmSignOut) {
            setIsSignedIn(false); // Logic to sign out the user
            toggleMenu(); // Close the menu
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
                {/* Add Login / Sign Up button */}
                <li>
                    {isSignedIn ? (
                        <button onClick={handleSignOut}>Sign Out</button>
                    ) : (
                        <button onClick={handleSignIn}>Login / Sign Up</button>
                    )}
                </li>
            </ul>
        </div>
    );
}

export default Menu;
