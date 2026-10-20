import { expect } from 'chai'
const { ethers } = (globalThis as any).hre

describe('SIVeL3RegionalDonationV2', () => {
  let contract: any
  let mockUSDT: any
  let owner: any
  let backend: any
  let donor: any

  before(async () => {
    const signers = await ethers.getSigners()
    owner = signers[0]
    backend = signers[8]
    donor = signers[9]

    const USDTFactory = await ethers.getContractFactory('MockUSDT')
    mockUSDT = await USDTFactory.deploy(owner.address)
    await mockUSDT.waitForDeployment()

    const factory = await ethers.getContractFactory('SIVeL3RegionalDonationV2')
    contract = await factory.deploy(
      await mockUSDT.getAddress(),
      owner.address,
    )
    await contract.waitForDeployment()

    await mockUSDT.mint(donor.address, ethers.parseUnits('10000', 6))
    await mockUSDT.connect(donor).approve(
      await contract.getAddress(),
      ethers.MaxUint256,
    )
    await mockUSDT.transfer(
      await contract.getAddress(),
      ethers.parseUnits('300', 6),
    )
  })

  it('deployment sets token, owner, backend', async () => {
    expect((await contract.donationToken()).toLowerCase()).to.equal(
      (await mockUSDT.getAddress()).toLowerCase(),
    )
    expect(await contract.owner()).to.equal(owner.address)
    expect(await contract.backendAddress()).to.equal(owner.address)
  })

  it('setBackendAddress and setRegion', async () => {
    await contract.setBackendAddress(backend.address)
    expect(await contract.backendAddress()).to.equal(backend.address)

    await contract.setRegion(1, 'Colombia')
    expect(await contract.regionNames(1)).to.equal('Colombia')

    await expect(contract.setRegion(0, 'Bad'))
      .to.be.revertedWith('Region ID must be greater than 0')
    await expect(contract.setRegion(5, ''))
      .to.be.revertedWith('Region name cannot be empty')
  })

  it('donate (legacy approve+donate)', async () => {
    const amount = ethers.parseUnits('100', 6)
    await contract.connect(donor).donate(1, amount)
    expect(await contract.regionalBalances(1)).to.equal(amount)

    await expect(contract.connect(donor).donate(99, 1n))
      .to.be.revertedWith('Region does not exist')
    await expect(contract.connect(donor).donate(1, 0n))
      .to.be.revertedWith('Donation must be greater than 0')
  })

  it('assignDonation (MiniPay)', async () => {
    const amount = ethers.parseUnits('50', 6)
    const txHash = ethers.id('mp-1')

    await contract.connect(backend).assignDonation(1, donor.address, amount, txHash)
    expect(await contract.regionalBalances(1) > amount).to.be.true
    expect(await contract.processedTransactions(txHash)).to.be.true

    await expect(
      contract.connect(backend).assignDonation(1, donor.address, 1n, txHash),
    ).to.be.revertedWith('Transaction already processed')
    await expect(
      contract.connect(donor).assignDonation(1, donor.address, 1n, ethers.id('bad')),
    ).to.be.revertedWith('Only backend')
  })

  it('setRegionalBalance, withdraw, emergencyWithdraw', async () => {
    await contract.setRegionalBalance(1, ethers.parseUnits('200', 6))

    const amount = ethers.parseUnits('50', 6)
    await contract.withdraw(1, amount, donor.address)
    expect(await contract.regionalBalances(1)).to.equal(ethers.parseUnits('150', 6))

    await expect(
      contract.withdraw(1, ethers.MaxUint256, donor.address),
    ).to.be.revertedWith('Insufficient balance')
    await expect(
      contract.withdraw(1, 1n, ethers.ZeroAddress),
    ).to.be.revertedWith('Invalid recipient address')

    const bal = await mockUSDT.balanceOf(await contract.getAddress())
    expect(bal > 0n).to.be.true
    await contract.emergencyWithdraw()
    expect(await mockUSDT.balanceOf(await contract.getAddress())).to.equal(0n)
  })

  it('isolated balances per region', async () => {
    await contract.setRegion(10, 'A')
    await contract.setRegion(11, 'B')
    const a1 = ethers.parseUnits('5', 6)
    const a2 = ethers.parseUnits('15', 6)
    await contract.connect(donor).donate(10, a1)
    await contract.connect(backend).assignDonation(11, donor.address, a2, ethers.id('iso'))
    expect(await contract.regionalBalances(10)).to.equal(a1)
    expect(await contract.regionalBalances(11)).to.equal(a2)
  })
})
