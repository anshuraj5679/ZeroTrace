require("cofhe-hardhat-plugin");
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, ARBITRUM_SEPOLIA_RPC_URL } = process.env;

module.exports = {
  solidity: {
    version: "0.8.25",
    settings: {
      evmVersion: "cancun"
    }
  },
  cofhe: {
    logMocks: false
  },
  networks: {
    hardhat: {},
    "arb-sepolia": {
      url: ARBITRUM_SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    },
    "eth-sepolia": {
      url: RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || ""
  }
};
