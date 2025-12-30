import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAPIs() {
  console.log("=== Authenticated API Tests ===\n");

  // Get a test user
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .limit(1)
    .single();

  if (!items) {
    console.log("❌ No items found in database");
    return;
  }

  const userId = items.user_id;
  const testItemId = items.id;
  console.log(`Using test item: ${testItemId}`);
  console.log(`User ID: ${userId}\n`);

  // Test 1: Check items with awaiting_approval status
  console.log("--- Test 1: Review Items ---");
  const { data: reviewItems, error: reviewError } = await supabase
    .from("items")
    .select("id, body, triage_state, ai_suggested_bucket, ai_suggested_category")
    .eq("user_id", userId)
    .eq("triage_state", "awaiting_approval");

  if (reviewError) {
    console.log(`❌ Error: ${reviewError.message}`);
  } else {
    console.log(`✅ Found ${reviewItems?.length || 0} items awaiting approval`);
    reviewItems?.forEach((item) => {
      console.log(`   - ${item.body?.slice(0, 40)}... → ${item.ai_suggested_bucket}/${item.ai_suggested_category}`);
    });
  }

  // Test 2: Test Approve functionality
  console.log("\n--- Test 2: Approve Item ---");
  const itemToApprove = reviewItems?.[0];
  if (itemToApprove) {
    const { error: approveError } = await supabase
      .from("items")
      .update({
        bucket: itemToApprove.ai_suggested_bucket,
        triage_state: "done",
        triaged_at: new Date().toISOString(),
      })
      .eq("id", itemToApprove.id);

    if (approveError) {
      console.log(`❌ Approve Error: ${approveError.message}`);
    } else {
      console.log(`✅ Approved item: ${itemToApprove.id}`);
    }

    // Revert for testing
    await supabase
      .from("items")
      .update({ triage_state: "awaiting_approval", triaged_at: null })
      .eq("id", itemToApprove.id);
    console.log(`   (Reverted for continued testing)`);
  } else {
    console.log("⚠️ No items to approve");
  }

  // Test 3: Test Reject functionality
  console.log("\n--- Test 3: Reject Item ---");
  const itemToReject = reviewItems?.[1] || reviewItems?.[0];
  if (itemToReject) {
    const { error: rejectError } = await supabase
      .from("items")
      .update({
        triage_state: "done",
        triaged_at: new Date().toISOString(),
        ai_suggested_bucket: null,
        ai_suggested_category: null,
      })
      .eq("id", itemToReject.id);

    if (rejectError) {
      console.log(`❌ Reject Error: ${rejectError.message}`);
    } else {
      console.log(`✅ Rejected item: ${itemToReject.id}`);
    }

    // Revert for testing
    await supabase
      .from("items")
      .update({ triage_state: "awaiting_approval", triaged_at: null })
      .eq("id", itemToReject.id);
    console.log(`   (Reverted for continued testing)`);
  } else {
    console.log("⚠️ No items to reject");
  }

  // Test 4: Test Inbox query (only done items)
  console.log("\n--- Test 4: Inbox Query ---");
  const { data: inboxItems, error: inboxError } = await supabase
    .from("items")
    .select("id, body, triage_state")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("triage_state", "done")
    .limit(5);

  if (inboxError) {
    console.log(`❌ Inbox Error: ${inboxError.message}`);
  } else {
    console.log(`✅ Inbox has ${inboxItems?.length || 0} items (triage_state=done)`);
  }

  // Test 5: Test subtasks update
  console.log("\n--- Test 5: Subtask Update ---");
  const testSubtasks = [
    { id: "test-1", text: "Test subtask 1", completed: false, created_at: new Date().toISOString() },
    { id: "test-2", text: "Test subtask 2", completed: true, created_at: new Date().toISOString() },
  ];

  const { error: subtaskError } = await supabase
    .from("items")
    .update({ subtasks: testSubtasks })
    .eq("id", testItemId);

  if (subtaskError) {
    console.log(`❌ Subtask Error: ${subtaskError.message}`);
  } else {
    console.log(`✅ Subtasks updated successfully`);
  }

  // Revert subtasks
  await supabase.from("items").update({ subtasks: [] }).eq("id", testItemId);

  // Test 6: Test memo update
  console.log("\n--- Test 6: Memo Update ---");
  const { error: memoError } = await supabase
    .from("items")
    .update({ memo: "Test memo content" })
    .eq("id", testItemId);

  if (memoError) {
    console.log(`❌ Memo Error: ${memoError.message}`);
  } else {
    console.log(`✅ Memo updated successfully`);
  }

  // Revert memo
  await supabase.from("items").update({ memo: null }).eq("id", testItemId);

  // Test 7: Test due_date update
  console.log("\n--- Test 7: Due Date Update ---");
  const { error: dueDateError } = await supabase
    .from("items")
    .update({ due_date: "2025-12-31" })
    .eq("id", testItemId);

  if (dueDateError) {
    console.log(`❌ Due Date Error: ${dueDateError.message}`);
  } else {
    console.log(`✅ Due date updated successfully`);
  }

  // Revert due_date
  await supabase.from("items").update({ due_date: null }).eq("id", testItemId);

  // Test 8: API Keys table
  console.log("\n--- Test 8: API Keys Table ---");
  const { data: apiKeys, error: apiKeysError } = await supabase
    .from("api_keys")
    .select("*")
    .limit(1);

  if (apiKeysError) {
    console.log(`❌ API Keys Error: ${apiKeysError.message}`);
  } else {
    console.log(`✅ API Keys table accessible (${apiKeys?.length || 0} keys)`);
  }

  // Test 9: User Settings table
  console.log("\n--- Test 9: User Settings Table ---");
  const { data: userSettings, error: userSettingsError } = await supabase
    .from("user_settings")
    .select("*")
    .limit(1);

  if (userSettingsError) {
    console.log(`❌ User Settings Error: ${userSettingsError.message}`);
  } else {
    console.log(`✅ User Settings table accessible`);
  }

  console.log("\n=== All Tests Completed ===");
}

testAPIs().catch(console.error);
