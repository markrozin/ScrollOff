const { ethers } = require("ethers");
const config = require("./config");

const CHALLENGE_ABI = [
  "function createChallenge(uint256 _entryFee, uint256 _dailyPenalty, uint256 _durationDays, uint256 _maxParticipants) external returns (uint256)",
  "function reportOverages(uint256 challengeId, address[] calldata overUsers) external",
  "function settleChallenge(uint256 challengeId, address _winner) external",
  "function challenges(uint256) external view returns (address creator, uint256 entryFee, uint256 dailyPenalty, uint256 maxParticipants, uint256 durationDays, uint256 startTimestamp, bool started, bool settled, address winner, uint256 currentDay)",
  "function getParticipants(uint256 challengeId) external view returns (address[])",
  "function getPlayerStatus(uint256 challengeId, address user) external view returns (uint256 remaining, uint256 penalized, bool refunded)",
  "function prizePot(uint256 challengeId) external view returns (uint256)",
];

const provider = new ethers.JsonRpcProvider(config.chain.rpcUrl);

let reporterWallet = null;
let challengeContract = null;

function getReporterWallet() {
  if (!reporterWallet) {
    if (!config.reporterPrivateKey) {
      throw new Error("REPORTER_PRIVATE_KEY not set");
    }
    reporterWallet = new ethers.Wallet(config.reporterPrivateKey, provider);
  }
  return reporterWallet;
}

function getChallengeContract() {
  if (!challengeContract) {
    if (!config.contracts.challenge) {
      throw new Error("CHALLENGE_CONTRACT_ADDRESS not set");
    }
    const wallet = getReporterWallet();
    challengeContract = new ethers.Contract(
      config.contracts.challenge,
      CHALLENGE_ABI,
      wallet
    );
  }
  return challengeContract;
}

module.exports = { provider, getReporterWallet, getChallengeContract };
