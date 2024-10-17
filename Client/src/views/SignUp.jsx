import React from 'react';
import '../css/signin.css'; // Reusing the same CSS file

function SignUp({ setIsSignedIn }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        // Logic for signing up (e.g., API call)
        setIsSignedIn(true); // Simulate successful sign-up
    };

    return (
        <div className="signin-container">
            <div className="background"></div>
            <div className="form-container">
                <h2>Sign Up</h2>
                <form onSubmit={handleSubmit}>
                    <input type="email" placeholder="Email" required />
                    <input type="password" placeholder="Password" required />
                    <input type="password" placeholder="Confirm Password" required />
                    <button type="submit">Sign Up</button>
                </form>
                <p>Already have an account? <a href="/signin">Sign In</a></p>
            </div>
        </div>
    );
}

export default SignUp;
