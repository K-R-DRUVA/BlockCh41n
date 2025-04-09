import { ethers } from "ethers";

async function getSignature(constituency) {
  // Connect to MetaMask
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  // Create the same hash used in the smart contract
  const messageHash = ethers.utils.solidityKeccak256(
    ["address", "string"],
    [address, constituency]
  );

  // Sign the message hash (as bytes)
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

  return {
    address,
    signature,
  };
}
