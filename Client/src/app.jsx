import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import EditPage from './views/EditPage';
import Home from './views/home';
import Menu from './views/Menu';

function App() {
    const [isMenuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!isMenuOpen);
    };

    return (
        <div>
            <button onClick={toggleMenu} className="menu-button">Menu</button>
            <Menu isOpen={isMenuOpen} toggleMenu={toggleMenu} />
            
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/edit" element={<EditPage />} />
            </Routes>
        </div>
    );
}

export default App;
