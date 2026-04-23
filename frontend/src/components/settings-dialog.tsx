"use client";

import {
  X,
  Server,
  RefreshCw,
  Loader2,
  Wifi,
  Cpu,
  Sparkles,
  Users,
} from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import type { ServerStatus } from "../lib/api";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
  patientId: string;
  onPatientIdChange: (id: string) => void;
  serverStatus: ServerStatus | null;
  isLoadingStatus: boolean;
  onRefreshStatus: () => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  serverUrl,
  onServerUrlChange,
  patientId,
  onPatientIdChange,
  serverStatus,
  isLoadingStatus,
  onRefreshStatus,
}: SettingsDialogProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 animate-fade-in-up"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed right-4 top-20 z-50 w-full max-w-md animate-fade-in-up">
        <div className="bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-muted">
                <Server className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Settings</h2>
                <p className="text-xs text-muted-foreground">
                  Configure connection
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Connection settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-muted-foreground" />
                  Backend WebSocket URL
                </label>
                <Input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => onServerUrlChange(e.target.value)}
                  placeholder="wss://healthsign.me/ws"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Patient ID
                </label>
                <Input
                  type="text"
                  value={patientId}
                  onChange={(e) => onPatientIdChange(e.target.value)}
                  placeholder="Enter patient ID for history"
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Set to save and load translation history
                </p>
              </div>
            </div>

            {/* Server status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Server Status
                </span>
                <button
                  onClick={onRefreshStatus}
                  disabled={isLoadingStatus}
                  className="p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-50">
                  {isLoadingStatus ? (
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              {serverStatus ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Status
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-medium text-foreground capitalize">
                        {serverStatus.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Sessions
                      </span>
                    </div>
                    <span className="font-medium text-foreground">
                      {serverStatus.activeSessions}
                    </span>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        AI Mode
                      </span>
                    </div>
                    <Badge
                      variant={
                        serverStatus.config.useMockAI ? "secondary" : "default"
                      }
                      className="rounded-full">
                      {serverStatus.config.useMockAI ? "Mock" : "Live"}
                    </Badge>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Refinement
                      </span>
                    </div>
                    <Badge
                      className={`rounded-full ${
                        serverStatus.config.enableRefinement
                          ? "gradient-mint-teal text-primary-foreground border-0"
                          : ""
                      }`}
                      variant={
                        serverStatus.config.enableRefinement
                          ? "default"
                          : "secondary"
                      }>
                      {serverStatus.config.enableRefinement ? "Gemini" : "Off"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-xl p-6 text-center">
                  <Server className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click refresh to check server status
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border/50 bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Changes are applied automatically when you close this dialog
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
