// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PasosDeJesusCredentials
 * @dev Unified credential contract for the Pasos de Jesús ecosystem (learn.tg, sivel.xyz,
 * stable-sl).
 *
 * Deployed identically on Celo (SBTs) and Base (NFTs). Backend mints after verifying
 * payments off‑chain — this contract never holds funds.
 *
 * Features:
 * - SBTs (Soulbound Tokens): Non‑transferable credentials for courses, roles, achievements.
 * - Transferable NFTs: For biblical verses, collectible art, personalized NFTs, etc.
 * - Dynamic tokenId allocation: Sequential `nextTokenId` (no fixed ranges).
 * - Metadata: Dynamic `uri` based on `siteBaseURI` and `tokenSiteHash`, with optional
 *   per‑token custom URI for NFTs (e.g., ipfs://, ar:// for user‑paid permanent storage).
 * - Pausable: Admin can pause/unpause all transfers and mints in emergencies.
 *
 * NFT maxSupply behavior:
 * - NFT with customURI → maxSupply = 1, permanently locked (unique, user‑paid storage
 *   on Arweave/IPFS).
 * - NFT without customURI → maxSupply set at registration, permanently locked
 *   (platform‑hosted collection, user pays platform service fee).
 * - SBTs (course, role, achievement) → maxSupply adjustable by admin via setMaxSupply.
 *
 * Standards: ERC-1155, AccessControl, Pausable.
 *
 * Deployment:
 * - Celo: SBTs only — course completions, roles, donor recognition, achievements.
 * - Base: NFTs only — transferable collectibles, personalized art, biblical verses.
 */
contract PasosDeJesusCredentials is ERC1155, AccessControl, Pausable {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // ==================== CONSTANTS ====================
    // Site identifiers (keccak256 hashes)
    bytes32 public constant LEARN_TG_HASH = keccak256("learn.tg");
    bytes32 public constant SIVEL_XYZ_HASH = keccak256("sivel.xyz");
    bytes32 public constant STABLE_SL_HASH = keccak256("stable-sl.pdJ.app");

    // Credential type identifiers
    bytes32 public constant COURSE_COMPLETION_HASH = keccak256("course_completion");
    bytes32 public constant ROLE_HASH = keccak256("role");
    bytes32 public constant ACHIEVEMENT_HASH = keccak256("achievement");
    bytes32 public constant NFT_HASH = keccak256("nft");

    // ==================== STORAGE ====================
    // Core configuration
    uint256 public nextTokenId = 1;

    // Token metadata mappings
    mapping(uint256 => bytes32) public tokenSiteHash;
    mapping(uint256 => bytes32) public tokenTypeHash;
    mapping(uint256 => string) public tokenNames;
    mapping(uint256 => uint256) public maxSupply; // 0 = unlimited
    mapping(uint256 => uint256) public totalSupply;

    // Soulbound flag (non-transferable when true, behavior compatible with EIP-5633)
    mapping(uint256 => bool) public isSoulbound;

    // For learn.tg courses only (1:1 mapping between courseId and tokenId)
    mapping(uint256 => bool) public isPremiumCourse;
    mapping(uint256 => uint256) public courseIdToTokenId;
    mapping(uint256 => uint256) public tokenIdToCourseId;

    // Base URIs per site (configurable by admin)
    mapping(bytes32 => string) public siteBaseURI;

    // Per‑token custom URI (set at registration, correctable by DEFAULT_ADMIN_ROLE)
    mapping(uint256 => string) private _customTokenURI;

    // ==================== EVENTS ====================
    event CredentialTypeRegistered(
        uint256 indexed tokenId,
        bytes32 indexed siteHash,
        string siteName,
        bytes32 indexed typeHash,
        string typeName,
        string displayName,
        bool isSoulbound,
        uint256 courseId,
        bool premium
    );

    event CredentialMinted(
        uint256 indexed tokenId,
        address indexed account,
        string tokenName,
        bool isPremium,
        uint256 timestamp
    );

    event CredentialRevoked(
        uint256 indexed tokenId,
        address indexed account,
        uint256 amount,
        uint256 timestamp
    );

    event BaseURIUpdated(bytes32 indexed siteHash, string newBaseURI);

    // ==================== CONSTRUCTOR ====================
    /**
     * @param _baseTokenURI Base URI for metadata (can be overridden by siteBaseURI).
     */
    constructor(string memory _baseTokenURI) ERC1155(_baseTokenURI) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Set default base URIs for each site
        siteBaseURI[LEARN_TG_HASH] = "https://learn.tg/api/credential/";
        siteBaseURI[SIVEL_XYZ_HASH] = "https://sivel.xyz/api/credential/";
        siteBaseURI[STABLE_SL_HASH] = "https://stable-sl.pdJ.app/api/credential/";
    }

    // ==================== PAUSABLE ====================
    /**
     * @dev Pause all mints and transfers. Only DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause all mints and transfers. Only DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ==================== SOULBOUND ENFORCEMENT ====================
    /**
     * @dev Override safeTransferFrom to enforce soulbound.
     * For NFTs (isSoulbound[tokenId] = false), transfers proceed normally.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public override whenNotPaused {
        if (isSoulbound[tokenId]) {
            revert("Soulbound: cannot transfer this credential");
        }
        super.safeTransferFrom(from, to, tokenId, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override whenNotPaused {
        for (uint256 i = 0; i < ids.length; i++) {
            if (isSoulbound[ids[i]]) {
                revert("Soulbound: cannot transfer this credential");
            }
        }
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    // ==================== REGISTER CREDENTIAL TYPE ====================
    /**
     * @dev Register a new credential type (course, role, achievement, or NFT).
     *      Only MINTER_ROLE so that backends (learn.tg, sivel.xyz) can register
     *      new types without the admin wallet.
     *
     * NFT maxSupply rules:
     * - NFT with customURI → maxSupply = 1 (unique, user‑paid permanent storage
     *   on Arweave/IPFS).
     * - NFT without customURI → maxSupply = maxSupply_ parameter (platform‑hosted
     *   collection, user pays platform service fee).
     * - NFT maxSupply is permanently locked and cannot be changed by setMaxSupply.
     *
     * @param siteName Site name (e.g., "learn.tg", "sivel.xyz").
     * @param typeName Type name (e.g., "course_completion", "role", "nft").
     * @param displayName Human-readable name for the credential.
     * @param soulbound Whether this credential is soulbound (non‑transferable).
     * @param courseId For course_completion only: learn.tg course ID. 0 otherwise.
     * @param premium For course_completion only: whether the course is premium.
     * @param customURI Optional per‑token URI (e.g., ipfs://..., ar://... for NFTs).
     *                  Pass empty string to use the site's base URI.
     * @param maxSupply_ Maximum supply for this credential type.
     *                   0 = unlimited (for courses). Ignored for NFTs with customURI.
     */
    function registerCredentialType(
        string memory siteName,
        string memory typeName,
        string memory displayName,
        bool soulbound,
        uint256 courseId,
        bool premium,
        string memory customURI,
        uint256 maxSupply_
    ) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256 tokenId) {
        bytes32 siteHash = keccak256(bytes(siteName));
        bytes32 typeHash = keccak256(bytes(typeName));

        require(
            bytes(siteBaseURI[siteHash]).length > 0 || bytes(customURI).length > 0,
            "Site not supported: provide a customURI or ensure siteBaseURI is set"
        );
        require(bytes(displayName).length > 0, "Display name required");

        tokenId = nextTokenId;
        nextTokenId++;

        tokenSiteHash[tokenId] = siteHash;
        tokenTypeHash[tokenId] = typeHash;
        tokenNames[tokenId] = displayName;
        isSoulbound[tokenId] = soulbound;

        if (bytes(customURI).length > 0) {
            _customTokenURI[tokenId] = customURI;
        }

        if (typeHash == COURSE_COMPLETION_HASH) {
            require(courseId > 0, "Course ID required for course_completion");
            require(courseIdToTokenId[courseId] == 0, "Course already registered");
            require(soulbound, "Courses must be soulbound");
            courseIdToTokenId[courseId] = tokenId;
            tokenIdToCourseId[tokenId] = courseId;
            isPremiumCourse[tokenId] = premium;
            maxSupply[tokenId] = maxSupply_;
        } else if (typeHash == NFT_HASH) {
            require(!soulbound, "NFTs must be transferable");
            if (bytes(customURI).length > 0) {
                maxSupply[tokenId] = 1;
            } else {
                maxSupply[tokenId] = maxSupply_;
            }
        } else {
            require(soulbound, "Roles and achievements must be soulbound");
            maxSupply[tokenId] = maxSupply_;
        }

        emit CredentialTypeRegistered(
            tokenId, siteHash, siteName, typeHash,
            typeName, displayName, isSoulbound[tokenId],
            courseId, premium
        );
    }

    // ==================== ADMIN: CONFIGURATION ====================
    /**
     * @dev Set max supply for a credential type. Only DEFAULT_ADMIN_ROLE.
     * Cannot be used on NFTs (their maxSupply is locked at registration).
     * Cannot set max below current supply.
     */
    function setMaxSupply(uint256 tokenId, uint256 max)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            tokenTypeHash[tokenId] != NFT_HASH,
            "Cannot change maxSupply for NFTs"
        );
        require(
            max >= totalSupply[tokenId],
            "Cannot set max below current supply"
        );
        maxSupply[tokenId] = max;
    }

    /**
     * @dev Set base URI for a site. Only DEFAULT_ADMIN_ROLE.
     */
    function setSiteBaseURI(string memory siteName, string memory newBaseURI)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bytes32 siteHash = keccak256(bytes(siteName));
        require(bytes(siteBaseURI[siteHash]).length > 0, "Site not registered");
        siteBaseURI[siteHash] = newBaseURI;
        emit BaseURIUpdated(siteHash, newBaseURI);
    }

    /**
     * @dev Set or correct a custom token URI. Only DEFAULT_ADMIN_ROLE.
     * Useful if a customURI was set incorrectly at registration.
     */
    function setCustomTokenURI(uint256 tokenId, string memory newURI)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _customTokenURI[tokenId] = newURI;
    }

    // ==================== MINTING FUNCTIONS ====================
    /**
     * @dev Mint a credential (role, achievement, or NFT). Only MINTER_ROLE.
     * For NFTs, anyone can receive multiple units (amount > 1).
     * balanceOf prevents duplicate SBTs.
     */
    function mintCredential(
        address account,
        uint256 tokenId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        bytes32 typeHash = tokenTypeHash[tokenId];
        require(typeHash != bytes32(0), "Credential type not registered");
        require(
            typeHash != COURSE_COMPLETION_HASH,
            "Use mintCourseCompletion for courses"
        );
        require(bytes(tokenNames[tokenId]).length > 0, "Credential not configured");

        _validateMint(account, tokenId, amount);
        totalSupply[tokenId] += amount;
        _mint(account, tokenId, amount, "");

        emit CredentialMinted(
            tokenId,
            account,
            tokenNames[tokenId],
            false,
            block.timestamp
        );
    }

    /**
     * @dev Mint a course completion credential (for learn.tg). Only MINTER_ROLE.
     * SBTs are always amount = 1. balanceOf prevents duplicate SBTs.
     * The contract already knows the course name and premium status from
     * registration — no need to pass them again.
     */
    function mintCourseCompletion(
        address account,
        uint256 courseId
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        uint256 tokenId = courseIdToTokenId[courseId];
        require(tokenId != 0, "Course not registered");
        require(isSoulbound[tokenId], "Course credential must be soulbound");

        _validateMint(account, tokenId, 1);
        totalSupply[tokenId] += 1;
        _mint(account, tokenId, 1, "");

        emit CredentialMinted(
            tokenId,
            account,
            tokenNames[tokenId],
            isPremiumCourse[tokenId],
            block.timestamp
        );
    }

    // ==================== REVOCATION ====================
    /**
     * @dev Revoke (burn) a credential from a user. Only MINTER_ROLE.
     * Works for both SBTs (isSoulbound = true) and NFTs (isSoulbound = false).
     *
     * Use cases: removing a role due to misconduct, removing an NFT that
     * violates project rules (pornography, violence, anti‑Christian content).
     *
     * @param account Address to revoke from.
     * @param tokenId Token ID to revoke.
     * @param amount Amount to revoke (1 for SBTs, any for NFTs).
     */
    function revokeCredential(
        address account,
        uint256 tokenId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(
            balanceOf(account, tokenId) >= amount,
            "Insufficient balance to revoke"
        );

        _burn(account, tokenId, amount);

        totalSupply[tokenId] -= amount;

        emit CredentialRevoked(tokenId, account, amount, block.timestamp);
    }

    // ==================== INTERNAL VALIDATION ====================
    /**
     * @dev Pre-mint validation: prevents duplicate SBTs and enforces max supply.
     */
    function _validateMint(address account, uint256 tokenId, uint256 amount)
        private
        view
    {
        // For SBTs, prevent duplicate minting
        if (isSoulbound[tokenId]) {
            require(
                balanceOf(account, tokenId) == 0,
                "Account already has this soulbound credential"
            );
        }

        uint256 max = maxSupply[tokenId];
        if (max > 0) {
            require(
                totalSupply[tokenId] + amount <= max,
                "Would exceed max supply"
            );
        }
    }

    // ==================== METADATA ====================
    /**
     * @dev Returns the metadata URI for a given tokenId.
     * If a custom URI was set at registration, it is returned.
     * Otherwise the URI is built from the site's base URI.
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory custom = _customTokenURI[tokenId];
        if (bytes(custom).length > 0) {
            return custom;
        }

        bytes32 siteHash = tokenSiteHash[tokenId];
        require(siteHash != bytes32(0), "Token ID not configured");

        string memory baseURI = siteBaseURI[siteHash];
        require(bytes(baseURI).length > 0, "BaseURI not configured for this site");

        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

    // ==================== QUERY FUNCTIONS ====================
    /**
     * @dev Get tokenId for a learn.tg course (for backend use).
     */
    function getTokenIdByCourseId(uint256 courseId) external view returns (uint256) {
        return courseIdToTokenId[courseId];
    }

    // ==================== INTERFACE SUPPORT ====================
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
