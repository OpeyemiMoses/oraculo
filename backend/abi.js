export const ORACULO_ABI = [
  "function createMarket(string calldata question, uint8 confidencePct, uint256 resolveBy) external returns (uint256)",
  "function resolveMarket(uint256 marketId, bool agentCorrect) external",
  "function cancelMarket(uint256 marketId) external",
  "function getMarket(uint256 marketId) external view returns (tuple(uint256 id, string question, uint8 confidencePct, uint8 status, bool agentCorrect, uint256 createdAt, uint256 resolveBy, uint256 poolWith, uint256 poolAgainst))",
  "function getAllMarkets() external view returns (tuple(uint256 id, string question, uint8 confidencePct, uint8 status, bool agentCorrect, uint256 createdAt, uint256 resolveBy, uint256 poolWith, uint256 poolAgainst)[])",
  "function getUserBets(address user) external view returns (tuple(uint256 marketId, uint8 side, uint256 amount, bool claimed)[])",
  "function getUserBalance(address user) external view returns (uint256)",
  "function getOdds(uint256 marketId) external view returns (uint256 withOdds, uint256 againstOdds)",
  "function withdrawFees() external",
  "function accruedFees() external view returns (uint256)",
  "function FEE_BPS() external view returns (uint256)",
  "function marketCount() external view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, string question, uint8 confidencePct, uint256 resolveBy)",
  "event MarketResolved(uint256 indexed marketId, bool agentCorrect)"
];