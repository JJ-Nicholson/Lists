import { Routes, Route } from "react-router";

import RequireAuth from "./auth/RequireAuth";
import RequireUsername from "./auth/RequireUsername";
import AppLayout from "./components/AppLayout";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import HomePage from "./pages/HomePage";
import ListPage from "./pages/ListPage";
import ListsPage from "./pages/ListsPage";
import SetupProfilePage from "./pages/SetupProfilePage";

export default function App() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route element={<RequireAuth />}>
                    <Route path="/setup-profile" element={<SetupProfilePage />} />
                    <Route element={<RequireUsername />}>
                        <Route path="/lists" element={<ListsPage />} />
                        <Route path="/lists/:listId" element={<ListPage />} />
                    </Route>
                </Route>
            </Route>
        </Routes>
    );
}
