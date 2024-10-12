import { useState } from 'react';

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('Waiting for server response...');
    const [imageUrl, setImageUrl] = useState(null);
    const [editedImageUrl, setEditedImageUrl] = useState(null);
    const [imageId, setImageId] = useState(null);
    const [rotationCount, setRotationCount] = useState(0);
    const [history, setHistory] = useState([]);

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
            const base64Image = `data:image/png;base64,${data.image}`;
            setImageUrl(base64Image);
            setImageId(data.id);
            setRotationCount(0);
            setHistory([base64Image]);
            setEditedImageUrl(null); // Reset edited image on new upload
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessage('Error uploading file.');
        }
    };

    const handleEdit = async (filterType) => {
        try {
            let rotationParam = rotationCount;
            if (filterType === 'rotate') {
                rotationParam += 90; // Increment rotation for 90 degrees each time
                setRotationCount(rotationParam); // Update rotation count
            }
            const response = await fetch(`http://localhost:5000/edit/${filterType}?id=${imageId}&rotation=${rotationParam}`);
            if (!response.ok) {
                throw new Error('Error editing image');
            }
            const data = await response.json();
            const base64Image = `data:image/png;base64,${data.image}`;
            setEditedImageUrl(base64Image);
            setHistory((prev) => [...prev, base64Image]); // Update history
            
            // Update the server message
            setMessage(`Changes applied! Click "Save" to save the current changes.`);
        } catch (error) {
            console.error('Error during editing:', error);
        }
    };

    const handleUndo = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop();
            setEditedImageUrl(newHistory[newHistory.length - 1]);
            setHistory(newHistory);
        }
    };

    const handleReset = () => {
        setEditedImageUrl(history[0]); // Reset to the original image
    };

    const handleSave = async () => {
        const imageToSave = editedImageUrl || imageUrl; // Use the currently displayed image
        if (imageToSave) {
            // Convert base64 to Blob
            const response = await fetch(imageToSave);
            const blob = await response.blob();
            const formData = new FormData();
            formData.append('image', blob, 'saved_image.png'); // Add a filename
    
            try {
                const uploadResponse = await fetch('http://localhost:5000/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await uploadResponse.json();
                setMessage("Image saved successfully!"); // Update message to indicate the image was saved
                setImageId(data.id); // Update imageId with new uploaded image ID
                setRotationCount(0); // Reset rotation count after saving
                setHistory([imageToSave]); // Reset history to contain only the saved image
            } catch (error) {
                console.error('Error saving image:', error);
            }
        }
    };
    

    const handleDownload = () => {
        const imageToDownload = editedImageUrl || imageUrl;
        const link = document.createElement('a');
        link.href = imageToDownload;
        link.download = 'edited_image.png';
        link.click();
    };

    const filters = [
        'greyscale', 'blackwhite', 'crop', 'rotate',
        'blur', 'brightness', 'contrast', 'sepia',
        'invert', 'edge'
    ];

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
                    <button className="save-button" onClick={handleSave}>Save</button>
                    <button className="download-button" onClick={handleDownload}>
                        <i className="fas fa-download"></i>
                    </button>
                    <img src={editedImageUrl || imageUrl} alt="Uploaded" className="uploaded-image" />
                </div>
            )}
            <div className="edits-button-container">
                {filters.map((filter, index) => (
                    <button
                        key={index}
                        className="action-button"
                        onClick={() => handleEdit(filter)}
                    >
                        {filter}
                    </button>
                ))}
            </div>
            <div className="edits-button-container">
                <button className="action-button" onClick={handleUndo}>Undo</button>
                <button className="action-button" onClick={handleReset}>Original Image</button>
            </div>
        </div>
    );
}

export default App;
