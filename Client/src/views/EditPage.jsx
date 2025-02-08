import { useState } from 'react';
import DownloadDialog from '../../utils/components/ui/Download-dialog';

function EditPage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('Waiting for server response...');
    const [imageUrl, setImageUrl] = useState(null);
    const [EditedImage, setEditedImage] = useState(null);
    const [imageId, setImageId] = useState(null);
    const [rotationCount, setRotationCount] = useState(2);
    const [history, setHistory] = useState([]);
    const [tempOriginalImage, setTempOriginalImage] = useState(null);
    const [filterType, setFilterType] = useState(null);
    const [intensity, setIntensity] = useState(50);
    const [showSlider, setShowSlider] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);


    const filtersWithIntensity = ['blur', 'brightness', 'contrast', 'vignette', 'sepia'];
    const filters = ['greyscale', 'blackwhite', ...filtersWithIntensity, 'invert', 'edge', 'rotate'];

    const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

    const handleUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const { image, id, message } = await (
                await fetch('http://localhost:3000/upload', { method: 'POST', body: formData })
            ).json();
            setImageUrl(`data:image/png;base64,${image}`);
            setImageId(id);
            setRotationCount(0);
            setHistory([image]);
            setEditedImage(null);
            setTempOriginalImage(`data:image/png;base64,${image}`);
            setMessage(message);
        } catch {
            setMessage('Error uploading file.');
        }
    };

    const handleEdit = async (selectedFilterType = filterType, sliderValue = intensity) => {
        try {
            let rotationParam = rotationCount;
            if (selectedFilterType === 'rotate') {
                rotationParam += 90;
                setRotationCount(rotationParam);
            }

            const response = await fetch(
                `http://localhost:3000/edit/${selectedFilterType}?id=${imageId}&rotation=${rotationParam}&intensity=${sliderValue}`
            );
            if (!response.ok) throw new Error('Error editing image');

            const data = await response.json();
            const base64Image = `data:image/png;base64,${data.image}`;
            setEditedImage(base64Image);
            setHistory((prev) => [...prev, base64Image]);
            setMessage('Changes applied! Click "Save" to save the current changes.');
            setSelectedFilter(null);
            setShowSlider(false);
        } catch {
            console.error('Error during editing:');
        }
    };

    const handleFilterSelection = (filter) => {
        setFilterType(filter);
        if (filtersWithIntensity.includes(filter)) {
            setSelectedFilter(filter);
            setShowSlider(true);
            setIntensity(50);
        } else {
            setSelectedFilter(null);
            setShowSlider(false);
            handleEdit(filter);
        }
    };
    const handleUndo = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop();
            setEditedImage(newHistory[newHistory.length - 1]);
            setHistory(newHistory);
        }
    };

    const handleReset = () => {
        setEditedImage(imageUrl);
        setMessage('Restored to the original uploaded image.');
    };

    const handleShowSavedImage = () => {
        if (tempOriginalImage) {
            setEditedImage(tempOriginalImage);
            setMessage('Showing the saved image.');
        }
    };

    const handleSave = async () => {
        const imageToSave = EditedImage || imageUrl;
        if (imageToSave) {
            try {
                const blob = await (await fetch(imageToSave)).blob();
                const formData = new FormData();
                formData.append('image', blob, 'saved_image.png');

                const { id } = await (
                    await fetch('http://localhost:3000/upload', { method: 'POST', body: formData })
                ).json();
                setTempOriginalImage(imageToSave);
                setMessage('Image saved successfully!');
                setImageId(id);
                setRotationCount(0);
                setHistory([imageToSave]);
            } catch {
                console.error('Error saving image:');
            }
        }
    };

    const handleDownload = (fileName = 'edited_image.png') => {
        const imageToDownload = EditedImage || imageUrl;
        const link = document.createElement('a');
        link.href = imageToDownload;
        link.download = fileName;
        link.click();
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
                    <button className="save-button" onClick={handleSave}>Save</button>
                    <button className="download-button" onClick={() => setIsDownloadDialogOpen(true)}>
                        <i className="fas fa-download"></i>
                    </button>
                    <img src={EditedImage || imageUrl} alt="Uploaded" className="uploaded-image" />
                </div>
            )}
            {imageUrl && (
                <>
                    <div className="edits-button-container">
                        {filters.map((filter) => (
                            <button
                                key={filter} className={`action-button ${selectedFilter === filter ? 'selected' : ''}`} onClick={() => handleFilterSelection(filter)}
                            >{filter}
                            </button>
                        ))}
                    </div>
                    {showSlider && (
                        <div className="slider-container">
                            <input type="range" min="0" max="100" value={intensity} onChange={(e) => setIntensity(e.target.value)} />
                            <button onClick={() => handleEdit(filterType, intensity)} className="apply-button">Apply</button>
                        </div>
                    )}
                    <div className="edits-button-containers">
                        <button className="action-buttons" onClick={handleUndo}>Undo</button>
                        <button className="action-buttons" onClick={handleShowSavedImage}>Saved Image</button>
                        <button className="action-buttons" onClick={handleReset}>Original Image</button>
                    </div>
                </>
            )}
            {imageUrl && (
                <DownloadDialog
                    isOpen={isDownloadDialogOpen}
                    onClose={() => setIsDownloadDialogOpen(false)}
                    imageUrl={EditedImage || imageUrl}
                    onDownload={handleDownload}
                />
            )}
        </div>
    );
}


export default EditPage;
