import React, { useState } from 'react';
import '../css/signin.css';

function SignUp({ setIsSignedIn }) {
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: ''
    });

    const [errorMessage, setErrorMessage] = useState('');
    const [showMessage, setShowMessage] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('http://localhost:3000/auth/check', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.isAuthenticated) {
                    setIsSignedIn(true);
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setErrorMessage("Passwords do not match!");
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.status === 201) {
                await checkAuthStatus();
                setShowMessage(true);
                setTimeout(() => {
                    window.location.href = "/signin";
                }, 2000);
            } else {
                setErrorMessage(data.message || 'Sign-up failed');
            }
        } catch (error) {
            console.error(error);
            setErrorMessage('An error occurred. Please try again.');
        }
    };

    return (
        <div className="signin-container">
            <div className="background"></div>
            <div className="form-container">
                <h2>Sign Up</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="firstName"
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="text"
                        name="middleName"
                        placeholder="Middle Name"
                        value={formData.middleName}
                        onChange={handleChange}
                    />
                    <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        required
                    />
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
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                    <button className="SigninButton" type="submit">Sign Up</button>
                </form>
                <p>
                    Already have an account? <a href="/signin">Sign In</a>
                </p>
                {errorMessage && <div className="error-message">{errorMessage}</div>}
                {showMessage && (
                    <div className="success-message">
                        Sign-up successful! Redirecting to Sign In page...
                    </div>
                )}
            </div>
        </div>
    );
}

export default SignUp;