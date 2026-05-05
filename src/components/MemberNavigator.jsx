import React, { useState, useEffect } from "react";
import { MemberDetailModal } from "./MemberDetailModal";

export default function MemberNavigator({ initialMember, allMembers = [], onClose, onEdit }) {
  const [currentMember, setCurrentMember] = useState(initialMember);

  useEffect(() => {
    setCurrentMember(initialMember);
  }, [initialMember]);

  const goToMember = (member) => {
    if (member?.id) {
      setCurrentMember(member);
    }
  };

  return (
    <MemberDetailModal
      member={currentMember}
      allMembers={allMembers}
      onClose={onClose}
      onEdit={onEdit}
      onNavigateToMember={goToMember}
    />
  );
}
