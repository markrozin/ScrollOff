require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
  },
  coinbase: {
    cdpApiKeyName: process.env.CDP_API_KEY_NAME,
    cdpApiKeySecret: process.env.CDP_API_KEY_SECRET,
  },
  chain: {
    rpcUrl: process.env.RPC_URL,
    chainId: parseInt(process.env.CHAIN_ID || "8453"),
  },
  contracts: {
    challenge: process.env.CHALLENGE_CONTRACT_ADDRESS,
    usdc: process.env.USDC_ADDRESS,
  },
  reporterPrivateKey: process.env.REPORTER_PRIVATE_KEY,
};
