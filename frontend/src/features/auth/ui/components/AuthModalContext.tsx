import React, { createContext, useCallback, useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "../../model/auth.slice";
import { AuthModal, type AuthModalStep } from "./AuthModal";

type AuthModalOptions = {
  allowGuest?: boolean;
};

type AuthModalContextType = {
  showAuthModal: (step?: AuthModalStep, onSuccess?: () => void, options?: AuthModalOptions) => void;
  hideAuthModal: () => void;
  requireAuth: (onAuthenticated: () => void, step?: AuthModalStep) => void;
};

const AuthModalContext = createContext<AuthModalContextType>({
  showAuthModal: () => { },
  hideAuthModal: () => { },
  requireAuth: () => { },
});

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppSelector(selectAuthUser);
  const isAuthenticated = Boolean(user && user.uid && !user.isGuest);

  const [visible, setVisible] = useState(false);
  const [initialStep, setInitialStep] = useState<AuthModalStep>("methods");
  const [allowGuest, setAllowGuest] = useState(true);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | undefined>();

  const showAuthModal = useCallback((
    step: AuthModalStep = "methods",
    onSuccess?: () => void,
    options?: AuthModalOptions,
  ) => {
    setInitialStep(step);
    setAllowGuest(options?.allowGuest !== false);
    setOnSuccessCallback(() => onSuccess);
    setVisible(true);
  }, []);

  const hideAuthModal = useCallback(() => {
    setVisible(false);
    setOnSuccessCallback(undefined);
    setAllowGuest(true);
  }, []);

  const requireAuth = useCallback(
    (onAuthenticated: () => void, step: AuthModalStep = "methods") => {
      if (isAuthenticated) {
        onAuthenticated();
      } else {
        showAuthModal(step, onAuthenticated);
      }
    },
    [isAuthenticated, showAuthModal],
  );

  return (
    <AuthModalContext.Provider value={{ showAuthModal, hideAuthModal, requireAuth }}>
      <View style={styles.root}>
        {children}
        <AuthModal
          visible={visible}
          onClose={hideAuthModal}
          onSuccess={onSuccessCallback}
          initialStep={initialStep}
          allowGuest={allowGuest}
        />
      </View>
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => useContext(AuthModalContext);

export const useRequireAuth = () => {
  const { requireAuth } = useAuthModal();
  return requireAuth;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
