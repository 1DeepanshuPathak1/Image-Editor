import "../css/LoginButtons.css";

export function LoginButtons({ onGoogleClick, onGithubClick }) {
  return (
    <div className="login-container">
      <div className="divider">
        <div className="divider-line">Or continue with</div>
      </div>
      <div className="button-group flex justify-center gap-4">
        <button className="google-login-btn flex items-center gap-2 px-4 py-2 border border-gray-500 rounded-lg" onClick={onGoogleClick}>
          <svg xmlns="http://www.w3.org/2000/svg" height={24} width={24} viewBox="0 0 24 24">
            <path
              d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
              fill="currentColor"
            />
          </svg>
          Google
        </button>
        <button className="github-login-btn flex items-center gap-2 px-4 py-2 border border-gray-500 rounded-lg" onClick={onGithubClick}>
          <svg viewBox="0 0 24 24" height={24} width={24} className="text-white">
            <path
              fill="currentColor"
              d="M12 .297C5.373.297 0 5.67 0 12.297c0 5.304 3.438 9.8 8.207 11.385.6.11.82-.26.82-.577v-2.165c-3.34.725-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.755-1.333-1.755-1.09-.746.083-.73.083-.73 1.205.085 1.84 1.24 1.84 1.24 1.07 1.835 2.805 1.305 3.49.998.107-.776.418-1.305.762-1.605-2.665-.305-5.466-1.335-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.124-.305-.535-1.53.116-3.18 0 0 1.008-.32 3.3 1.23a11.5 11.5 0 013.006-.405c1.02.005 2.045.14 3.006.405 2.29-1.55 3.297-1.23 3.297-1.23.654 1.65.243 2.875.12 3.18.77.84 1.232 1.91 1.232 3.22 0 4.605-2.805 5.625-5.477 5.92.428.37.813 1.1.813 2.22v3.293c0 .32.216.694.825.575C20.565 22.092 24 17.598 24 12.297 24 5.67 18.627.297 12 .297z"
            />
          </svg>
          GitHub
        </button>
      </div>
    </div>
  );
}
