import { User, ModulePermissions } from "../types";

/**
 * Shared Clearance Matrix & Messages Permission Helpers
 * Supports flexible parameter orders (user, target) or (target, user) for robust integration.
 */

function isUserObj(obj: any): boolean {
  if (!obj) return false;
  return typeof obj === 'object' && ('role' in obj || 'email' in obj || 'first' in obj || 'clearanceLevel' in obj);
}

export function getUserPermissions(user: User | null | undefined): Partial<ModulePermissions> {
  if (!user) return {};
  if (user.permissions) return user.permissions;

  const level = user.clearanceLevel || (user.role === 'Developer/Admin' ? 6 : user.role === 'Admin' ? 5 : user.role === 'Broker' ? 3 : 2);
  
  if (level >= 5 || user.role === 'Developer/Admin' || user.role === 'Admin' || user.isOwner) {
    return {
      dashboard: 'manage',
      clients: 'manage',
      pipeline: 'manage',
      tasks: 'manage',
      messages: 'manage',
      email: 'manage',
      calendar: 'manage',
      documents: 'manage',
      lenderSheets: 'manage',
      partners: 'manage',
      calculators: 'manage',
      reports: 'manage',
      aiAssistant: 'manage',
      adminPanel: 'manage',
      userManagement: 'manage',
      exportData: true,
    };
  }

  if (level === 4 || level === 3) {
    return {
      dashboard: 'manage',
      clients: 'manage',
      pipeline: 'manage',
      tasks: 'manage',
      messages: 'manage',
      email: 'manage',
      calendar: 'manage',
      documents: 'manage',
      lenderSheets: 'edit',
      partners: 'edit',
      calculators: 'manage',
      reports: 'view',
      aiAssistant: 'manage',
      adminPanel: 'none',
      userManagement: 'none',
      exportData: true,
    };
  }

  return {
    dashboard: 'view',
    clients: 'edit',
    pipeline: 'edit',
    tasks: 'edit',
    messages: 'edit',
    email: 'edit',
    calendar: 'edit',
    documents: 'edit',
    lenderSheets: 'view',
    partners: 'view',
    calculators: 'edit',
    reports: 'none',
    aiAssistant: 'view',
    adminPanel: 'none',
    userManagement: 'none',
    exportData: false,
  };
}

export function canAccessMessages(arg1: any): boolean {
  if (!arg1) return false;
  const status = (arg1.status || '').toLowerCase();
  if (status === 'inactive' || status === 'disabled' || status === 'deleted') return false;
  const perms = getUserPermissions(arg1);
  return perms.messages !== 'none';
}

export function canAccessChannel(arg1: any, arg2?: any): boolean {
  const user = isUserObj(arg1) ? arg1 : isUserObj(arg2) ? arg2 : null;
  const channel = isUserObj(arg1) ? arg2 : arg1;

  if (!user) return true;
  if (!canAccessMessages(user)) return false;
  if (!channel) return true;

  if (channel.isArchived) {
    const role = (user.role || '').toLowerCase();
    const isAdminOrDev = role.includes('admin') || role.includes('developer') || user.isOwner === true;
    if (!isAdminOrDev) return false;
  }

  if (channel.allowedRoles && Array.isArray(channel.allowedRoles) && channel.allowedRoles.length > 0) {
    const userRole = user.role || '';
    if (!channel.allowedRoles.includes(userRole) && userRole !== 'Developer/Admin' && !user.isOwner) {
      return false;
    }
  }

  if (channel.allowedUserIds && Array.isArray(channel.allowedUserIds) && channel.allowedUserIds.length > 0) {
    if (!channel.allowedUserIds.includes(user.id) && user.role !== 'Developer/Admin' && !user.isOwner) {
      return false;
    }
  }

  return true;
}

export function canSendMessage(arg1: any, arg2?: any): boolean {
  const user = isUserObj(arg1) ? arg1 : isUserObj(arg2) ? arg2 : null;
  const channel = isUserObj(arg1) ? arg2 : arg1;

  if (!canAccessChannel(user, channel)) return false;
  const perms = getUserPermissions(user);
  return perms.messages !== 'none';
}

export function canEditMessage(arg1: any, arg2?: any): boolean {
  const user = isUserObj(arg1) ? arg1 : isUserObj(arg2) ? arg2 : null;
  const message = isUserObj(arg1) ? arg2 : arg1;

  if (!user || !message || message.deletedAt) return false;
  const status = (user.status || '').toLowerCase();
  if (status === 'inactive' || status === 'disabled' || status === 'deleted') return false;

  const userId = user.id;
  const isAuthor = (message.senderId && message.senderId === userId) ||
                   (message.authorId && message.authorId === userId) ||
                   (user.first && message.author && message.author.includes(user.first));
  return Boolean(isAuthor);
}

export function canDeleteMessage(arg1: any, arg2?: any): boolean {
  const user = isUserObj(arg1) ? arg1 : isUserObj(arg2) ? arg2 : null;
  const message = isUserObj(arg1) ? arg2 : arg1;

  if (!user || !message || message.deletedAt) return false;
  const status = (user.status || '').toLowerCase();
  if (status === 'inactive' || status === 'disabled' || status === 'deleted') return false;

  const userId = user.id;
  const isAuthor = (message.senderId && message.senderId === userId) ||
                   (message.authorId && message.authorId === userId) ||
                   (user.first && message.author && message.author.includes(user.first));
  
  const role = (user.role || '').toLowerCase();
  const isAdminOrDev = role.includes('admin') || role.includes('developer') || user.isOwner === true;
  return Boolean(isAuthor || isAdminOrDev);
}

export function canSaveMessage(arg1: any, arg2?: any): boolean {
  const user = isUserObj(arg1) ? arg1 : isUserObj(arg2) ? arg2 : null;
  const message = isUserObj(arg1) ? arg2 : arg1;

  if (!user || !message || message.deletedAt) return false;
  return canAccessMessages(user);
}
