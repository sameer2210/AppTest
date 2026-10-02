import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { BankAccountFormContent } from "./BankAccountFormContent";
import { VerifyingAccountContent } from "./VerifyingAccountContent";
import { VerifiedAccountContent } from "./VerifiedAccountContent";
import { UnverifiedAccountContent } from "./UnverifiedAccountContent";
import { useAppDispatch } from "@/store/hooks";
import { showToastMessage } from "@/utils/app-utils";
import {
  fetchPayoutAccountThunk,
  saveBankDetailsOnlyThunk,
} from "@/features/gymBusiness";
import type { PayoutAccountInfo, SavePayoutAccountInput } from "@/types/gym/payout.types";

export type PayoutFlowStep = "FORM" | "VERIFYING" | "VERIFIED" | "UNVERIFIED";

interface PayoutVerificationScreenContentProps {
  initialStep?: PayoutFlowStep;
  gymName?: string;
  onBack: () => void;
  onDone: () => void;
}

export const PayoutVerificationScreenContent: React.FC<PayoutVerificationScreenContentProps> = ({
  initialStep = "FORM",
  gymName = "your business",
  onBack,
  onDone,
}) => {
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState<PayoutFlowStep>(initialStep);
  const [account, setAccount] = useState<PayoutAccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const fetchCurrentAccount = useCallback(async () => {
    try {
      const res = await dispatch(fetchPayoutAccountThunk()).unwrap();
      if (res.success && res.data) {
        // Only store account data to pre-fill the form.
        // Do NOT auto-navigate to VERIFYING / VERIFIED / UNVERIFIED —
        // this screen is used purely for save/edit.
        setAccount(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchCurrentAccount();
  }, [fetchCurrentAccount]);

  const handleCheckStatusNow = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await dispatch(fetchPayoutAccountThunk()).unwrap();
      if (res.success && res.data) {
        setAccount(res.data);
        if (res.data.verificationStatus === "VERIFIED") {
          setCurrentStep("VERIFIED");
        } else if (res.data.verificationStatus === "FAILED") {
          setCurrentStep("UNVERIFIED");
        }
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSubmitForm = async (input: SavePayoutAccountInput) => {
    setIsSubmitting(true);
    try {
      const res = await dispatch(saveBankDetailsOnlyThunk(input)).unwrap();
      if (res.success) {
        showToastMessage("Bank details saved. Verification in progress.", "success");
        onDone();
        return;
      }
      showToastMessage(res.message ?? "Failed to save bank details", "failure");
      Alert.alert(
        "Could not save",
        res.message ?? "Failed to save bank details. Please try again.",
      );
    } catch (err: any) {
      const msg = err?.message ?? "Failed to save bank details. Please check your connection.";
      showToastMessage(msg, "failure");
      Alert.alert("Could not save", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDetails = () => {
    setCurrentStep("FORM");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#086CFF" />
      </View>
    );
  }

  // 1. Verifying in progress
  if (currentStep === "VERIFYING" && account) {
    return (
      <VerifyingAccountContent
        account={account}
        isChecking={isCheckingStatus}
        onCheckStatus={handleCheckStatusNow}
        onDone={onDone}
        onBack={onBack}
      />
    );
  }

  // 2. Verified State
  if (currentStep === "VERIFIED" && account) {
    return (
      <VerifiedAccountContent
        account={account}
        gymName={gymName}
        onDone={onDone}
        onEditDetails={handleEditDetails}
        onBack={onBack}
      />
    );
  }

  // 3. Failed / Unverified State
  if (currentStep === "UNVERIFIED" && account) {
    return (
      <UnverifiedAccountContent
        account={account}
        gymName={gymName}
        onGoBack={onBack}
        onEditDetails={handleEditDetails}
        onBack={onBack}
      />
    );
  }

  // 4. Form State (Default)
  return (
    <BankAccountFormContent
      initialData={
        account
          ? {
              panNumber: account.panNumber,
              accountHolderName: account.accountHolderName,
              ifsc: account.ifsc,
              accountType: account.accountType,
            }
          : undefined
      }
      gymName={gymName}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmitForm}
      onBack={onBack}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#050506",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PayoutVerificationScreenContent;
