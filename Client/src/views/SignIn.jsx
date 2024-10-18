import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../css/signin.css'; // Ensure the path is correct

function SignIn({ setIsSignedIn }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSignedIn(true); // Simulate successful sign-in

        // Determine where to redirect based on the 'from' state
        const from = location.state?.from ;
        if (from === '/edit') {
            navigate('/edit');
        } else {
            navigate(from);
        }

    };

    const redirectMessage = location.state?.from === '/edit' 
        ? "You must sign in to access the Edit page." 
        : "";

    return (
        <div className="signin-container">
            <div className="background"></div>
            <div className="form-container">
                <h2>Sign In</h2>
                {redirectMessage && <p className="redirect-message">{redirectMessage}</p>}
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
