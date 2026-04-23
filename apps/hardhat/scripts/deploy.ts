
import { ethers } from "hardhat";
import dotenv from "dotenv"
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
  console.log("usdt_address=", process.env.NEXT_PUBLIC_USDT_ADDRESS)
  const regionalDonation = await regionalDonationFactory.deploy(
    process.env.NEXT_PUBLIC_USDT_ADDRESS,
    deployer.address
  );
  await regionalDonation.waitForDeployment();
  const regionalDonationAddress = await regionalDonation.getAddress();
  console.log(
    `SIVeL3RegionalDonationV2 contract deployed to: ${regionalDonationAddress}`
  );

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
