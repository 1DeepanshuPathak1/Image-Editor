import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../css/signin.css';

function SignIn({ setIsSignedIn }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Optional: Log only the email for tracking, without password
        console.log(`Attempting to sign in with email: ${formData.email}`);

        try {
            const response = await fetch('http://localhost:3000/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle client-side errors gracefully
                setErrorMessage(data.message || 'Sign-in failed. Please try again.');
                return;
            }

            // Successful login
            setIsSignedIn(true);
            const from = location.state?.from || '/';
            navigate(from);
        } catch (error) {
            console.error('Sign-in Request Error:', error); 
            setErrorMessage('Something went wrong. Please try again later.');
        }
    };

    const redirectMessage = location.state?.from === '/edit'
        ? 'You must sign in to access the Edit page.'
        : '';

    return (
        <div className="signin-container">
            <div className="background"></div>
            <div className="form-container">
                <h2>Sign In</h2>
                {redirectMessage && <p className="redirect-message">{redirectMessage}</p>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit">Sign In</button>
                </form>

                {errorMessage && <p className="error-message">{errorMessage}</p>}
                
                <p>Don't have an account? <a href="/signup">Create account</a></p>
            </div>
        </div>
    );
}

export default SignIn;
