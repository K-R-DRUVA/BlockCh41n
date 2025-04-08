const VotingContract = artifacts.require("Voting");

module.exports = async function(deployer) {
  await deployer.deploy(VotingContract);
  
  // Update .env file with new contract address
  const fs = require('fs');
  const contract = await VotingContract.deployed();
  const envContent = fs.readFileSync('.env', 'utf8');
  const updatedEnv = envContent.replace(
    /CONTRACT_ADDRESS=.*/,
    `CONTRACT_ADDRESS=${contract.address}`
  );
  fs.writeFileSync('.env', updatedEnv);
};