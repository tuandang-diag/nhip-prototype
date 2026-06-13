import { Navigate, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { MemberAction } from "./pages/MemberAction";
import { OrganizerCreate } from "./pages/OrganizerCreate";
import { OrganizerDashboard } from "./pages/OrganizerDashboard";
import { OrganizerPublished } from "./pages/OrganizerPublished";
import { OrganizerReview } from "./pages/OrganizerReview";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/organizer/create" element={<OrganizerCreate />} />
      <Route path="/organizer/review" element={<OrganizerReview />} />
      <Route path="/organizer/published" element={<OrganizerPublished />} />
      <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
      <Route path="/member" element={<MemberAction />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
