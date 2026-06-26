export type WorkspaceRole = 'owner' | 'member';

export type WorkspaceSubscriptionStatus =
  | 'inactive'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export type DataScope = 'personal' | 'workspace';

export type Workspace = {
  id: string;
  name: string;
  ownerUserId: string;
  inviteCode: string;
  stripeSubscriptionId: string | null;
  subscriptionStatus: WorkspaceSubscriptionStatus;
  subscriptionPlan: 'monthly' | 'yearly' | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  displayName: string | null;
  joinedAt: string;
};

export type WorkspaceReceiptRow = {
  id: string;
  workspaceId: string;
  localReceiptId: string | null;
  storeName: string;
  receiptDate: string;
  total: number;
  data: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
