const hre = require("hardhat");

async function main() {
  const VotingSystem = await hre.ethers.getContractFactory("Voting");
  const votingSystem = await VotingSystem.deploy();
  await votingSystem.deployed(); // We need await here because deployed() returns a Promise
  
  const votingAddress = votingSystem.address; // This doesn't need await as it's a property, not a method
  console.log("VotingSystem deployed to:", votingAddress);
  
  // Store the contract address in .env
  const fs = require('fs');
  const envFile = './.env';
  const envContent = fs.readFileSync(envFile, 'utf-8');
  const updatedEnv = envContent.replace(
    /CONTRACT_ADDRESS=.*/,
    `CONTRACT_ADDRESS=${votingAddress}`
  );
  fs.writeFileSync(envFile, updatedEnv);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });