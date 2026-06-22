import { lazy } from "react";
import { Routes, Route } from "react-router";

import RequireAuth from "./auth/RequireAuth";
import RequireUsername from "./auth/RequireUsername";
import AppLayout from "./components/AppLayout";

const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ListPage = lazy(() => import("./pages/list/ListPage"));
const ListsPage = lazy(() => import("./pages/lists/ListsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SetupProfilePage = lazy(() => import("./pages/SetupProfilePage"));

export default function App() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route element={<RequireAuth />}>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/setup-profile" element={<SetupProfilePage />} />
                    <Route element={<RequireUsername />}>
                        <Route path="/lists" element={<ListsPage />} />
                        <Route path="/lists/:listId" element={<ListPage />} />
                    </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}
