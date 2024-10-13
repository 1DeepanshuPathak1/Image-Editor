const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {MongoDB} = require('./controllers/database');
const {FilterRequest,UploadPost} = require('./controllers/Getrequests');
require('dotenv').config({path:'./.env'})



const app = express();
const port = process.env.PORT;

// MongoDB connection
connectionURL = 'mongodb://localhost:27017/imageEditorDB';


//Middle-ware
app.use(cors());
app.use(express.json());

// Multer 
const upload = multer({ storage: multer.memoryStorage() });

// Image Upload
app.post('/upload', upload.single('image'), UploadPost);

// Image Editing
app.get('/edit/:filterType', FilterRequest);

// Function applying using python script

MongoDB(connectionURL).then(()=>{
    app.listen(3000, () => {console.log(`Server running on port ${port}`)});
})

