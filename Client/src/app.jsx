import { useState } from 'react';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('Waiting for server response...');
  const [imageUrl, setImageUrl] = useState(null); // Store the uploaded image URL

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
      setImageUrl(data.imageUrl); // Set the image URL received from the server
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('Error uploading file.');
    }
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
          <img src={imageUrl} alt="Uploaded" className="uploaded-image" />
        </div>
      )}
      <div className="edits-button-container">
        <button className="action-button">Button 1</button>
        <button className="action-button">Button 2</button>
        <button className="action-button">Button 3</button>
        <button className="action-button">Button 4</button>
        <button className="action-button">Button 5</button>
      </div>
    </div>
  );
}

export default App;
