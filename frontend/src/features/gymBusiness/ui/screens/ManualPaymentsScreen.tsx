import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { ManualPaymentsScreenContent, RecordPaymentModal } from "../components/payments";
import { useAppDispatch } from "@/store/hooks";
import {
  fetchMemberPaymentSummariesThunk,
  recordManualPaymentThunk,
} from "../../model/gymBusiness.thunks";
import type { MemberPaymentSummary, RecordManualPaymentInput } from "@/types/gym";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";

export const ManualPaymentsScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [members, setMembers] = useState<MemberPaymentSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await dispatch(fetchMemberPaymentSummariesThunk()).unwrap();
      if (res.success && res.data) {
        setMembers(res.data);
        setTotalCount(res.totalMembers);
      }
    } catch {
      showToastMessage("Could not load manual payment summaries.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMembers();
  };

  const handleMemberPress = (member: MemberPaymentSummary) => {
    router.push({
      pathname: href.app.manualPaymentDetail,
      params: {
        memberId: member.memberId,
        memberName: member.memberName,
        billingCycleText: member.billingCycleText,
        totalPrice: String(member.totalPrice),
        totalPaid: String(member.totalPaid),
        totalDue: String(member.totalDue),
        daysLeftText: member.daysLeftText,
        isOverdue: member.isOverdue ? "1" : "0",
        overdueDays: String(member.overdueDays || 0),
        phone: member.phone || "",
        profileImage: member.profileImage || "",
        activeMembershipId: member.activeMembershipId || "",
      },
    });
  };

  const handleRecordPayment = async (input: RecordManualPaymentInput) => {
    setIsSubmittingPayment(true);
    try {
      const res = await dispatch(recordManualPaymentThunk(input)).unwrap();
      if (res.success && res.data) {
        showToastMessage("Payment recorded successfully!");
        setIsRecordModalOpen(false);
        await fetchMembers();
      } else {
        showToastMessage(res.message || "Failed to record payment");
      }
    } catch {
      showToastMessage("An unexpected error occurred while recording payment.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <>
      <ManualPaymentsScreenContent
        members={members}
        totalMembersCount={totalCount}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onMemberPress={handleMemberPress}
        onRecordPayment={() => setIsRecordModalOpen(true)}
        onBack={() => router.back()}
      />

      <RecordPaymentModal
        visible={isRecordModalOpen}
        member={null}
        members={members}
        isSubmitting={isSubmittingPayment}
        onSubmit={handleRecordPayment}
        onClose={() => setIsRecordModalOpen(false)}
      />
    </>
  );
};

export default ManualPaymentsScreen;
