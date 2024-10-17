import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Menu.css'; // Assuming your CSS is here

function Menu({ isOpen, toggleMenu }) {
    return (
        <div className={`menu ${isOpen ? 'open' : ''}`}>
            <ul>
                <li>
                    <Link to="/" >  Home</Link>
                </li>
                <li>
                    <Link to="/edit">  Edit</Link>
                </li>
                {/* Add more menu items as needed */}
            </ul>
        </div>
    );
}

export default Menu;
