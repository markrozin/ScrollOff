const { Router } = require("express");
const supabase = require("../supabase");
const requireAuth = require("../middleware/auth");

const router = Router();

// POST /challenges — create a new challenge
router.post("/", requireAuth, async (req, res) => {
  const { entry_fee, daily_penalty, duration_days, max_participants, daily_limit_minutes } = req.body;

  if (!daily_penalty || !duration_days || !max_participants || !daily_limit_minutes) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      creator_id: req.user.id,
      entry_fee: entry_fee || 0,
      daily_penalty,
      duration_days,
      max_participants,
      daily_limit_minutes,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// GET /challenges — list open challenges
router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("challenges")
    .select("*, challenge_participants(user_id)")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// GET /challenges/:id — get challenge details
router.get("/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("challenges")
    .select("*, challenge_participants(user_id, users(wallet_address))")
    .eq("id", req.params.id)
    .single();

  if (error) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  res.json(data);
});

// POST /challenges/:id/join — record that user joined (after on-chain joinChallenge tx)
router.post("/:id/join", requireAuth, async (req, res) => {
  const challengeId = req.params.id;

  // Verify challenge exists and is open
  const { data: challenge, error: cErr } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (cErr || !challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  if (challenge.status !== "open") {
    return res.status(400).json({ error: "Challenge is not open for joining" });
  }

  // Check participant count
  const { count } = await supabase
    .from("challenge_participants")
    .select("*", { count: "exact", head: true })
    .eq("challenge_id", challengeId);

  if (count >= challenge.max_participants) {
    return res.status(400).json({ error: "Challenge is full" });
  }

  const { data, error } = await supabase
    .from("challenge_participants")
    .insert({ challenge_id: challengeId, user_id: req.user.id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Already joined" });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// POST /challenges/:id/start — creator starts the challenge
router.post("/:id/start", requireAuth, async (req, res) => {
  const challengeId = req.params.id;

  const { data: challenge, error: cErr } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (cErr || !challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  if (challenge.creator_id !== req.user.id) {
    return res.status(403).json({ error: "Only the creator can start the challenge" });
  }

  if (challenge.status !== "open") {
    return res.status(400).json({ error: "Challenge is not in open state" });
  }

  const { count } = await supabase
    .from("challenge_participants")
    .select("*", { count: "exact", head: true })
    .eq("challenge_id", challengeId);

  if (count < 2) {
    return res.status(400).json({ error: "Need at least 2 participants" });
  }

  const { data, error } = await supabase
    .from("challenges")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
      current_day: 0,
    })
    .eq("id", challengeId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

module.exports = router;
