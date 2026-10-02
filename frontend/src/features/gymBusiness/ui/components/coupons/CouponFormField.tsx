import React from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

interface CouponFormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export const CouponFormField: React.FC<CouponFormFieldProps> = ({
  label,
  error,
  prefix,
  suffix,
  ...inputProps
}) => {
  return (
    <View style={styles.container}>
      <CustomText style={styles.label}>{label}</CustomText>
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputError : styles.inputNormal,
        ]}
      >
        {prefix && <CustomText style={styles.affixText}>{prefix}</CustomText>}
        <TextInput
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          {...inputProps}
        />
        {suffix && <CustomText style={styles.affixText}>{suffix}</CustomText>}
      </View>
      {error && <CustomText style={styles.errorText}>{error}</CustomText>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    height: 52,
    borderRadius: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  inputNormal: {
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputError: {
    borderColor: "rgba(239, 68, 68, 0.8)",
  },
  affixText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    height: "100%",
    padding: 0,
  },
  errorText: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "#F87171",
    marginTop: 6,
    marginLeft: 4,
  },
});

export default CouponFormField;
