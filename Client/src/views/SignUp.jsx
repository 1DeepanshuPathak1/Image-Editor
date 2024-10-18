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

    const [showMessage, setShowMessage] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Password match validation
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        // Show success message
        setShowMessage(true);

        // Redirect to sign-in page after 2 seconds
        setTimeout(() => {
            window.location.href = "/signin";
        }, 2000);
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
                    <button type="submit">Sign Up</button>
                </form>
                <p>
                    Already have an account? <a href="/signin">Sign In</a>
                </p>
            </div>

            {/* Custom Success Message */}
            {showMessage && (
                <div className="success-message">
                    Sign-up successful! Redirecting to Sign In page...
                </div>
            )}
        </div>
    );
}

export default SignUp;
