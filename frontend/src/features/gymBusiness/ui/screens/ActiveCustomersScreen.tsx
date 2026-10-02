import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { ActiveCustomersScreenContent } from "../components/members/ActiveCustomersScreenContent";
import { useAppDispatch } from "@/store/hooks";
import { listMembersValidityThunk, deleteMemberThunk } from "../../model/gymBusiness.thunks";
import type { MemberValidityItem } from "@/types/gym";
import { showToastMessage } from "@/utils/app-utils";

export const ActiveCustomersScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [members, setMembers] = useState<MemberValidityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMembers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const res = await dispatch(listMembersValidityThunk()).unwrap();
        if (res.members) {
          // Filter for active customers (non-expired)
          const activeOnly = res.members.filter(
            (m) => !m.isExpired && m.category !== "EXPIRED",
          );
          // If active members exist show them; otherwise fallback to res.members
          setMembers(activeOnly.length > 0 ? activeOnly : res.members);
        }
      } catch {
        showToastMessage("Could not load active customers.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleDeleteMember = async (memberId: string) => {
    try {
      const success = await dispatch(deleteMemberThunk(memberId)).unwrap();
      if (success) {
        showToastMessage("Customer removed.");
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        showToastMessage("Could not remove customer.");
      }
    } catch {
      showToastMessage("Error removing customer.");
    }
  };

  return (
    <ActiveCustomersScreenContent
      members={members}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      onRefresh={() => fetchMembers(true)}
      onDeleteMember={handleDeleteMember}
      onBack={() => router.back()}
    />
  );
};

export default ActiveCustomersScreen;
