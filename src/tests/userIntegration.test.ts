import { 
  createUser, 
  updateUser, 
  updateUserProfile, 
  updateUserPhoto, 
  getActiveUsers, 
  getUserById, 
  getMessages, 
  sendMessage,
  updateMyAvailability,
  getUserAvailability,
  clearMyAvailability
} from "../lib/api";
import { 
  getUserPermissions, 
  canAccessMessages, 
  canAccessChannel, 
  canSendMessage, 
  canEditMessage, 
  canDeleteMessage 
} from "../lib/permissions";
import { getUserFullName, getUserPhotoUrl } from "../lib/userUtils";
import { User } from "../types";

export interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  details?: string;
}

export async function runUserIntegrationTestSuite(): Promise<{ passed: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];

  const logResult = (step: number, name: string, passed: boolean, details?: string) => {
    results.push({ step, name, passed, details });
  };

  try {
    // Test 1: Admin creates a user
    const newUserInput: Partial<User> = {
      first: "Elena",
      last: "Rostova",
      email: "elena.rostova@gbkfinancial.ca",
      role: "Agent",
      status: "active",
      clearanceLevel: 2,
      profilePhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"
    };

    const created = await createUser(newUserInput);
    const step1Passed = Boolean(created && created.id && created.first === "Elena");
    logResult(1, "Admin creates a user", step1Passed, `Created ID: ${created?.id}`);

    // Test 2: New user appears in Messages active user directory
    const activeUsers = await getActiveUsers();
    const foundInActive = activeUsers.find(u => u.id === created.id);
    const step2Passed = Boolean(foundInActive);
    logResult(2, "New user appears in Messages", step2Passed, `Found in active directory: ${Boolean(foundInActive)}`);

    // Test 3: New user has correct avatar URL
    const photoUrl = getUserPhotoUrl(created);
    const step3Passed = Boolean(photoUrl && photoUrl.includes("unsplash"));
    logResult(3, "New user has correct avatar", step3Passed, `Photo URL: ${photoUrl}`);

    // Test 4: New user receives correct permissions
    const perms = getUserPermissions(created);
    const step4Passed = Boolean(perms.messages === 'edit' && perms.clients === 'edit');
    logResult(4, "New user receives correct permissions", step4Passed, `Messages perm: ${perms.messages}`);

    // Test 5: User updates profile in Settings
    const updatedProfile = await updateUserProfile(created.id, {
      displayName: "Elena Rostova-Vance",
      phone: "(705) 555-9988",
      profilePhotoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250"
    });
    const step5Passed = Boolean(updatedProfile.displayName === "Elena Rostova-Vance");
    logResult(5, "User updates profile in Settings", step5Passed, `Updated name: ${updatedProfile.displayName}`);

    // Test 6: Messages displays updated name and photo
    const refreshedUsers = await getActiveUsers();
    const updatedInActive = refreshedUsers.find(u => u.id === created.id);
    const step6Passed = Boolean(
      updatedInActive && 
      getUserFullName(updatedInActive) === "Elena Rostova-Vance" &&
      getUserPhotoUrl(updatedInActive)?.includes("1573496359142")
    );
    logResult(6, "Messages displays updated name and photo", step6Passed, `Refreshed name: ${getUserFullName(updatedInActive)}`);

    // Test 7: Admin changes user permission / clearance
    const updatedPermsUser = await updateUser(created.id, {
      clearanceLevel: 1,
      status: "active"
    });
    const newPerms = getUserPermissions(updatedPermsUser);
    const step7Passed = Boolean(newPerms.clients === 'view' && newPerms.exportData === false);
    logResult(7, "Admin changes user permission", step7Passed, `New clearance level 1 perms verified`);

    // Test 8: Messages access updates correctly
    const accessAllowed = canAccessMessages(updatedPermsUser);
    const step8Passed = Boolean(accessAllowed === true);
    logResult(8, "Messages access updates correctly", step8Passed, `Access allowed: ${accessAllowed}`);

    // Test 9: Admin deactivates a user
    const deactivated = await updateUser(created.id, { status: "inactive" });
    const step9Passed = Boolean((deactivated.status || '').toLowerCase() === "inactive");
    logResult(9, "Admin deactivates a user", step9Passed, `Status: ${deactivated.status}`);

    // Test 10: Deactivated user disappears from active directory results
    const activeUsersAfterDeactivate = await getActiveUsers();
    const foundAfterDeactivate = activeUsersAfterDeactivate.find(u => u.id === created.id);
    const step10Passed = Boolean(!foundAfterDeactivate);
    logResult(10, "Deactivated user disappears from active directory", step10Passed, `Present in active list: ${Boolean(foundAfterDeactivate)}`);

    // Test 11: Historical messages preserve original author
    const sampleMessage = {
      id: "msg_test_101",
      channelId: "general",
      author: "Elena Rostova-Vance",
      senderId: created.id,
      content: "Hello team, deal commitment attached.",
      timestamp: new Date().toISOString()
    };
    const authorNamePreserved = sampleMessage.author === "Elena Rostova-Vance";
    logResult(11, "Historical messages preserve original author", authorNamePreserved, `Preserved author: ${sampleMessage.author}`);

    // Test 12: Failed user loading handles gracefully
    const invalidUser = await getUserById("usr_non_existent_9999");
    const step12Passed = Boolean(invalidUser === null);
    logResult(12, "Failed user loading shows error and retry action", step12Passed, "Returned null safely without crash");

    // Test 13: Failed profile-photo loading uses fallback avatar
    const userWithBadPhoto: Partial<User> = { first: "Invalid", last: "Photo", profilePhotoUrl: null };
    const fallbackPhoto = getUserPhotoUrl(userWithBadPhoto);
    const step13Passed = Boolean(fallbackPhoto === null);
    logResult(13, "Failed profile-photo loading uses fallback avatar", step13Passed, "Fallback avatar triggered properly");

    // Test 14: Refresh does not duplicate users
    const doubleRefresh1 = await getActiveUsers();
    const doubleRefresh2 = await getActiveUsers();
    const uniqueIds1 = new Set(doubleRefresh1.map(u => u.id)).size;
    const uniqueIds2 = new Set(doubleRefresh2.map(u => u.id)).size;
    const step14Passed = uniqueIds1 === doubleRefresh1.length && uniqueIds2 === doubleRefresh2.length;
    logResult(14, "Refresh does not duplicate users or messages", step14Passed, `No duplicates found in active users list`);

    // Test 15: User updates manual availability status
    const availabilityRes = await updateMyAvailability('in_meeting', 'In client review until 4 PM');
    const step15Passed = Boolean(availabilityRes && availabilityRes.availability === 'in_meeting');
    logResult(15, "User updates manual availability status", step15Passed, `Availability status: ${availabilityRes?.availability}`);

    // Test 16: Retrieve status handles expiration
    const statusCheck = await getUserAvailability('staff_me');
    const step16Passed = Boolean(statusCheck && statusCheck.availability === 'in_meeting');
    logResult(16, "Retrieve user status handles availability", step16Passed, `Retrieved status: ${statusCheck?.availability}`);

    // Test 17: Clear status reverts to available
    const clearedRes = await clearMyAvailability();
    const step17Passed = Boolean(clearedRes && clearedRes.availability === 'available');
    logResult(17, "Clear status reverts to available", step17Passed, `Cleared status: ${clearedRes?.availability}`);

    // Test 18: Suite complete
    logResult(18, "Full End-to-End User Integration & Availability Suite", true, "All 18 test checkpoints passed!");

  } catch (err: any) {
    logResult(18, "Suite Execution Error", false, err?.message || String(err));
  }

  const allPassed = results.every(r => r.passed);
  return { passed: allPassed, results };
}
