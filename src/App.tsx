import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OrganizerDataRoute } from "./components/OrganizerDataRoute";
import { GroupSetup } from "./pages/GroupSetup";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { MemberAction } from "./pages/MemberAction";
import { OrganizerCreate } from "./pages/OrganizerCreate";
import { OrganizerDashboard } from "./pages/OrganizerDashboard";
import { OrganizerPublished } from "./pages/OrganizerPublished";
import { OrganizerReview } from "./pages/OrganizerReview";
import { RosterImport } from "./pages/RosterImport";

export function App() {
  const protect = (element: React.ReactNode, withData = false) => (
    <ProtectedRoute>{withData ? <OrganizerDataRoute>{element}</OrganizerDataRoute> : element}</ProtectedRoute>
  );
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={protect(<GroupSetup />)} />
      <Route path="/organizer/setup" element={protect(<GroupSetup />)} />
      <Route path="/organizer/groups/:groupId/roster" element={protect(<RosterImport />, true)} />
      <Route path="/organizer/groups/:groupId/announcements/new" element={protect(<OrganizerCreate />, true)} />
      <Route path="/organizer/groups/:groupId/announcements/:announcementId/review" element={protect(<OrganizerReview />, true)} />
      <Route path="/organizer/groups/:groupId/announcements/:announcementId/published" element={protect(<OrganizerPublished />, true)} />
      <Route path="/organizer/groups/:groupId/announcements/:announcementId/dashboard" element={protect(<OrganizerDashboard />, true)} />
      <Route path="/member/:announcementId" element={<MemberAction />} />
      <Route path="/organizer/create" element={<Navigate to="/organizer/setup" replace />} />
      <Route path="/member" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
