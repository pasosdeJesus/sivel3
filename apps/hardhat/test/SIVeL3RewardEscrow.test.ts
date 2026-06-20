import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('SIVeL3RewardEscrow', () => {
  let contract: any
  let mockUSDT: any
  let owner: any
  let backend: any
  let citizen: any

  before(async () => {
    ;[owner, backend, citizen] = await ethers.getSigners()

    // Deploy MockUSDT
    const USDTFactory = await ethers.getContractFactory('MockUSDT')
    mockUSDT = await USDTFactory.deploy(owner.address)
    await mockUSDT.waitForDeployment()

    // Deploy RewardEscrow
    const factory = await ethers.getContractFactory('SIVeL3RewardEscrow')
    contract = await factory.deploy(
      await mockUSDT.getAddress(),
      backend.address,
    )
    await contract.waitForDeployment()

    // Fund owner with extra USDT and approve for deposits
    const depositAmount = ethers.parseUnits('1000', 6)
    await mockUSDT.mint(owner.address, depositAmount)
    await mockUSDT.approve(await contract.getAddress(), ethers.MaxUint256)
  })

  // ==================== DEPLOYMENT ====================
  describe('Deployment', () => {
    it('sets the USDT token address', async () => {
      expect(await contract.usdtToken()).to.equal(await mockUSDT.getAddress())
    })

    it('grants DEFAULT_ADMIN_ROLE to deployer', async () => {
      const adminRole = await contract.DEFAULT_ADMIN_ROLE()
      expect(await contract.hasRole(adminRole, owner.address)).to.be.true
    })

    it('grants BACKEND_ROLE to backend wallet', async () => {
      const backendRole = await contract.BACKEND_ROLE()
      expect(await contract.hasRole(backendRole, backend.address)).to.be.true
    })

    it('starts with balance 0', async () => {
      expect(await contract.balance()).to.equal(0n)
    })
  })

  // ==================== DEPOSIT ====================
  describe('deposit', () => {
    it('allows admin to deposit USDT', async () => {
      const amount = ethers.parseUnits('100', 6)
      const balanceBefore = await mockUSDT.balanceOf(await contract.getAddress())

      const tx = await contract.connect(owner).deposit(amount)
      const receipt = await tx.wait()
      expect(receipt.status).to.equal(1)

      const balanceAfter = await mockUSDT.balanceOf(await contract.getAddress())
      expect(balanceAfter - balanceBefore).to.equal(amount)
      expect(await contract.balance()).to.equal(amount)
    })

    it('emits FundsDeposited event', async () => {
      const amount = ethers.parseUnits('50', 6)
      await expect(contract.connect(owner).deposit(amount))
        .to.emit(contract, 'FundsDeposited')
        .withArgs(owner.address, amount)
    })

    it('rejects zero deposit', async () => {
      await expect(
        contract.connect(owner).deposit(0n),
      ).to.be.revertedWith('Amount must be > 0')
    })

    it('rejects non‑admin deposit', async () => {
      await expect(
        contract.connect(citizen).deposit(100n),
      ).to.be.reverted
    })
  })

  // ==================== RELEASE PAYMENT ====================
  describe('releasePayment', () => {
    const reward = ethers.parseUnits('5', 6) // 5 USDT

    it('allows backend to release payment to citizen', async () => {
      const balanceBefore = await mockUSDT.balanceOf(citizen.address)

      const tx = await contract.connect(backend).releasePayment(citizen.address, reward)
      const receipt = await tx.wait()
      expect(receipt.status).to.equal(1)

      const balanceAfter = await mockUSDT.balanceOf(citizen.address)
      expect(balanceAfter - balanceBefore).to.equal(reward)
    })

    it('emits PaymentReleased event', async () => {
      const amount = ethers.parseUnits('3', 6)
      await expect(contract.connect(backend).releasePayment(citizen.address, amount))
        .to.emit(contract, 'PaymentReleased')
        .withArgs(citizen.address, amount)
    })

    it('rejects non‑backend release', async () => {
      await expect(
        contract.connect(citizen).releasePayment(citizen.address, 100n),
      ).to.be.reverted
    })

    it('rejects zero address recipient', async () => {
      await expect(
        contract.connect(backend).releasePayment(ethers.ZeroAddress, reward),
      ).to.be.revertedWith('Invalid recipient')
    })

    it('rejects zero amount', async () => {
      await expect(
        contract.connect(backend).releasePayment(citizen.address, 0n),
      ).to.be.revertedWith('Amount must be > 0')
    })

    it('reverts if insufficient balance', async () => {
      // Try to release more than what's left
      const hugeAmount = ethers.parseUnits('10000', 6)
      await expect(
        contract.connect(backend).releasePayment(citizen.address, hugeAmount),
      ).to.be.revertedWith('Insufficient balance')
    })
  })

  // ==================== EMERGENCY WITHDRAW ====================
  describe('emergencyWithdraw', () => {
    it('allows admin to emergency withdraw', async () => {
      const contractBalance = await contract.balance()
      expect(contractBalance).to.be.gt(0n)

      const balanceBefore = await mockUSDT.balanceOf(owner.address)
      await contract.connect(owner).emergencyWithdraw(contractBalance)
      const balanceAfter = await mockUSDT.balanceOf(owner.address)
      expect(balanceAfter - balanceBefore).to.equal(contractBalance)
      expect(await contract.balance()).to.equal(0n)
    })

    it('emits EmergencyWithdrawn event', async () => {
      // Deposit first so there are funds
      await contract.connect(owner).deposit(ethers.parseUnits('10', 6))
      const amount = ethers.parseUnits('10', 6)
      await expect(contract.connect(owner).emergencyWithdraw(amount))
        .to.emit(contract, 'EmergencyWithdrawn')
        .withArgs(owner.address, amount)
    })

    it('rejects non‑admin emergency withdraw', async () => {
      await expect(
        contract.connect(citizen).emergencyWithdraw(100n),
      ).to.be.reverted
    })
  })
})
