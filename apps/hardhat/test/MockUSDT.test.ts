// Use globalThis.hre for contract:test compatibility (set by hre-mock before Mocha runs)
const hre = (globalThis as any).hre;
const { ethers } = hre;
import { expect } from "chai";

describe("MockUSDT", function () {
  let owner: any;

  before(async () => {
    [owner] = await ethers.getSigners();
  })

  it("Should deploy with correct name and symbol", async function () {
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy(owner.address);
    await mockUSDT.waitForDeployment();

    expect(await mockUSDT.name()).to.equal("Mock USDT");
    expect(await mockUSDT.symbol()).to.equal("MUSDT");
    expect(await mockUSDT.decimals()).to.equal(6);
  });

  it("Should have initial supply of 1M tokens (constructor mints to owner)", async function () {
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy(owner.address);
    await mockUSDT.waitForDeployment();

    const totalSupply = await mockUSDT.totalSupply();
    expect(totalSupply).to.equal(ethers.parseUnits("1000000", 6));
  });

  it("Should allow transfers", async function () {
    const [, recipient] = await ethers.getSigners();
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy(owner.address);
    await mockUSDT.waitForDeployment();

    const transferAmount = ethers.parseUnits("100", 6);
    await mockUSDT.transfer(recipient.address, transferAmount);

    const recipientBalance = await mockUSDT.balanceOf(recipient.address);
    expect(recipientBalance).to.equal(transferAmount);
  });
});
