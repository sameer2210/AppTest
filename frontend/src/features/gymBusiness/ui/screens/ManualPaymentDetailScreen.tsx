import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MemberPaymentDetailScreenContent, RecordPaymentModal } from "../components/payments";
import { useAppDispatch } from "@/store/hooks";
import {
  fetchMemberPaymentHistoryThunk,
  recordManualPaymentThunk,
} from "../../model/gymBusiness.thunks";
import type { MemberPaymentSummary, PaymentItem, RecordManualPaymentInput } from "@/types/gym";
import { showToastMessage } from "@/utils/app-utils";

export const ManualPaymentDetailScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{
    memberId: string;
    memberName?: string;
    billingCycleText?: string;
    totalPrice?: string;
    totalPaid?: string;
    totalDue?: string;
    daysLeftText?: string;
    isOverdue?: string;
    overdueDays?: string;
    phone?: string;
    profileImage?: string;
    activeMembershipId?: string;
  }>();

  const [member, setMember] = useState<MemberPaymentSummary>({
    memberId: params.memberId || "",
    memberName: params.memberName || "Member",
    planName: "STRON PRO",
    billingCycleText: params.billingCycleText || "STRON PRO - Quarterly",
    totalPrice: Number(params.totalPrice) || 3000,
    totalPaid: Number(params.totalPaid) || 0,
    totalDue: Number(params.totalDue) || 3000,
    paidPercentage:
      Number(params.totalPrice) > 0
        ? Math.round(((Number(params.totalPaid) || 0) / Number(params.totalPrice)) * 100)
        : 0,
    daysLeftText: params.daysLeftText || "2 Days left",
    isOverdue: params.isOverdue === "1",
    overdueDays: Number(params.overdueDays) || 0,
    phone: params.phone || "",
    profileImage: params.profileImage || undefined,
    activeMembershipId: params.activeMembershipId || undefined,
  });

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const fetchPaymentHistory = useCallback(async () => {
    if (!params.memberId) return;
    try {
      const res = await dispatch(fetchMemberPaymentHistoryThunk(params.memberId)).unwrap();
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch {
      showToastMessage("Could not load payment history.");
    } finally {
      setIsLoadingPayments(false);
    }
  }, [params.memberId, dispatch]);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  const handleRecordPayment = async (input: RecordManualPaymentInput) => {
    setIsSubmittingPayment(true);
    try {
      const res = await dispatch(recordManualPaymentThunk(input)).unwrap();
      if (res.success && res.data) {
        showToastMessage("Payment recorded successfully!");
        setIsRecordModalOpen(false);

        // Optimistically update payment list and amounts
        const newPaid = member.totalPaid + input.amount;
        const newDue = Math.max(0, member.totalPrice - newPaid);
        setMember((prev) => ({
          ...prev,
          totalPaid: newPaid,
          totalDue: newDue,
          paidPercentage: prev.totalPrice > 0 ? Math.round((newPaid / prev.totalPrice) * 100) : 100,
        }));
        await fetchPaymentHistory();
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
      <MemberPaymentDetailScreenContent
        member={member}
        payments={payments}
        isLoadingPayments={isLoadingPayments}
        onRecordPaymentPress={() => setIsRecordModalOpen(true)}
        onBack={() => router.back()}
      />

      <RecordPaymentModal
        visible={isRecordModalOpen}
        member={member}
        isSubmitting={isSubmittingPayment}
        onSubmit={handleRecordPayment}
        onClose={() => setIsRecordModalOpen(false)}
      />
    </>
  );
};

export default ManualPaymentDetailScreen;
