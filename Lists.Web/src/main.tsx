import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { Auth0Provider } from "@auth0/auth0-react";
import "./styles.css";

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN ?? "";
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID ?? "";
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE;

const authorizationParams = {
  redirect_uri: window.location.origin,
  ...(auth0Audience ? { audience: auth0Audience } : {}),
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0Provider
        authorizationParams={authorizationParams}
        clientId={auth0ClientId}
        domain={auth0Domain}
      >
        <App />
      </Auth0Provider>
    </BrowserRouter>
  </StrictMode>,
);
