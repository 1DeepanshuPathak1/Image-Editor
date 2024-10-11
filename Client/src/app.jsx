import { useState } from 'react';

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('Waiting for server response...');
    const [imageUrl, setImageUrl] = useState(null);
    const [editedImageUrl, setEditedImageUrl] = useState(null);
    const [imageId, setImageId] = useState(null); // Track the uploaded image ID
    const [filter, setFilter] = useState('');

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append('image', selectedFile);
      
        try {
            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            setMessage(data.message);
      
            // Set the image URL using the base64 string returned from the server
            setImageUrl(`data:image/png;base64,${data.image}`); 
            setImageId(data.id); // Save the image ID received from the server
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessage('Error uploading file.');
        }
    };

    const handleEdit = async (filterType) => {
        try {
            const response = await fetch(`http://localhost:5000/edit/${filterType}?id=${imageId}`);
            if (!response.ok) {
                throw new Error('Error editing image');
            }
            const data = await response.json(); // Expecting a JSON response with base64 image
            const editedImageUrl = `data:image/png;base64,${data.image}`; // Format the base64 string correctly
            setEditedImageUrl(editedImageUrl); // Store edited image URL
        } catch (error) {
            console.error('Error during editing:', error);
        }
    };

    const handleReset = () => {
        setEditedImageUrl(null); // Reset to show the original uploaded image
    };

    return (
        <div className="container">
            <h1 className="title">Image Upload</h1>
            <form onSubmit={handleUpload} className="upload-form">
                <input type="file" onChange={handleFileChange} accept="image/*" required className="file-input" />
                <button type="submit" className="upload-button">Upload Image</button>
            </form>
            <div className="server-message">
                <h2 className="message-title">Message from Server:</h2>
                <p className="message-content">{message}</p>
            </div>
            {imageUrl && (
                <div className="image-preview-container">
                    <h2 className="preview-title">Uploaded Image:</h2>
                    <img src={editedImageUrl || imageUrl} alt="Uploaded" className="uploaded-image" />
                </div>
            )}
            <div className="edits-button-container">
                <button className="action-button" onClick={() => handleEdit('crop')}>Crop</button>
                <button className="action-button" onClick={() => handleEdit('greyscale')}>Greyscale</button>
                <button className="action-button" onClick={() => handleEdit('blackwhite')}>Black & White</button>
                <button className="action-button" onClick={handleReset}>Original</button>
            </div>
        </div>
    );
}

export default App;
