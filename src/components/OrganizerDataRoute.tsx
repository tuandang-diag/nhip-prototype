import { type PropsWithChildren, useEffect } from "react";
import { useParams } from "react-router-dom";
import { isDemoMode } from "../services/config";
import { useProductState } from "../state/ProductState";

export function OrganizerDataRoute({ children }: PropsWithChildren) {
  const { groupId = "", announcementId } = useParams();
  const { state, selectedGroupId, status, error, selectGroup, openAnnouncement } =
    useProductState();
  const announcementMatches = !announcementId || state?.announcement.id === announcementId;
  const groupMatches = selectedGroupId === groupId;

  useEffect(() => {
    if (isDemoMode || !groupId || (groupMatches && announcementMatches)) return;
    const operation = announcementId
      ? openAnnouncement(groupId, announcementId)
      : selectGroup(groupId);
    operation.catch(() => undefined);
  }, [groupId, announcementId, groupMatches, announcementMatches, openAnnouncement, selectGroup]);

  const needsData = !groupMatches || Boolean(announcementId && !announcementMatches);

  if (!isDemoMode && needsData) {
    return <div className="screen-message">Đang tải dữ liệu nhóm…</div>;
  }
  if (!isDemoMode && error && !state) {
    return <div className="screen-message">{error}</div>;
  }
  return children;
}
