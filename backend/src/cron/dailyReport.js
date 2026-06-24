const cron = require("node-cron");
const supabase = require("../supabase");
const { getChallengeContract } = require("../chain");

async function processDay(challenge) {
  const contract = getChallengeContract();

  // Get all participants with their wallet addresses
  const { data: participants } = await supabase
    .from("challenge_participants")
    .select("user_id, users(wallet_address)")
    .eq("challenge_id", challenge.id);

  if (!participants || participants.length === 0) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  // Get screen time reports for yesterday
  const { data: reports } = await supabase
    .from("screen_time_reports")
    .select("user_id, minutes")
    .eq("challenge_id", challenge.id)
    .eq("date", dateStr);

  const reportMap = new Map();
  if (reports) {
    for (const r of reports) {
      reportMap.set(r.user_id, r.minutes);
    }
  }

  // Determine who went over the daily limit
  // Users who didn't report are assumed to have gone over
  const overUsers = [];
  for (const p of participants) {
    const minutes = reportMap.get(p.user_id);
    const wentOver =
      minutes === undefined || minutes > challenge.daily_limit_minutes;
    if (wentOver && p.users?.wallet_address) {
      overUsers.push(p.users.wallet_address);
    }
  }

  // Submit on-chain reportOverages
  if (overUsers.length > 0) {
    console.log(
      `Challenge ${challenge.id} day ${challenge.current_day}: reporting ${overUsers.length} overages`
    );
    const tx = await contract.reportOverages(
      challenge.on_chain_id,
      overUsers
    );
    await tx.wait();
    console.log(`reportOverages tx confirmed: ${tx.hash}`);
  } else {
    // Still need to advance the day on-chain (send empty array)
    const tx = await contract.reportOverages(challenge.on_chain_id, []);
    await tx.wait();
    console.log(`No overages for challenge ${challenge.id}, day advanced: ${tx.hash}`);
  }

  // Advance day in database
  const newDay = challenge.current_day + 1;
  const isComplete = newDay >= challenge.duration_days;

  await supabase
    .from("challenges")
    .update({
      current_day: newDay,
      status: isComplete ? "completed" : "active",
    })
    .eq("id", challenge.id);

  // If challenge is complete, settle it
  if (isComplete) {
    await settleChallenge(challenge);
  }
}

async function settleChallenge(challenge) {
  const contract = getChallengeContract();

  // Calculate winner: participant with lowest total screen time
  const { data: totals } = await supabase
    .from("screen_time_reports")
    .select("user_id, minutes")
    .eq("challenge_id", challenge.id);

  if (!totals || totals.length === 0) return;

  const userTotals = new Map();
  for (const t of totals) {
    userTotals.set(t.user_id, (userTotals.get(t.user_id) || 0) + t.minutes);
  }

  // Find winner (lowest total)
  let winnerId = null;
  let lowestMinutes = Infinity;
  for (const [userId, total] of userTotals) {
    if (total < lowestMinutes) {
      lowestMinutes = total;
      winnerId = userId;
    }
  }

  if (!winnerId) return;

  // Get winner's wallet address
  const { data: winner } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("id", winnerId)
    .single();

  if (!winner?.wallet_address) {
    console.error(`Winner ${winnerId} has no wallet address`);
    return;
  }

  console.log(
    `Settling challenge ${challenge.id}: winner ${winner.wallet_address} with ${lowestMinutes} total minutes`
  );

  const tx = await contract.settleChallenge(
    challenge.on_chain_id,
    winner.wallet_address
  );
  await tx.wait();
  console.log(`settleChallenge tx confirmed: ${tx.hash}`);

  await supabase
    .from("challenges")
    .update({ status: "settled", winner_id: winnerId })
    .eq("id", challenge.id);
}

async function runDailyReport() {
  console.log("Running daily overage report...");

  const { data: activeChallenges, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("status", "active");

  if (error) {
    console.error("Failed to fetch active challenges:", error.message);
    return;
  }

  if (!activeChallenges || activeChallenges.length === 0) {
    console.log("No active challenges to process.");
    return;
  }

  for (const challenge of activeChallenges) {
    try {
      await processDay(challenge);
    } catch (err) {
      console.error(`Error processing challenge ${challenge.id}:`, err.message);
    }
  }
}

function startCron() {
  // Run at midnight UTC every day
  cron.schedule("0 0 * * *", runDailyReport, { timezone: "UTC" });
  console.log("Daily report cron scheduled (midnight UTC)");
}

module.exports = { startCron, runDailyReport };
