import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import App from "./App.tsx";
import "./index.css";

const cognitoAuthConfig = {
  authority:
    import.meta.env.VITE_COGNITO_AUTHORITY ??
    "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_H7e0Irb5V",
  client_id:
    import.meta.env.VITE_COGNITO_CLIENT_ID ??
    "3593qhqul52rgr79mi033f9v1l",
  redirect_uri:
    import.meta.env.VITE_COGNITO_REDIRECT_URI ??
    "https://d84l1y8p4kdic.cloudfront.net",
  response_type: "code" as const,
  scope: "openid email profile",
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </StrictMode>
);
