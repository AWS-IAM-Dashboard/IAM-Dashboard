
import { WebStorageStateStore } from "oidc-client-ts";
import { AuthProvider } from "react-oidc-context";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const cognitoAuthority = import.meta.env.VITE_COGNITO_AUTHORITY;
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const cognitoRedirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI;

createRoot(document.getElementById("root")!).render(
  <AuthProvider
    authority={cognitoAuthority}
    client_id={cognitoClientId}
    redirect_uri={cognitoRedirectUri}
    response_type="code"
    scope="openid email profile"
    loadUserInfo
    userStore={new WebStorageStateStore({ store: window.localStorage })}
    onSigninCallback={() => {
      window.location.replace("/app");
    }}
  >
    <App />
  </AuthProvider>
);
  
