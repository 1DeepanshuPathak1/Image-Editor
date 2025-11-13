# Image Editor 🎨

A full-stack web application that combines powerful image editing capabilities with intelligent music recommendations powered by Spotify API integration. Built with React, Node.js, Express, MongoDB, and Python for advanced image processing.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Features Overview](#features-overview)
- [Database](#database)
- [Authentication](#authentication)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

### 🖼️ Image Editing
- **Image Upscaling**: Enhance image resolution using advanced AI models (SwinIR)
- **Image Resizing**: Resize images with multiple format support
- **Advanced Filters**: Apply various image filters and transformations
- **Image Analysis**: Analyze images using ImageNet labels and computer vision
- **Color Harmony**: Generate and display color schemes with detailed harmony explanations
- **Download Support**: Download edited images in multiple formats

### 🎵 Song Recommendations
- **AI-Powered Recommendations**: Get personalized music recommendations based on image content
- **Spotify Integration**: Direct integration with Spotify Web API
- **Advanced Filtering**:
  - Filter by genre (Pop, Rock, Hip-Hop, Electronic, Jazz, etc.)
  - Filter by mood (Happy, Calm, Energetic, Melancholic, etc.)
  - Filter by popularity (Mainstream, Rising, Underground, Undiscovered)
  - Filter by language (English, Spanish, French, German, and more)
  - Filter by specific artists
- **User Preferences**: Save artist preferences and customization options
- **Song Score Display**: Visual representation of song compatibility scores
- **Feedback System**: Provide feedback on recommendations

### 👤 User Management
- **Multi-Platform Authentication**: 
  - Local login/signup
  - GitHub OAuth
  - Google OAuth
  - Spotify OAuth
- **User Profiles**: Manage user preferences and settings
- **Session Management**: Secure session handling with multiple storage options

### 🎨 Color Harmony Tools
- **Color Generation**: Generate complementary and harmonious color schemes
- **Color Analysis**: Extract dominant colors from images
- **Harmony Explanations**: Detailed explanations of color harmony principles
- **Visual Display**: Beautiful card-based color scheme presentation

## Tech Stack

### Frontend
- **React 18.3.1**: Modern UI library
- **Vite 5.4.8**: Lightning-fast build tool
- **TypeScript**: Type-safe development
- **Tailwind CSS 4.0.0**: Utility-first CSS framework
- **React Router 6.27.0**: Client-side routing
- **Framer Motion 12.15.0**: Smooth animations
- **Axios 1.7.7**: HTTP client
- **Radix UI**: Accessible component library
- **Lucide React**: Icon library
- **Color Thief**: Extract colors from images
- **Vibrant JS**: Advanced color analysis

### Backend
- **Node.js & Express 4.21.0**: Server framework
- **MongoDB & Mongoose 8.9.5**: NoSQL database
- **Passport.js 0.7.0**: Authentication middleware
- **Spotify Web API**: Music data integration
- **JWT**: Token-based authentication
- **Sharp 0.33.5**: Image processing
- **Python Shell**: Python integration for advanced image operations
- **AWS SDK**: DynamoDB session storage
- **Redis**: Session and data caching
- **Multer 2.0.1**: File upload handling

### Python
- **PIL/Pillow**: Image manipulation
- **NumPy**: Numerical operations
- **PyTorch**: Deep learning (for SwinIR upscaling)
- **ImageNet**: Pre-trained models

### DevTools
- **ESLint**: Code linting
- **Nodemon**: Development server auto-reload
- **Tailwind CSS**: CSS generation
- **Autoprefixer**: CSS vendor prefixing

## Project Structure

```
Image Editor/
├── Client/                          # React frontend application
│   ├── src/
│   │   ├── Components/
│   │   │   ├── ColorHarmonyComps/   # Color harmony UI components
│   │   │   │   ├── ColorComp.jsx
│   │   │   │   ├── ColorGen.jsx
│   │   │   │   ├── ColorSchemeCard.jsx
│   │   │   │   ├── HarmonyExplanation.jsx
│   │   │   │   └── useColorLogic.jsx
│   │   │   ├── SiteComps/           # General site components
│   │   │   │   └── CustomCursor.jsx
│   │   │   └── SongRecComp/         # Song recommendation components
│   │   │       ├── AdvancedOptions.jsx
│   │   │       ├── ArtistPreferences.jsx
│   │   │       ├── FeedbackDialog.jsx
│   │   │       ├── FeedbackTabs.jsx
│   │   │       ├── ImageHandling.jsx
│   │   │       ├── SongFeedbackHandler.jsx
│   │   │       ├── SongHandling.jsx
│   │   │       └── SongScoreDisplay.jsx
│   │   ├── views/                   # Page components
│   │   │   ├── home.jsx
│   │   │   ├── SignIn.jsx
│   │   │   ├── SignUp.jsx
│   │   │   ├── ColorHarmony.jsx
│   │   │   ├── EditPage.jsx
│   │   │   ├── ResizeImagePage.jsx
│   │   │   ├── UpscalePage.jsx
│   │   │   ├── SongRecommender.jsx
│   │   │   └── Menu.jsx
│   │   ├── utils/                   # Utility components and functions
│   │   │   └── ui/                  # Shadcn UI components
│   │   ├── css/                     # Stylesheets
│   │   ├── assets/                  # Static assets
│   │   ├── app.jsx                  # Main app component
│   │   └── main.jsx                 # Entry point
│   ├── vite.config.js               # Vite configuration
│   ├── eslint.config.js             # ESLint configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   └── package.json
│
├── server/                          # Express backend application
│   ├── controllers/
│   │   ├── connect.js               # Database connection
│   │   ├── database.js              # Database queries
│   │   ├── Filters.js               # Image filtering logic
│   │   ├── Getrequests.js           # GET request handlers
│   │   ├── resizeImage.js           # Image resize logic
│   │   ├── UpscaleImage.js          # Image upscale logic
│   │   ├── songRecommender.js       # Main recommendation logic
│   │   ├── SongRecommendationUtils.js
│   │   └── SongRecComps/            # Song recommendation components
│   │       ├── ImageAnalysis.js     # Analyze images for recommendations
│   │       ├── RecommendationLogic.js
│   │       ├── SpotifyOperations.js # Spotify API operations
│   │       └── UserOperations.js    # User data operations
│   ├── models/                      # Mongoose schemas
│   │   ├── User.js
│   │   ├── UserMusic.js
│   │   └── Imagehandler.js
│   ├── routes/
│   │   └── songRoutes.js            # Song recommendation routes
│   ├── services/
│   │   ├── passportConfig.js        # Passport.js configuration
│   │   ├── redisService.js          # Redis operations
│   │   └── redisPreferencesService.js
│   ├── PythonScripts/               # Python image processing
│   │   ├── image_analysis.py
│   │   ├── image_edit.py
│   │   ├── resize.py
│   │   ├── Upscale.py
│   │   └── models/                  # Pre-trained models
│   │       └── network_swinir.py
│   ├── server.js                    # Main server file
│   └── package.json
│
├── package.json                     # Root package.json
├── LICENSE                          # MIT License
└── README.md                        # This file
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn** package manager
- **Python** (v3.8 or higher) - for image processing
- **MongoDB** (local or cloud - MongoDB Atlas)
- **Redis** (for session caching)
- **Git**

### Optional but Recommended:
- **Docker** - for containerized deployment
- **Docker Compose** - for multi-container orchestration

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/1DeepanshuPathak1/Image-Editor.git
cd Image-Editor
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Client Dependencies

```bash
cd Client
npm install
cd ..
```

### 4. Install Server Dependencies

```bash
cd server
npm install
cd ..
```

### 5. Install Python Dependencies

```bash
pip install -r server/requirements.txt
```

Make sure to create a `requirements.txt` file in the server folder with:

```txt
Pillow>=9.0.0
numpy>=1.21.0
torch>=1.10.0
torchvision>=0.11.0
opencv-python>=4.5.0
```

## Configuration

### 1. Environment Variables

Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/image-editor
# OR for MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/image-editor

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Spotify API Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5000/auth/spotify/callback

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=7d

# Session Configuration
SESSION_SECRET=your_session_secret_key

# AWS Configuration (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Python Scripts Path
PYTHON_PATH=python3
```

### 2. Client Environment

Create a `.env` file in the `Client` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Image Editor
```

### 3. Get API Credentials

#### Spotify API
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Copy Client ID and Client Secret
4. Add `http://localhost:5000/auth/spotify/callback` to Redirect URIs

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create New OAuth App
3. Set Authorization callback URL to `http://localhost:5000/auth/github/callback`

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:5000/auth/google/callback` to authorized redirects

## Running the Application

### Development Mode

#### Terminal 1 - Start MongoDB

```bash
mongod
```

#### Terminal 2 - Start Redis

```bash
redis-server
```

#### Terminal 3 - Start Backend Server

```bash
cd server
npm start
```

The server will run on `http://localhost:5000`

#### Terminal 4 - Start Frontend Development Server

```bash
cd Client
npm run dev
```

The frontend will typically run on `http://localhost:5173`

### Production Build

#### Build Frontend

```bash
cd Client
npm run build
```

#### Build Backend

```bash
cd server
npm install --production
```

#### Start Server

```bash
cd server
npm start
```

## API Endpoints

### Authentication Routes
- `POST /auth/local/signup` - Register new user
- `POST /auth/local/login` - Login with email/password
- `POST /auth/logout` - Logout user
- `GET /auth/github` - GitHub OAuth login
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/spotify` - Spotify OAuth login
- `GET /auth/spotify/callback` - Spotify OAuth callback

### Song Recommendation Routes
- `POST /api/songs/recommend` - Get song recommendations based on image analysis
- `POST /api/songs/feedback` - Submit feedback on recommendations
- `GET /api/songs/user-preferences` - Get user music preferences
- `PUT /api/songs/user-preferences` - Update user music preferences
- `GET /api/songs/artist-search` - Search for artists

### Image Processing Routes
- `POST /api/images/resize` - Resize an image
- `POST /api/images/upscale` - Upscale an image
- `POST /api/images/filter` - Apply filters to an image
- `POST /api/images/analyze` - Analyze image for recommendations
- `POST /api/images/color-analysis` - Extract color information

### User Routes
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `DELETE /api/user/account` - Delete user account

## Features Overview

### Color Harmony
The Color Harmony feature analyzes images to generate complementary color schemes with detailed explanations of color theory. It includes:
- Dominant color extraction
- Complementary color generation
- Triadic and analogous color schemes
- Educational explanations of each harmony type

### Song Recommendations
Intelligent music recommendation engine that:
1. Analyzes uploaded images using computer vision
2. Extracts visual features and mood indicators
3. Queries Spotify API with multiple filters:
   - Genre preferences
   - Mood matching
   - Popularity levels
   - Language preferences
   - Specific artist selection
4. Returns scored recommendations with song metadata
5. Allows user feedback to improve future recommendations

### Image Processing
Advanced image manipulation capabilities:
- **Upscaling**: Uses SwinIR model for 4x image enhancement
- **Resizing**: Intelligent scaling with format conversion
- **Filtering**: Multiple artistic and functional filters
- **Analysis**: ImageNet-based content classification

## Database

### MongoDB Schema

#### User Model
```javascript
{
  _id: ObjectId,
  email: String (unique),
  username: String,
  passwordHash: String,
  profile: {
    avatar: String,
    bio: String,
    preferences: Object
  },
  musicPreferences: {
    favoriteGenres: [String],
    favoriteMoods: [String],
    popularityLevel: String,
    languages: [String]
  },
  oauthAccounts: {
    spotify: Object,
    github: Object,
    google: Object
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### UserMusic Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  spotifyId: String,
  trackName: String,
  artistName: String,
  albumName: String,
  genre: [String],
  mood: [String],
  popularity: Number,
  language: String,
  savedAt: Date
}
```

## Authentication

The application supports multiple authentication strategies:

1. **Local Authentication**: Email/password with bcrypt hashing
2. **Passport.js OAuth**: GitHub, Google, and Spotify
3. **JWT Tokens**: For API requests
4. **Session Management**: Server-side sessions with Redis or DynamoDB

## Deployment

### Heroku Deployment

```bash
heroku create your-app-name
git push heroku main
heroku config:set <ENV_VARIABLES>
```

### Docker Deployment

Build image:
```bash
docker build -t image-editor .
```

Run container:
```bash
docker run -p 5000:5000 --env-file .env image-editor
```

### Using Docker Compose

```bash
docker-compose up --build
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
  
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
  
  app:
    build: .
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
      - redis
    env_file: .env
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support & Contact

For issues, questions, or suggestions, please:
- Open an issue on GitHub
- Contact the maintainer at [Your Email/Contact]

## Acknowledgments

- Spotify Web API for music data
- SwinIR model for image upscaling
- ImageNet for image classification
- All open-source contributors and libraries used

---

**Built with ❤️ by Deepanshu Pathak**

Last updated: November 13, 2025
