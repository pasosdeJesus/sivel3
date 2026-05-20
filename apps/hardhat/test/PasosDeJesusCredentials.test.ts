import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('PasosDeJesusCredentials', () => {
  let contract: any
  let owner: any
  let minter: any
  let user: any

  const LEARN_TG = 'learn.tg'
  const SIVEL_XYZ = 'sivel.xyz'

  const COURSE_COMPLETION = 'course_completion'
  const ROLE = 'role'
  const NFT = 'nft'
  const ACHIEVEMENT = 'achievement'

  before(async () => {
    ;[owner, minter, user] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('PasosDeJesusCredentials')
    contract = await factory.deploy('https://sivel.xyz/api/credential/')
    await contract.waitForDeployment()

    // Grant MINTER_ROLE
    const MINTER_ROLE = await contract.MINTER_ROLE()
    await contract.grantRole(MINTER_ROLE, minter.address)
  })

  // ==================== REGISTRATION ====================
  describe('registerCredentialType', () => {
    it('registers a course completion type', async () => {
      const tx = await contract.registerCredentialType(
        LEARN_TG, COURSE_COMPLETION, 'Basic Course', true, 1, false
      )
      const receipt = await tx.wait()
      expect(receipt.status).to.equal(1)

      const tokenId = await contract.nextTokenId()
      expect(tokenId).to.equal(2n)

      const name = await contract.tokenNames(1)
      expect(name).to.equal('Basic Course')

      const soulbound = await contract.isSoulbound(1)
      expect(soulbound).to.equal(true)

      const courseTokenId = await contract.courseIdToTokenId(1)
      expect(courseTokenId).to.equal(1n)

      const premium = await contract.isPremiumCourse(1)
      expect(premium).to.equal(false)
    })

    it('registers a premium course', async () => {
      await contract.registerCredentialType(
        LEARN_TG, COURSE_COMPLETION, 'Premium Course', true, 2, true
      )
      const premium = await contract.isPremiumCourse(2)
      expect(premium).to.equal(true)
    })

    it('registers a role type (soulbound)', async () => {
      await contract.registerCredentialType(
        SIVEL_XYZ, ROLE, 'Founder User', true, 0, false
      )
      const soulbound = await contract.isSoulbound(3)
      expect(soulbound).to.equal(true)
    })

    it('registers an NFT type (transferable)', async () => {
      await contract.registerCredentialType(
        SIVEL_XYZ, NFT, 'Bible Verse', false, 0, false
      )
      const soulbound = await contract.isSoulbound(4)
      expect(soulbound).to.equal(false)
    })

    it('reverts registering an achievement as transferable', async () => {
      await expect(
        contract.registerCredentialType(SIVEL_XYZ, ACHIEVEMENT, 'Badge', false, 0, false)
      ).to.be.revertedWith('Roles and achievements must be soulbound')
    })

    it('reverts registering an NFT as soulbound', async () => {
      await expect(
        contract.registerCredentialType(SIVEL_XYZ, NFT, 'Locked', true, 0, false)
      ).to.be.revertedWith('NFTs must be transferable')
    })

    it('reverts non-admin registering a type', async () => {
      await expect(
        contract.connect(user).registerCredentialType(
          LEARN_TG, COURSE_COMPLETION, 'Unauthorized', true, 99, false
        )
      ).to.be.reverted
    })
  })

  // ==================== MINTING ====================
  describe('minting', () => {
    it('mints a course completion SBT', async () => {
      const tx = await contract.connect(minter).mintCourseCompletion(
        user.address, 1, 'Basic Course', false
      )
      const receipt = await tx.wait()
      expect(receipt.status).to.equal(1)

      const balance = await contract.balanceOf(user.address, 1)
      expect(balance).to.equal(1n)

      const has = await contract.hasCredential(user.address, 1)
      expect(has).to.equal(true)

      const totalSupply = await contract.totalSupply(1)
      expect(totalSupply).to.equal(1n)
    })

    it('mints a role SBT', async () => {
      await contract.connect(minter).mintCredential(
        user.address, 3, 1
      )
      const balance = await contract.balanceOf(user.address, 3)
      expect(balance).to.equal(1n)
    })

    it('mints an NFT', async () => {
      await contract.connect(minter).mintCredential(
        user.address, 4, 1
      )
      const balance = await contract.balanceOf(user.address, 4)
      expect(balance).to.equal(1n)
    })

    it('reverts mintCourseCompletion with wrong course name', async () => {
      await expect(
        contract.connect(minter).mintCourseCompletion(
          user.address, 1, 'Wrong Name', false
        )
      ).to.be.revertedWith('Course name mismatch')
    })

    it('reverts mintCourseCompletion with wrong premium flag', async () => {
      await expect(
        contract.connect(minter).mintCourseCompletion(
          user.address, 2, 'Premium Course', false
        )
      ).to.be.revertedWith('Premium status mismatch')
    })

    it('reverts mintCourseCompletion on non-soulbound token', async () => {
      await expect(
        contract.connect(minter).mintCourseCompletion(
          user.address, 4, 'Bible Verse', false
        )
      ).to.be.revertedWith('Course credential must be soulbound')
    })

    it('reverts non-minter minting', async () => {
      await expect(
        contract.connect(user).mintCredential(user.address, 3, 1)
      ).to.be.reverted
    })
  })

  // ==================== DUPLICATE PREVENTION ====================
  describe('duplicate prevention', () => {
    it('reverts minting same credential twice for same user', async () => {
      await expect(
        contract.connect(minter).mintCourseCompletion(
          user.address, 1, 'Basic Course', false
        )
      ).to.be.revertedWith('Account already has this credential')
    })

    it('reverts minting same role twice for same user', async () => {
      await expect(
        contract.connect(minter).mintCredential(user.address, 3, 1)
      ).to.be.revertedWith('Account already has this credential')
    })
  })

  // ==================== MAX SUPPLY ====================
  describe('maxSupply', () => {
    it('sets maxSupply and enforces it', async () => {
      await contract.setMaxSupply(4, 2)
      const max = await contract.maxSupply(4)
      expect(max).to.equal(2n)

      // NFT 4 already minted once (totalSupply=1), allow one more
      await contract.connect(minter).mintCredential(owner.address, 4, 1)
      const total = await contract.totalSupply(4)
      expect(total).to.equal(2n)

      // Revert on third mint
      await expect(
        contract.connect(minter).mintCredential(owner.address, 4, 1)
      ).to.be.revertedWith('Would exceed max supply')
    })

    it('reverts setting maxSupply below current supply', async () => {
      // totalSupply for token 4 is 2
      await expect(
        contract.setMaxSupply(4, 1)
      ).to.be.revertedWith('Cannot set max below current supply')
    })
  })

  // ==================== SOULBOUND TRANSFERS ====================
  describe('soulbound transfers', () => {
    it('reverts transferring a soulbound SBT', async () => {
      await expect(
        contract.connect(user).safeTransferFrom(
          user.address, owner.address, 1, 1, '0x'
        )
      ).to.be.revertedWith('Soulbound: cannot transfer this credential')
    })

    it('allows transferring a non-soulbound NFT', async () => {
      // Mint a fresh NFT for user2
      await contract.connect(minter).mintCredential(
        user.address, 4, 1
      )
      await expect(
        contract.connect(user).safeTransferFrom(
          user.address, owner.address, 4, 1, '0x'
        )
      ).to.not.be.reverted
    })

    it('reverts batch transfer when any token is soulbound', async () => {
      await expect(
        contract.connect(user).safeBatchTransferFrom(
          user.address, owner.address, [1, 4], [1, 1], '0x'
        )
      ).to.be.revertedWith('Soulbound: cannot transfer this credential')
    })
  })

  // ==================== PREMIUM COURSE QUERIES ====================
  describe('premium course queries', () => {
    it('correctly identifies premium courses', async () => {
      const isPremium1 = await contract.isPremiumCourse(1)
      const isPremium2 = await contract.isPremiumCourse(2)
      expect(isPremium1).to.equal(false)
      expect(isPremium2).to.equal(true)
    })

    it('returns correct tokenId for course', async () => {
      const tokenId1 = await contract.courseIdToTokenId(1)
      const tokenId2 = await contract.courseIdToTokenId(2)
      expect(tokenId1).to.equal(1n)
      expect(tokenId2).to.equal(2n)
    })

    it('getTokenIdByCourseId returns correct value', async () => {
      const tokenId = await contract.getTokenIdByCourseId(1)
      expect(tokenId).to.equal(1n)
    })

    it('returns 0 for unregistered course', async () => {
      const tokenId = await contract.courseIdToTokenId(999)
      expect(tokenId).to.equal(0n)
    })
  })

  // ==================== REVOCATION ====================
  describe('revocation', () => {
    it('revokes an SBT (soulbound=true)', async () => {
      const tx = await contract.connect(minter).revokeCredential(
        user.address, 1, 1
      )
      const receipt = await tx.wait()
      expect(receipt.status).to.equal(1)

      const balance = await contract.balanceOf(user.address, 1)
      expect(balance).to.equal(0n)

      const has = await contract.hasCredential(user.address, 1)
      expect(has).to.equal(false)
    })

    it('revokes an NFT (soulbound=false)', async () => {
      await contract.connect(minter).revokeCredential(
        user.address, 4, 1
      )
      const balance = await contract.balanceOf(user.address, 4)
      expect(balance).to.equal(0n)
    })

    it('emits CredentialRevoked event', async () => {
      // Mint fresh
      await contract.connect(minter).mintCredential(user.address, 3, 1)
      const tx = await contract.connect(minter).revokeCredential(
        user.address, 3, 1
      )
      const receipt = await tx.wait()

      // Find the event
      const event = receipt.logs.find(
        (log: any) => {
          try {
            const parsed = contract.interface.parseLog(log)
            return parsed?.name === 'CredentialRevoked'
          } catch { return false }
        }
      )
      expect(event).to.not.be.undefined
    })

    it('reverts non-minter revoking', async () => {
      await expect(
        contract.connect(user).revokeCredential(user.address, 3, 1)
      ).to.be.reverted
    })

    it('reverts revoking more than balance', async () => {
      await expect(
        contract.connect(minter).revokeCredential(user.address, 3, 99)
      ).to.be.revertedWith('Insufficient balance to revoke')
    })
  })

  // ==================== URI ====================
  describe('metadata URI', () => {
    it('returns correct URI for registered token', async () => {
      const uri = await contract.uri(1)
      // siteBaseURI for learn.tg + tokenId + .json
      expect(uri).to.include('learn.tg')
      expect(uri).to.include('1.json')
    })

    it('reverts for unregistered token', async () => {
      await expect(
        contract.uri(999)
      ).to.be.revertedWith('Token ID not configured')
    })
  })

  // ==================== nextTokenId ====================
  describe('nextTokenId', () => {
    it('increments after each registration', async () => {
      const before = await contract.nextTokenId()
      await contract.registerCredentialType(
        SIVEL_XYZ, ROLE, 'Test Role', true, 0, false
      )
      const after = await contract.nextTokenId()
      expect(after).to.equal(before + 1n)
    })
  })

  // ==================== siteBaseURI ====================
  describe('siteBaseURI', () => {
    it('admin can update site base URI', async () => {
      await contract.setSiteBaseURI('stable-sl.pdJ.app', 'https://stable.example.com/api/credential/')

      // Mint a token for stable-sl to verify URI
      await contract.registerCredentialType(
        'stable-sl.pdJ.app', ROLE, 'Stable Role', true, 0, false
      )
      const nextId = Number(await contract.nextTokenId()) - 1
      const uri = await contract.uri(nextId)
      expect(uri).to.include('stable.example.com')
    })

    it('reverts non-admin updating URI', async () => {
      await expect(
        contract.connect(user).setSiteBaseURI('learn.tg', 'https://evil.com/')
      ).to.be.reverted
    })
  })
})
