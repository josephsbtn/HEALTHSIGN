"use client";

import React, { useEffect, useRef } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { AlertCircle, User } from "lucide-react";

interface PatientFormProps {
  patientNameInput: string;
  onPatientNameChange: (value: string) => void;
  patientFormError: string | null;
  onSubmit: () => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function PatientForm({
  patientNameInput,
  onPatientNameChange,
  patientFormError,
  onSubmit,
  isLoading = false,
  onCancel,
}: PatientFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      onSubmit();
    }
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl gradient-mint-teal">
          <User className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-foreground">
            Patient Information
          </h3>
          <p className="text-sm text-muted-foreground">
            This will be used for history tracking and consultations
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <label htmlFor="patient-name" className="text-sm font-medium">
          Patient Name *
        </label>
        <Input
          ref={inputRef}
          id="patient-name"
          type="text"
          value={patientNameInput}
          onChange={(e) => onPatientNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter patient name (minimum 2 characters)"
          disabled={isLoading}
          className="rounded-xl text-base h-11"
          autoComplete="off"
          aria-invalid={!!patientFormError}
          aria-describedby={patientFormError ? "patient-error" : undefined}
        />
      </div>

      {/* Error Message */}
      {patientFormError && (
        <div
          id="patient-error"
          className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{patientFormError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={onSubmit}
          disabled={isLoading || !patientNameInput.trim()}
          className="flex-1 h-11 rounded-xl font-medium">
          {isLoading ? "Submitting..." : "Start"}
        </Button>
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isLoading}
            className="h-11 rounded-xl">
            Cancel
          </Button>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground text-center">
        Press Enter to submit or ESC to cancel
      </p>
    </div>
  );
}
