import { useState } from 'react';

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('Waiting for server response...');
    const [imageUrl, setImageUrl] = useState(null); // Original uploaded image
    const [editedImageUrl, setEditedImageUrl] = useState(null); // Current edited image
    const [imageId, setImageId] = useState(null);
    const [rotationCount, setRotationCount] = useState(0);
    const [history, setHistory] = useState([]); // History of edits
    const [tempOriginalImage, setTempOriginalImage] = useState(null); // Temp saved image

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
            const base64Image = `data:image/png;base64,${data.image}`;

            setMessage(data.message);
            setImageUrl(base64Image);
            setImageId(data.id);
            setRotationCount(0);
            setHistory([base64Image]);
            setEditedImageUrl(null);
            setTempOriginalImage(base64Image); // Initialize temp original
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessage('Error uploading file.');
        }
    };

    const handleEdit = async (filterType) => {
        try {
            let rotationParam = rotationCount;
            if (filterType === 'rotate') {
                rotationParam += 90;
                setRotationCount(rotationParam);
            }

            const response = await fetch(`http://localhost:5000/edit/${filterType}?id=${imageId}&rotation=${rotationParam}`);
            if (!response.ok) throw new Error('Error editing image');

            const data = await response.json();
            const base64Image = `data:image/png;base64,${data.image}`;

            setEditedImageUrl(base64Image);
            setHistory((prev) => [...prev, base64Image]);
            setMessage('Changes applied! Click "Save" to save the current changes.');
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
        setEditedImageUrl(imageUrl); // Reset to the original uploaded image
        setMessage("Restored to the original uploaded image.");
    };

    const handleShowSavedImage = () => {
        if (tempOriginalImage) {
            setEditedImageUrl(tempOriginalImage); // Display the saved image
        }
    };

    const handleSave = async () => {
        const imageToSave = editedImageUrl || imageUrl;
        if (imageToSave) {
            try {
                const response = await fetch(imageToSave);
                const blob = await response.blob();
                const formData = new FormData();
                formData.append('image', blob, 'saved_image.png');

                const uploadResponse = await fetch('http://localhost:5000/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await uploadResponse.json();

                setMessage('Image saved successfully!');
                setImageId(data.id);
                setRotationCount(0);
                setHistory([imageToSave]);
                setTempOriginalImage(imageToSave); // Update temp original
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
        'greyscale', 'blackwhite', 'vignette', 'rotate',
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
                <button className="action-button" onClick={handleShowSavedImage}>Saved Image</button>
                <button className="action-button" onClick={handleReset}>Original Image</button>
            </div>
        </div>
    );
}

export default App;
