const { Router } = require("express");
const supabase = require("../supabase");
const requireAuth = require("../middleware/auth");

const router = Router();

// POST /users/register — link a wallet address to the authenticated user
router.post("/register", requireAuth, async (req, res) => {
  const { wallet_address } = req.body;

  if (!wallet_address) {
    return res.status(400).json({ error: "wallet_address required" });
  }

  // Upsert: create or update the user's wallet mapping
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: req.user.id,
        wallet_address: wallet_address.toLowerCase(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// GET /users/me — get current user profile
router.get("/me", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", req.user.id)
    .single();

  if (error) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(data);
});

module.exports = router;
