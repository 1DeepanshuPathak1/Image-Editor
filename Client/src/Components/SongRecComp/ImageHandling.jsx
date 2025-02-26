// ImageHandling.jsx
import { useState } from 'react';

export const useImageHandling = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [error, setError] = useState(null);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5000000) {
                setError('Image size too large. Please choose an image under 5MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
                setError(null);
            };
            reader.onerror = () => {
                setError('Failed to load image. Please try another image.');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setError(null);
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    return {
        selectedImage,
        error,
        handleImageUpload,
        handleRemoveImage,
        setError,
    };
};