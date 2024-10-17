import React from 'react';
import '../css/home.css'; // Importing CSS for styling

const comments = [
    "This is the best image editor I've ever used!",
    "Easy to navigate and incredibly effective.",
    "I love the features offered, especially the filters!",
    "Highly recommend it to anyone looking to edit images.",
    "Great for beginners and professionals alike."
];

function Home() {
    return (
        <div className="home-container">
            <h1>Welcome to the Image Editor</h1>

            <div className="features-steps-container">
                <div className="features-container">
                    <h2>Features</h2>
                    <ul>
                        <li>Easy-to-use interface</li>
                        <li>Advanced editing tools</li>
                        <li>Support for various formats</li>
                        <li>Real-time preview</li>
                    </ul>
                </div>
                <div className="steps-container">
                    <h2>How to Use</h2>
                    <ol>
                        <li>Upload your image</li>
                        <li>Edit using the tools</li>
                        <li>Save your edited image</li>
                    </ol>
                </div>
            </div>
            <h2>What Our Users Say</h2>
            <div className="comments-section">
                <div className="scrolling-comments">
                    {comments.concat(comments).map((comment, index) => (
                        <span key={index} className="comment">
                            {comment}
                            <span className="spacing"> &nbsp;&nbsp; </span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}


export default Home;
