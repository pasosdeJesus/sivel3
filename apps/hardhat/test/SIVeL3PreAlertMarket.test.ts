import { expect } from 'chai'
const { ethers } = (globalThis as any).hre

describe('SIVeL3PreAlertMarket', () => {
  let contract: any
  let mockUSDT: any
  let owner: any
  let agent: any
  let citizen: any
  let citizen2: any

  const PRICE = 1_000_000n // 1 USDT

  before(async () => {
    ;[owner, agent, citizen, citizen2] = await ethers.getSigners()

    // Deploy MockUSDT
    const USDTFactory = await ethers.getContractFactory('MockUSDT')
    mockUSDT = await USDTFactory.deploy(owner.address)
    await mockUSDT.waitForDeployment()

    // Deploy PreAlertMarket
    const factory = await ethers.getContractFactory('SIVeL3PreAlertMarket')
    contract = await factory.deploy(
      await mockUSDT.getAddress(),
      agent.address,
    )
    await contract.waitForDeployment()

    // Mint USDT to citizen for purchases
    const mintAmount = ethers.parseUnits('100', 6)
    await mockUSDT.mint(citizen.address, mintAmount)
    await mockUSDT.mint(citizen2.address, mintAmount)

    // citizens approve contract to spend USDT
    await mockUSDT.connect(citizen).approve(await contract.getAddress(), ethers.MaxUint256)
    await mockUSDT.connect(citizen2).approve(await contract.getAddress(), ethers.MaxUint256)
  })

  // ==================== DEPLOYMENT ====================
  describe('Deployment', () => {
    it('sets the USDT token address', async () => {
      expect((await contract.usdtToken()).toLowerCase()).to.equal(
        (await mockUSDT.getAddress()).toLowerCase(),
      )
    })

    it('grants DEFAULT_ADMIN_ROLE to deployer', async () => {
      const adminRole = await contract.DEFAULT_ADMIN_ROLE()
      expect(await contract.hasRole(adminRole, owner.address)).to.be.true
    })

    it('grants AGENT_ROLE to agent wallet', async () => {
      const agentRole = await contract.AGENT_ROLE()
      expect(await contract.hasRole(agentRole, agent.address)).to.be.true
    })

    it('has PRICE_USDT = 1_000_000 (1 USDT)', async () => {
      expect(await contract.PRICE_USDT()).to.equal(PRICE)
    })

    it('starts with preAlertCounter = 0', async () => {
      expect(await contract.preAlertCounter()).to.equal(0n)
    })
  })

  // ==================== PUBLISH PRE‑ALERT ====================
  describe('publishPreAlert', () => {
    const eventHash = ethers.id('unique-event-1')
    const locationHash = ethers.id('location-1')
    const timestamp = Math.floor(Date.now() / 1000) - 60 // 1 minute ago

    it('allows agent to publish', async () => {
      const tx = await contract.connect(agent).publishPreAlert(
        eventHash, locationHash, timestamp,
      )
      const receipt = await tx.wait()
      expect(Number(receipt.status)).to.equal(1)

      expect(await contract.preAlertCounter()).to.equal(1n)

      const preAlert = await contract.preAlerts(1)
      expect(preAlert.eventHash).to.equal(eventHash)
      expect(preAlert.locationHash).to.equal(locationHash)
      expect(preAlert.publisher).to.equal(agent.address)
      expect(preAlert.buyer).to.equal(ethers.ZeroAddress)
      expect(preAlert.converted).to.be.false
      expect(preAlert.active).to.be.true
    })

    it('emits PreAlertPublished event', async () => {
      const h = ethers.id('unique-event-2')
      await expect(
        contract.connect(agent).publishPreAlert(h, locationHash, timestamp),
      )
        .to.emit(contract, 'PreAlertPublished')
        .withArgs(2, h, locationHash, timestamp, agent.address)
    })

    it('rejects empty eventHash', async () => {
      await expect(
        contract.connect(agent).publishPreAlert(
          ethers.ZeroHash, locationHash, timestamp,
        ),
      ).to.be.revertedWith('eventHash required')
    })

    it('rejects future timestamp', async () => {
      await expect(
        contract.connect(agent).publishPreAlert(
          ethers.id('future'), locationHash, Math.floor(Date.now() / 1000) + 3600,
        ),
      ).to.be.revertedWith('timestamp in future')
    })

    it('rejects non‑agent', async () => {
      await expect(
        contract.connect(citizen).publishPreAlert(
          ethers.id('no-auth'), locationHash, timestamp,
        ),
      ).to.be.reverted
    })
  })

  // ==================== BUY PRE‑ALERT ====================
  describe('buyPreAlert', () => {
    before(async () => {
      // Publish an alert that can be bought (ID 1 already published above)
    })

    it('allows citizen to buy a pre‑alert for 1 USDT', async () => {
      const preAlertId = 1n
      const balanceBefore = await mockUSDT.balanceOf(citizen.address)

      const tx = await contract.connect(citizen).buyPreAlert(preAlertId)
      const receipt = await tx.wait()
      expect(Number(receipt.status)).to.equal(1)

      const preAlert = await contract.preAlerts(preAlertId)
      expect(preAlert.buyer).to.equal(citizen.address)

      // Verify USDT transferred to contract
      const balanceAfter = await mockUSDT.balanceOf(citizen.address)
      expect(balanceBefore - balanceAfter).to.equal(PRICE)
      expect(await mockUSDT.balanceOf(await contract.getAddress())).to.equal(PRICE)
    })

    it('emits PreAlertBought event', async () => {
      // Publish new pre-alert
      const h = ethers.id('buy-event-test')
      await contract.connect(agent).publishPreAlert(
        h, ethers.id('loc'), Math.floor(Date.now() / 1000) - 60,
      )
      const newId = await contract.preAlertCounter()

      await expect(contract.connect(citizen2).buyPreAlert(newId))
        .to.emit(contract, 'PreAlertBought')
        .withArgs(newId, citizen2.address, PRICE)
    })

    it('rejects invalid ID (0)', async () => {
      await expect(
        contract.connect(citizen).buyPreAlert(0n),
      ).to.be.revertedWith('Invalid ID')
    })

    it('rejects ID beyond counter', async () => {
      const beyond = (await contract.preAlertCounter()) + 1n
      await expect(
        contract.connect(citizen).buyPreAlert(beyond),
      ).to.be.revertedWith('Invalid ID')
    })

    it('rejects already bought pre‑alert', async () => {
      // ID 1 already bought by citizen
      await expect(
        contract.connect(citizen2).buyPreAlert(1n),
      ).to.be.revertedWith('Already bought')
    })
  })

  // ==================== CONVERT TO ALERT ====================
  describe('convertToAlert', () => {
    let convertableId: bigint

    before(async () => {
      // Publish and buy a new pre-alert for conversion tests
      const h = ethers.id('convertible')
      await contract.connect(agent).publishPreAlert(
        h, ethers.id('loc'), Math.floor(Date.now() / 1000) - 60,
      )
      convertableId = await contract.preAlertCounter()
      await contract.connect(citizen).buyPreAlert(convertableId)
    })

    it('allows buyer to convert to alert', async () => {
      const tx = await contract.connect(citizen).convertToAlert(convertableId)
      const receipt = await tx.wait()
      expect(Number(receipt.status)).to.equal(1)

      const preAlert = await contract.preAlerts(convertableId)
      expect(preAlert.converted).to.be.true
      expect(preAlert.active).to.be.false
    })

    it('emits AlertConverted event', async () => {
      // Publish + buy a new one
      const h = ethers.id('convert-event-test')
      await contract.connect(agent).publishPreAlert(
        h, ethers.id('loc2'), Math.floor(Date.now() / 1000) - 60,
      )
      const newId = await contract.preAlertCounter()
      await contract.connect(citizen).buyPreAlert(newId)

      await expect(contract.connect(citizen).convertToAlert(newId))
        .to.emit(contract, 'AlertConverted')
        .withArgs(newId, citizen.address)
    })

    it('rejects non‑buyer', async () => {
      // Publish + buy by citizen
      const h = ethers.id('non-buyer-test')
      await contract.connect(agent).publishPreAlert(
        h, ethers.id('loc'), Math.floor(Date.now() / 1000) - 60,
      )
      const newId = await contract.preAlertCounter()
      await contract.connect(citizen).buyPreAlert(newId)

      await expect(
        contract.connect(citizen2).convertToAlert(newId),
      ).to.be.revertedWith('Not buyer')
    })

    it('rejects already converted', async () => {
      // convertableId was already converted
      await expect(
        contract.connect(citizen).convertToAlert(convertableId),
      ).to.be.revertedWith('Already converted')
    })

    it('rejects inactive pre‑alert', async () => {
      // convertableId is now inactive (converted)
      await expect(
        contract.connect(citizen).convertToAlert(convertableId),
      ).to.be.revertedWith('Not active')
    })
  })

  // ==================== ADMIN FUNCTIONS ====================
  describe('Admin functions', () => {
    it('allows admin to withdraw USDT', async () => {
      // The contract should have some USDT from previous buys
      const contractBalance = await mockUSDT.balanceOf(await contract.getAddress())
      expect(contractBalance > 0n).to.be.true

      const balanceBefore = await mockUSDT.balanceOf(owner.address)
      await contract.connect(owner).withdrawUSDT(contractBalance)
      const balanceAfter = await mockUSDT.balanceOf(owner.address)
      expect(balanceAfter - balanceBefore).to.equal(contractBalance)
    })

    it('rejects zero withdrawal', async () => {
      await expect(
        contract.connect(owner).withdrawUSDT(0n),
      ).to.be.revertedWith('Amount must be > 0')
    })

    it('rejects non‑admin withdrawal', async () => {
      await expect(
        contract.connect(citizen).withdrawUSDT(1n),
      ).to.be.reverted
    })

    it('allows admin to pause and unpause', async () => {
      await contract.connect(owner).pause()

      // Publishing should be rejected while paused
      await expect(
        contract.connect(agent).publishPreAlert(
          ethers.id('paused'), ethers.id('loc'), Math.floor(Date.now() / 1000) - 60,
        ),
      ).to.be.reverted

      await contract.connect(owner).unpause()

      // Now publishing works again
      const h = ethers.id('after-unpause')
      await contract.connect(agent).publishPreAlert(
        h, ethers.id('loc'), Math.floor(Date.now() / 1000) - 60,
      )
      const id = await contract.preAlertCounter()
      const pa = await contract.preAlerts(id)
      expect(pa.eventHash).to.equal(h)
    })

    it('allows admin to set agent wallet', async () => {
      await contract.connect(owner).setAgentWallet(citizen2.address)

      const agentRole = await contract.AGENT_ROLE()
      expect(await contract.hasRole(agentRole, citizen2.address)).to.be.true
      expect(await contract.hasRole(agentRole, agent.address)).to.be.false
    })

    it('rejects non‑admin set agent', async () => {
      await expect(
        contract.connect(citizen).setAgentWallet(citizen.address),
      ).to.be.reverted
    })

    it('rejects zero address agent', async () => {
      await expect(
        contract.connect(owner).setAgentWallet(ethers.ZeroAddress),
      ).to.be.revertedWith('Invalid address')
    })
  })
})
