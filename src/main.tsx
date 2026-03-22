
import { AuthProvider } from "react-oidc-context";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const cognitoAuthority = import.meta.env.VITE_COGNITO_AUTHORITY;
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const cognitoRedirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI;

console.log({
    authority: import.meta.env.VITE_COGNITO_AUTHORITY,
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    redirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI,
    logoutUri: import.meta.env.VITE_COGNITO_LOGOUT_URI,
  });

createRoot(document.getElementById("root")!).render(
  <AuthProvider
    authority={cognitoAuthority}
    client_id={cognitoClientId}
    redirect_uri={cognitoRedirectUri}
    response_type="code"
    scope="openid email profile"
    loadUserInfo
    onSigninCallback={() => {
      window.history.replaceState({}, document.title, "/app");
    }}
  >
    <App />
  </AuthProvider>
);
  
