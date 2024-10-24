import React, { useState } from 'react';

function ResizeImagePage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('Waiting for server response...');
    const [sizeOption, setSizeOption] = useState('');

    const sizeOptions = [
        { label: '1920 x 1080', value: '1920x1080' },
        { label: '1280 x 720', value: '1280x720' },
        { label: '800 x 600', value: '800x600' },
        { label: '640 x 480', value: '640x480' },
        { label: '300 x 250', value: '300x250' },
        { label: '150 x 150', value: '150x150' },
    ];

    const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

    const handleUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const { image, message } = await (
                await fetch('http://localhost:3000/upload', { method: 'POST', body: formData })
            ).json();
            setMessage(message);
        } catch {
            setMessage('Error uploading file.');
        }
    };

    const handleDownload = async () => {
        if (!sizeOption) {
            console.error('No size option selected.');
            return;
        }

        const [width, height] = sizeOption.split('x');
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('width', width);
        formData.append('height', height);

        try {
            const response = await fetch('http://localhost:3000/resize-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Error resizing image');

            const blob = await response.blob();
            const resizedUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = resizedUrl;
            link.download = 'resized_image.png';
            link.click();
            setMessage('Image resized and downloaded successfully!');
        } catch {
            setMessage('Error during image resize.');
        }
    };

    return (
        <div className="container">
            <h1 className="title">Resize Image</h1>
            <form onSubmit={handleUpload} className="upload-form">
                <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    required
                    className="file-input"
                />
                <button type="submit" className="upload-button">Upload Image</button>
            </form>
            <div className="server-message">
                <h2 className="message-title">Message from Server:</h2>
                <p className="message-content">{message}</p>
            </div>
            {selectedFile && (
                <div className="image-preview-container">
                    <h2 className="message-title">Select Resize Option:</h2>
                    <select
                        value={sizeOption}
                        onChange={(e) => setSizeOption(e.target.value)}
                        className="resize-dropdown"
                    >
                        <option value="">Select Size</option>
                        {sizeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <button onClick={handleDownload} className="download-button">Download Resized Image</button>
                </div>
            )}
        </div>
    );
}

export default ResizeImagePage;
