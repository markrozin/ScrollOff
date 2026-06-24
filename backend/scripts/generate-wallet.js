const { ethers } = require("ethers");

const wallet = ethers.Wallet.createRandom();

console.log("=== Reporter Wallet Generated ===");
console.log("Address:     ", wallet.address);
console.log("Private Key: ", wallet.privateKey);
console.log("");
console.log("Add to your .env file:");
console.log(`REPORTER_PRIVATE_KEY=${wallet.privateKey}`);
console.log("");
console.log("IMPORTANT: Fund this address with ETH on Base for gas.");
