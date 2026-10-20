
import { ethers } from "hardhat";
import dotenv from "dotenv"
import fs from "fs";
import path from "path";
dotenv.config({ path: '../.env' })

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(
    `Deploying and setting up contracts with the account: ${deployer.address}`
  );

  // Deploy RegionalDonation contract
  const regionalDonationFactory = await ethers.getContractFactory(
    "SIVeL3RegionalDonationV2"
  );
  console.log("usdt_address=", process.env.NEXT_PUBLIC_USDT_TESTNET)
  const regionalDonation = await regionalDonationFactory.deploy(
    process.env.NEXT_PUBLIC_USDT_TESTNET,
    deployer.address
  );
  await regionalDonation.waitForDeployment();
  const regionalDonationAddress = await regionalDonation.getAddress();
  console.log(
    `SIVeL3RegionalDonationV2 contract deployed to: ${regionalDonationAddress}`
  );

  // Save deployment address (hierarchical V1); Next.js reads it at build time.
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const networkName =
    chainId === 42220
      ? "celo"
      : chainId === 11142220
        ? "celoSepolia"
        : `chain-${chainId}`;
  const deploymentsDir = path.join(
    __dirname,
    "../deployments/SIVeL3RegionalDonationV2/V1",
  );
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(
      {
        contract: "SIVeL3RegionalDonationV2",
        address: regionalDonationAddress,
        chainId,
        network: networkName,
        transactionHash: regionalDonation.deploymentTransaction()?.hash,
        deployedAt: new Date().toISOString(),
        usdtAddress: process.env.NEXT_PUBLIC_USDT_TESTNET,
      },
      null,
      2,
    ),
  );
  console.log(`   Deployment saved to ${deploymentFile}`);

  // Set the regions
  console.log("Setting region 1: Colombia...");
  const tx1 = await regionalDonation.setRegion(1, "Colombia");
  await tx1.wait(); // Wait for the transaction to be mined
  console.log("Transaction successful. Hash:", tx1.hash);

  console.log("Setting region 2: Israel/Palestina...");
  const tx2 = await regionalDonation.setRegion(2, "Israel/Palestina");
  await tx2.wait(); // Wait for the transaction to be mined
  console.log("Transaction successful. Hash:", tx2.hash);

  console.log("✅ Successfully deployed contracts and set regions.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
