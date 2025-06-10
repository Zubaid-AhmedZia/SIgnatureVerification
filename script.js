#!/usr/bin/env node
// Requires Node.js v18+ for built‑in ESM & fetch

import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const RPC_URL               = "https://base-sepolia.infura.io/v3/08ecc3693e754fafac675c99cc3e2de7";
  const SIGNER_PRIVATE_KEY    = "";   // backend signer key
  const CLAIMANT_PRIVATE_KEY  = ""; // user wallet key
  const CONTRACT_ADDRESS      = "0x8632eB55fe339Dc8a8c73f0aE28Bc5168Df6454d"
//0eb344cada316f13a38e56ee0445c542291803683e5984fcfd022bbd99b4d553 admin pv key
  if (!RPC_URL || !SIGNER_PRIVATE_KEY || !CLAIMANT_PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("Missing env vars: set RPC_URL, SIGNER_PRIVATE_KEY, CLAIMANT_PRIVATE_KEY, CONTRACT_ADDRESS");
    process.exit(1);
  }

  // --- Off‑chain record of user entitlements ---
  // Replace or extend this mapping as needed for your users
  const entitlements = {
    // "0xUserAddress": "<amount in wei>"
    "0x767d781d0932b2091121e59F5361ea917009EBDA": "1000000000000000000"
  };

  // --- Setup provider & wallets ---
  const provider     = new ethers.JsonRpcProvider(RPC_URL);
  const signerWallet = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);   // for EIP‑712 signing
  const claimWallet  = new ethers.Wallet(CLAIMANT_PRIVATE_KEY, provider); // for sending tx

  // --- Contract ABI & instance ---
  const abi = [
    "function claim(uint256 totalAmount, bytes signature) external"
  ];
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, claimWallet);

  // --- Prepare data for this user ---
  const userAddress = await claimWallet.getAddress();
  const totalAmount = entitlements[userAddress];
  if (!totalAmount) {
    console.error(`No entitlement found for ${userAddress}`);
    process.exit(1);
  }

  // --- Sign entitlement using EIP‑712 ---
  const domain = {
    name: "MyGameRewards",
    version: "1",
    chainId: (await provider.getNetwork()).chainId,
    verifyingContract: CONTRACT_ADDRESS
  };
  const types = {
    Claim: [
      { name: "user", type: "address" },
      { name: "totalAmount", type: "uint256" }
    ]
  };
  const signature = await signerWallet.signTypedData(
    domain,
    types,
    { user: userAddress, totalAmount }
  );

  console.log(`Entitlement for ${userAddress}:`, totalAmount);
  console.log(`Signature: ${signature}`);

  // --- Submit claim transaction ---
  const tx = await contract.claim(totalAmount, signature);
  console.log("Submitted tx:", tx.hash);

  const receipt = await tx.wait();
  console.log(`✅ Claimed in block ${receipt.blockNumber}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});