import React, { useEffect, useState } from 'react';
import '../css/home.css'; // Importing CSS for styling

const comments = [
    "This is the best image editor I've ever used!",
    "Simple and effective. Highly recommend!",
    "Amazing features, very user-friendly.",
    "I've edited so many photos with this tool. Love it!",
    "Great for both beginners and professionals."
];

function Home() {
    const [currentComment, setCurrentComment] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentComment(prev => (prev + 1) % comments.length);
        }, 3000); // Change comment every 3 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="home-container">
            <h1>Welcome to the Image Editor</h1>
            
            <div className="features-steps-container">
                <div className="features-container">
                    <h2>Features</h2>
                    <ul>
                        <li>Crop and Resize Images</li>
                        <li>Adjust Brightness and Contrast</li>
                        <li>Apply Filters and Effects</li>
                        <li>Add Text and Annotations</li>
                        <li>Export in Multiple Formats</li>
                    </ul>
                </div>
                
                <div className="steps-container">
                    <h2>How to Use</h2>
                    <ol>
                        <li>Upload your image</li>
                        <li>Choose the desired features</li>
                        <li>Edit and Preview your image</li>
                        <li>Download your edited image</li>
                    </ol>
                </div>
            </div>

            <div className="comments-section">
                <h2>What Our Users Say</h2>
                <p>{comments[currentComment]}</p>
            </div>
        </div>
    );
}

export default Home;
