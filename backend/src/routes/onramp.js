const crypto = require("crypto");
const { Router } = require("express");
const config = require("../config");

const router = Router();

const COINBASE_API_HOST = "api.developer.coinbase.com";
const SESSION_TOKEN_PATH = "/onramp/v1/token";
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function base64UrlEncode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getCoinbaseApiKeySecret() {
  if (!config.coinbase.cdpApiKeySecret) {
    throw new Error("CDP_API_KEY_SECRET not set");
  }

  return config.coinbase.cdpApiKeySecret.replace(/\\n/g, "\n");
}

function buildJwtPayload(basePayload, algorithm) {
  if (algorithm === "EdDSA") {
    return {
      ...basePayload,
      aud: ["cdp_service"],
    };
  }

  return basePayload;
}

function createEd25519KeyObject(secret) {
  const decoded = Buffer.from(secret, "base64");

  if (decoded.length !== 64) {
    throw new Error("Invalid Ed25519 key length");
  }

  // Coinbase's Ed25519 secret is 64 bytes: 32-byte seed + 32-byte public key.
  // Node expects a PKCS#8 private key, so we wrap the seed in a minimal DER envelope.
  const seed = decoded.subarray(0, 32);
  const pkcs8Key = Buffer.concat([ED25519_PKCS8_PREFIX, seed]);

  return crypto.createPrivateKey({
    key: pkcs8Key,
    format: "der",
    type: "pkcs8",
  });
}

function getSigningConfig() {
  const secret = getCoinbaseApiKeySecret();

  if (secret.includes("BEGIN")) {
    return {
      algorithm: "ES256",
      sign: (message) =>
        crypto.sign("sha256", Buffer.from(message), {
          key: secret,
          dsaEncoding: "ieee-p1363",
        }),
    };
  }

  const ed25519Key = createEd25519KeyObject(secret);

  return {
    algorithm: "EdDSA",
    sign: (message) => crypto.sign(null, Buffer.from(message), ed25519Key),
  };
}

function generateBearerToken() {
  if (!config.coinbase.cdpApiKeyName) {
    throw new Error("CDP_API_KEY_NAME not set");
  }

  const now = Math.floor(Date.now() / 1000);
  const signingConfig = getSigningConfig();
  const header = {
    alg: signingConfig.algorithm,
    typ: "JWT",
    kid: config.coinbase.cdpApiKeyName,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const payload = buildJwtPayload(
    {
      iss: "cdp",
      nbf: now,
      exp: now + 120,
      sub: config.coinbase.cdpApiKeyName,
      uri: `POST ${COINBASE_API_HOST}${SESSION_TOKEN_PATH}`,
    },
    signingConfig.algorithm
  );

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signingConfig.sign(signingInput);

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function createSessionToken({ address, asset, network }) {
  const response = await fetch(`https://${COINBASE_API_HOST}${SESSION_TOKEN_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${generateBearerToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      addresses: [
        {
          address,
          blockchains: [network],
        },
      ],
      assets: [asset],
    }),
  });

  const responseText = await response.text();
  let responseData = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      responseData = { raw: responseText };
    }
  }

  if (!response.ok) {
    const message =
      responseData?.error ||
      responseData?.message ||
      responseData?.raw ||
      "Coinbase session token request failed";
    const err = new Error(message);
    err.statusCode = response.status;
    err.details = responseData;
    throw err;
  }

  if (!responseData?.token) {
    throw new Error("Coinbase did not return a session token");
  }

  return responseData.token;
}

router.post("/session-token", async (req, res) => {
  const { address, asset = "USDC", network = "base" } = req.body || {};

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "address is required" });
  }

  if (!asset || typeof asset !== "string") {
    return res.status(400).json({ error: "asset must be a string" });
  }

  if (!network || typeof network !== "string") {
    return res.status(400).json({ error: "network must be a string" });
  }

  try {
    const sessionToken = await createSessionToken({ address, asset, network });
    res.json({ sessionToken });
  } catch (error) {
    console.error("Failed to create Coinbase session token:", error);
    res.status(error.statusCode || 500).json({
      error: error.message || "Failed to create Coinbase session token",
      details: error.details || null,
    });
  }
});

module.exports = router;
