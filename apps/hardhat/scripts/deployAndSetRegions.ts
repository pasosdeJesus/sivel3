
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(
    `Deploying and setting up contracts with the account: ${deployer.address}`
  );

  // Deploy MockUSDT contract
  const mockUSDTFactory = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = await mockUSDTFactory.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  console.log(`MockUSDT contract deployed to: ${mockUSDTAddress}`);

  // Deploy RegionalDonation contract
  const regionalDonationFactory = await ethers.getContractFactory(
    "RegionalDonation"
  );
  const regionalDonation = await regionalDonationFactory.deploy(
    mockUSDTAddress,
    deployer.address
  );
  await regionalDonation.waitForDeployment();
  const regionalDonationAddress = await regionalDonation.getAddress();
  console.log(
    `RegionalDonation contract deployed to: ${regionalDonationAddress}`
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
