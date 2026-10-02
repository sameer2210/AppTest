import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MemberValidityScreenContent } from "../components";
import { useAppDispatch } from "@/store/hooks";
import { listMembersValidityThunk, deleteMemberThunk } from "../../model/gymBusiness.thunks";
import type {
  MemberValidityItem,
  MemberValidityCounters,
  MemberValidityFilterType,
} from "@/types/gym";
import { showToastMessage } from "@/utils/app-utils";

export const GymMembersScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ filter?: string }>();

  const normalizeFilter = (raw?: string): MemberValidityFilterType => {
    if (!raw) return "ALL";
    const upper = raw.toUpperCase();
    if (upper === "NEW_LEADS" || raw === "new_leads") return "NEW_LEADS";
    if (upper === "EXPIRED" || raw === "expired") return "EXPIRED";
    if (upper === "ABOUT_TO_EXPIRE" || raw === "about_to_expire") return "ABOUT_TO_EXPIRE";
    if (upper === "MORE_THAN_WEEK" || raw === "more_than_week") return "MORE_THAN_WEEK";
    return "ALL";
  };

  const initialFilter: MemberValidityFilterType = normalizeFilter(params.filter);

  const [members, setMembers] = useState<MemberValidityItem[]>([]);
  const [counters, setCounters] = useState<MemberValidityCounters>({
    newLeadsCount: 0,
    expiredCount: 0,
    aboutToExpireCount: 0,
    moreThanWeekCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await dispatch(listMembersValidityThunk()).unwrap();
      if (res.members) {
        setMembers(res.members);
        setCounters(res.counters);
      }
    } catch {
      showToastMessage("Could not load members validity list.");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleDeleteMember = async (memberId: string) => {
    try {
      const success = await dispatch(deleteMemberThunk(memberId)).unwrap();
      if (success) {
        showToastMessage("Member removed.");
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        showToastMessage("Could not remove member.");
      }
    } catch {
      showToastMessage("Error removing member.");
    }
  };

  return (
    <MemberValidityScreenContent
      initialFilter={initialFilter}
      members={members}
      counters={counters}
      isLoading={isLoading}
      onDeleteMember={handleDeleteMember}
      onBack={() => router.back()}
    />
  );
};

export default GymMembersScreen;
