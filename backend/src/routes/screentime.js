const { Router } = require("express");
const supabase = require("../supabase");
const requireAuth = require("../middleware/auth");

const router = Router();

// POST /screentime — submit daily screen time for a challenge
router.post("/", requireAuth, async (req, res) => {
  const { challenge_id, minutes } = req.body;

  if (challenge_id === undefined || minutes === undefined) {
    return res.status(400).json({ error: "challenge_id and minutes required" });
  }

  if (typeof minutes !== "number" || minutes < 0) {
    return res.status(400).json({ error: "minutes must be a non-negative number" });
  }

  // Verify user is a participant
  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("*")
    .eq("challenge_id", challenge_id)
    .eq("user_id", req.user.id)
    .single();

  if (!participant) {
    return res.status(403).json({ error: "Not a participant in this challenge" });
  }

  // Verify challenge is active
  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challenge_id)
    .single();

  if (!challenge || challenge.status !== "active") {
    return res.status(400).json({ error: "Challenge is not active" });
  }

  const today = new Date().toISOString().split("T")[0];

  // Upsert screen time for today (latest report wins)
  const { data, error } = await supabase
    .from("screen_time_reports")
    .upsert(
      {
        challenge_id,
        user_id: req.user.id,
        date: today,
        minutes,
      },
      { onConflict: "challenge_id,user_id,date" }
    )
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// GET /screentime/:challengeId — get all screen time reports for a challenge
router.get("/:challengeId", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("screen_time_reports")
    .select("*")
    .eq("challenge_id", req.params.challengeId)
    .order("date", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

module.exports = router;
