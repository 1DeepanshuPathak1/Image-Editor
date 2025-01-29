import React, { useState } from 'react';
import "../css/ResizeImagePage.css";

const ResizeImagePage = () => {
    const [image, setImage] = useState(null);
    const [resizedImage, setResizedImage] = useState(null);
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [error, setError] = useState('');
    const [targetSize, setTargetSize] = useState('');
    const [imageFormat, setImageFormat] = useState('jpeg');
    const [actualSize, setActualSize] = useState(null);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    setWidth(img.naturalWidth.toString());
                    setHeight(img.naturalHeight.toString());
                    setImage(reader.result);
                };
                img.src = reader.result;
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
        
        // Build the URL with required parameters
        let url = `http://localhost:3000/resize?width=${widthValue}&height=${heightValue}&format=${imageFormat}`;
        
        // Only add size parameter if targetSize is provided
        if (targetSize) {
            url += `&size=${targetSize}`;
        }
    
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });
    
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
    
            const data = await response.json();
            const resizedImageSrc = `data:image/${imageFormat};base64,${data.resizedImage}`;
    
            setResizedImage(resizedImageSrc);
            setActualSize(parseFloat(data.actualSize));
            setError('');
        } catch (error) {
            console.error('Error resizing image:', error);
            setError('Error resizing image. Please try again.');
        }
    };

    const handleDownload = () => {
        if (resizedImage) {
            const link = document.createElement('a');
            link.href = resizedImage;
            link.download = `resized_image.${imageFormat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
                    id="presetSelect"
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
            <div className="compression-options">
                <input
                    type="number"
                    value={targetSize}
                    onChange={(e) => setTargetSize(e.target.value)}
                    placeholder="Optional: Max file size (KB)"
                />
                <select
                    value={imageFormat}
                    onChange={(e) => setImageFormat(e.target.value)}
                >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="gif">GIF</option>
                    <option value="webp">WebP</option>
                </select>
                {resizedImage && (
                    <>
                        <button onClick={handleDownload} className="DownloadButton">
                            Download
                        </button>
                        <p>Actual size: {actualSize.toFixed(2)} KB</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResizeImagePage;