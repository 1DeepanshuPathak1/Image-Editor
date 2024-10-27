import React, { useState } from 'react';
import "../css/ResizeImagePage.css";

const ResizeImagePage = () => {
    const [image, setImage] = useState(null);
    const [resizedImage, setResizedImage] = useState(null);
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [error, setError] = useState('');

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleResize = async (e) => {
        e.preventDefault();
        const fileInput = document.querySelector('input[type="file"]');
        const file = fileInput.files[0];
    
        if (!file) {
            setError('Please upload an image first.');
            return;
        }
    
        const formData = new FormData();
        formData.append('image', file);
    
        const widthValue = width || document.getElementById('widthInput').value;
        const heightValue = height || document.getElementById('heightInput').value;
    
        try {
            const response = await fetch(`http://localhost:3000/resize?width=${widthValue}&height=${heightValue}`, {
                method: 'POST',
                body: formData,
            });
    
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
    
            const data = await response.json(); // Get the JSON response
            const resizedImageSrc = `data:image/png;base64,${data.resizedImage}`; // Format the base64 string
    
            setResizedImage(resizedImageSrc); // Update the state with the resized image source
            setError(''); // Clear any previous errors
        } catch (error) {
            console.error('Error resizing image:', error);
            setError('Error resizing image. Please try again.');
        }
    };
    

    return (
        <div className="resize-image-container">
            <h1>Resize Image</h1>
            <input type="file" onChange={handleImageUpload} />
            <form onSubmit={handleResize}>
                <input
                    type="number"
                    id="widthInput"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="Width"
                />
                <input
                    type="number"
                    id="heightInput"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="Height"
                />
                <select
                    onChange={(e) => {
                        const [w, h] = e.target.value.split('x');
                        setWidth(w);
                        setHeight(h);
                    }}
                >
                    <option value="">Select Preset</option>
                    <option value="640x480">640x480</option>
                    <option value="800x600">800x600</option>
                    <option value="1280x720">1280x720</option>
                    <option value="1920x1080">1920x1080</option>
                </select>
                <button className="ResizeButton" type="submit">Resize Image</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div className="image-box-container">
                {image && (
                    <div className="image-box">
                        <div className="image-title">Uploaded Image</div>
                        <img src={image} alt="Uploaded" className="image uploaded-image" />
                    </div>
                )}
                {resizedImage && (
                    <div className="image-box">
                        <div className="image-title">Resized Image</div>
                        <img src={resizedImage} alt="Resized" className="image resized-image" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResizeImagePage;
