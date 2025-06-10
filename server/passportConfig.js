const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const SpotifyStrategy = require('passport-spotify').Strategy;
const { User } = require('./models/User');
require('dotenv').config();

// Serialize/Deserialize User
passport.serializeUser((user, done) => {
    done(null, user.id || user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error('Deserialize error:', error);
        done(error, null);
    }
});

// Local Strategy
passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
}, async (req, email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return done(null, false, { message: 'No user found.' });
        }

        if (!await user.comparePassword(password)) {
            return done(null, false, { message: 'Incorrect password.' });
        }

        req.session.user = {
            id: user._id,
            email: user.email,
            name: user.firstName,
            provider: 'local'
        };

        return done(null, user);
    } catch (error) {
        console.error('Local strategy error:', error);
        return done(error, null);
    }
}));

// Google Strategy
passport.use('google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
}, async (_accessToken, _refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
            if (!user.googleId) {
                user.googleId = profile.id;
                await user.save();
            }
            return done(null, user);
        }
        user = new User({
            googleId: profile.id,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0].value,
            dateOfBirth: new Date()
        });
        await user.save();
        return done(null, user);
    } catch (error) {
        console.error('Google strategy error:', error);
        return done(error, null);
    }
}));

// GitHub Strategy
passport.use('github', new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/callback",
    scope: ['user:email']
}, async (_accessToken, _refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ githubId: profile.id });
        if (user) {
            return done(null, user);
        }

        if (profile.emails && profile.emails.length > 0) {
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                user.githubId = profile.id;
                await user.save();
                return done(null, user);
            }
        }

        user = await User.create({
            githubId: profile.id,
            firstName: profile.displayName || profile.username,
            lastName: '',
            email: profile.emails ? profile.emails[0].value : `${profile.username}@github.com`,
            dateOfBirth: new Date()
        });
        await user.save();
        return done(null, user);
    } catch (error) {
        console.error('GitHub strategy error:', error);
        return done(error, null);
    }
}));

// Spotify Strategy
passport.use('spotify', new SpotifyStrategy({
    clientID: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    callbackURL: process.env.SPOTIFY_REDIRECT_URI || "http://localhost:3000/auth/spotify/callback",
    scope: [
        'user-read-private',
        'user-read-email',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-library-modify',
        'user-library-read'
    ],
    passReqToCallback: true,
    showDialog: true // Forces re-authentication to ensure scopes are updated
}, async (req, accessToken, refreshToken, expires_in, profile, done) => {
    try {
        // Check if user is already logged in
        if (req.isAuthenticated() && req.user) {
            const user = await User.findById(req.user._id);
            if (!user) {
                console.error('Spotify OAuth: Authenticated user not found in DB', { userId: req.user._id });
                return done(null, false, { message: 'User not found' });
            }
            user.spotifyId = profile.id;
            user.spotifyAccessToken = accessToken;
            user.spotifyRefreshToken = refreshToken;
            user.spotifyTokenExpires = new Date(Date.now() + expires_in * 1000);
            user.spotifyProfile = {
                displayName: profile.displayName,
                email: profile.emails?.[0]?.value,
                country: profile.country, 
                profilePicture: profile.photos?.[0]
            };
            await user.save();
            return done(null, user);
        }

        // Find or create user
        let user = await User.findOne({ 
            $or: [{ spotifyId: profile.id }, { email: profile.emails?.[0]?.value }]
        });

        if (user) {
            user.spotifyId = profile.id;
            user.spotifyAccessToken = accessToken;
            user.spotifyRefreshToken = refreshToken;
            user.spotifyTokenExpires = new Date(Date.now() + expires_in * 1000);
            user.spotifyProfile = {
                displayName: profile.displayName,
                email: profile.emails?.[0]?.value,
                country: profile.country,
                profilePicture: profile.photos?.[0]
            };
            await user.save();
            return done(null, user);
        }

        // Create new user if none exists
        user = new User({
            spotifyId: profile.id,
            firstName: profile.displayName || 'Spotify User',
            email: profile.emails?.[0]?.value || `${profile.id}@spotify.com`,
            spotifyAccessToken: accessToken,
            spotifyRefreshToken: refreshToken,
            spotifyTokenExpires: new Date(Date.now() + expires_in * 1000),
            spotifyProfile: {
                displayName: profile.displayName,
                email: profile.emails?.[0]?.value,
                country: profile.country,
                profilePicture: profile.photos?.[0]
            },
            dateOfBirth: new Date()
        });
        await user.save();
        return done(null, user);
    } catch (error) {
        console.error('Spotify strategy error:', {
            error: error.message,
            stack: error.stack,
            profileId: profile?.id,
            apiResponse: error.body || error.response?.data || error,
            statusCode: error.statusCode,
            timestamp: new Date().toISOString()
        });
        if (error.message.includes('failed to fetch user profile')) {
            return done(null, false, { 
                message: 'Failed to fetch Spotify profile. Ensure your account is a Premium account or added as a test user in Development Mode.',
                errorDetails: error.body || error.response?.data
            });
        }
        return done(error, null);
    }
}));

module.exports = passport;