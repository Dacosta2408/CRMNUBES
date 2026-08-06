import React from "react";
import { User, Client } from "../types";
import { BackupRecoveryView } from "./admin/BackupRecoveryView";

interface BackupRecoveryPanelProps {
  currentUser: User;
  clients: Client[];
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  onRefreshCRMData?: () => void;
}

export const BackupRecoveryPanel: React.FC<BackupRecoveryPanelProps> = ({
  currentUser,
  clients,
  showToast,
  onRefreshCRMData
}) => {
  return (
    <BackupRecoveryView
      currentUser={currentUser}
      clients={clients}
      showToast={showToast}
      onRefreshCRMData={onRefreshCRMData}
    />
  );
};
