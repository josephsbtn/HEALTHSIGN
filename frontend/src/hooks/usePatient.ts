import { useState, useCallback } from "react";

interface UsePatientOptions {
  onPatientChanged?: (patientName: string) => void;
}

export function usePatient({ onPatientChanged }: UsePatientOptions = {}) {
  const [patientId, setPatientId] = useState("");
  const [patientNameInput, setPatientNameInput] = useState("");
  const [patientFormError, setPatientFormError] = useState<string | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);

  const validatePatientName = (name: string): boolean => {
    const trimmed = name.trim();

    if (!trimmed) {
      setPatientFormError("Patient name is required");
      return false;
    }

    if (trimmed.length < 2) {
      setPatientFormError("Patient name must be at least 2 characters");
      return false;
    }

    return true;
  };

  const submitPatient = useCallback(() => {
    const nextPatientName = patientNameInput.trim();

    if (!validatePatientName(nextPatientName)) {
      return;
    }

    setPatientFormError(null);
    setPatientId(nextPatientName);
    setShowPatientForm(false);
    onPatientChanged?.(nextPatientName);
  }, [patientNameInput, onPatientChanged]);

  const startNewPatient = useCallback(() => {
    setPatientNameInput(patientId);
    setPatientFormError(null);
    setShowPatientForm(true);
  }, [patientId]);

  const resetPatient = useCallback(() => {
    setPatientId("");
    setPatientNameInput("");
    setPatientFormError(null);
    setShowPatientForm(false);
  }, []);

  return {
    patientId,
    patientNameInput,
    patientFormError,
    showPatientForm,
    setPatientNameInput,
    setShowPatientForm,
    submitPatient,
    startNewPatient,
    resetPatient,
    validatePatientName,
    clearError: () => setPatientFormError(null),
  };
}
