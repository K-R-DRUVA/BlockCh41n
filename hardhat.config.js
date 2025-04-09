require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('dotenv').config();

module.exports = {
  solidity: "0.8.0",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545", // Keep this for Ganache
      accounts: [process.env.METAMASK_ACCOUNT_PRIVATE_KEY]
    },
    hardhat: {
      port: 8546 // Use different port for Hardhat node
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};