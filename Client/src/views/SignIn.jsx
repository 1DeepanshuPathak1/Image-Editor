import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import '../css/signin.css';

function SignIn({ setIsSignedIn }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log(`Attempting to sign in with email: ${formData.email}`);

        try {
            const response = await fetch('http://localhost:3000/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                setErrorMessage(data.message || 'Sign-in failed. Please try again.');
                return;
            }
            setIsSignedIn(true);
            const from = location.state?.from || '/';
            navigate(from);
        } catch (error) {
            console.error('Sign-in Request Error:', error);
            setErrorMessage('Something went wrong. Please try again later.');
        }
    };
    const handleGoogleLogin = () => {
        window.location.href = 'http://localhost:3000/auth/google';
    };


    const redirectMessages = {
        '/edit': 'You must sign in to access the Edit feature.',
        '/resize-image': 'You must sign in to access the Image Resize feature.',
        '/enhance': 'You must sign in to access the Image Enhance feature.',
    };

    const redirectMessage = redirectMessages[location.state?.from] || '';

    return (
        <div className="signin-container">
            <div className="background"></div>
            <div className="form-container">
                <h2>Sign In</h2>
                {redirectMessage && <p className="redirect-message">{redirectMessage}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        <FontAwesomeIcon icon={faEnvelope} className="MailIcon" />
                    </div>

                    <div className="input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        <FontAwesomeIcon
                            icon={showPassword ? faEyeSlash : faEye}
                            className="PasswordIcon"
                            onClick={() => setShowPassword((prev) => !prev)}
                        />
                    </div>

                    <button type="submit">Sign In</button>
                </form>

                <button
                    onClick={handleGoogleLogin}
                    className="google-signin-button"
                    type="button"
                >Sign in with Google
                </button>

                {errorMessage && <p className="error-message">{errorMessage}</p>}

                <p id='AltPrompt'>Don't have an account? <a href="/signup">Create account</a></p>
            </div>
        </div>
    );
}

export default SignIn;
