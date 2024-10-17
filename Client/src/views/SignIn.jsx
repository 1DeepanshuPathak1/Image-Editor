import React from 'react';
import '../css/signin.css'; // Ensure this path is correct

function SignIn({ setIsSignedIn }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        // Logic for signing in (e.g., API call)
        setIsSignedIn(true); // Simulate successful sign-in
    };

    return (
        <div className="signin-container">
            <div className="background"></div>
            <div className="form-container">
                <h2>Sign In</h2>
                <form onSubmit={handleSubmit}>
                    <input type="email" placeholder="Email" required />
                    <input type="password" placeholder="Password" required />
                    <button type="submit">Sign In</button>
                </form>
                <p>Don't have an account? <a href="/signup">Create account</a></p>
            </div>
        </div>
    );
}

export default SignIn;
