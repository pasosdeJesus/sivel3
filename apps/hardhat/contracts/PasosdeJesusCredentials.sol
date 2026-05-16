// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
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
 * - Transferable NFTs: For biblical verses, collectible art, etc.
 * - Dynamic tokenId allocation: Sequential `nextTokenId` (no fixed ranges).
 * - Metadata: Dynamic `uri` based on `siteBaseURI` and `tokenSiteHash`.
 *
 * Standards: ERC-1155, AccessControl.
 *
 * Deployment:
 * - Celo: SBTs only — course completions, roles, donor recognition, achievements.
 * - Base: NFTs only — transferable collectibles.
 */
contract PasosDeJesusCredentials is ERC1155, AccessControl {
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
    mapping(address => mapping(uint256 => bool)) public hasCredential;

    // EIP-5633: Soulbound flag (true = cannot transfer, false = transferable)
    mapping(uint256 => bool) public isSoulbound;

    // For learn.tg courses only (1:1 mapping between courseId and tokenId)
    mapping(uint256 => bool) public isPremiumCourse;
    mapping(uint256 => uint256) public courseIdToTokenId;
    mapping(uint256 => uint256) public tokenIdToCourseId;

    // Base URIs per site (configurable by admin)
    mapping(bytes32 => string) public siteBaseURI;

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

    // ==================== SOULBOUND ENFORCEMENT ====================
    /**
     * @dev Override safeTransferFrom to enforce soulbound.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public override {
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
    ) public override {
        for (uint256 i = 0; i < ids.length; i++) {
            if (isSoulbound[ids[i]]) {
                revert("Soulbound: cannot transfer this credential");
            }
        }
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    // ==================== ADMIN: REGISTER CREDENTIAL TYPE ====================
    /**
     * @dev Register a new credential type (course, role, achievement, or NFT).
     * @param siteName Site name (e.g., "learn.tg", "sivel.xyz").
     * @param typeName Type name (e.g., "course_completion", "role", "nft").
     * @param displayName Human-readable name for the credential.
     * @param soulbound Whether this credential is soulbound (non‑transferable).
     * @param courseId For course_completion only: learn.tg course ID. 0 otherwise.
     * @param premium For course_completion only: whether the course is premium.
     */
    function registerCredentialType(
        string memory siteName,
        string memory typeName,
        string memory displayName,
        bool soulbound,
        uint256 courseId,
        bool premium
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 tokenId) {
        bytes32 siteHash = keccak256(bytes(siteName));
        bytes32 typeHash = keccak256(bytes(typeName));

        require(bytes(siteBaseURI[siteHash]).length > 0, "Site not supported");
        require(bytes(displayName).length > 0, "Display name required");

        tokenId = nextTokenId;
        nextTokenId++;

        tokenSiteHash[tokenId] = siteHash;
        tokenTypeHash[tokenId] = typeHash;
        tokenNames[tokenId] = displayName;
        isSoulbound[tokenId] = soulbound;

        if (typeHash == COURSE_COMPLETION_HASH) {
            require(courseId > 0, "Course ID required for course_completion");
            require(soulbound, "Courses must be soulbound");
            courseIdToTokenId[courseId] = tokenId;
            tokenIdToCourseId[tokenId] = courseId;
            isPremiumCourse[tokenId] = premium;
        } else if (typeHash == NFT_HASH) {
            require(!soulbound, "NFTs must be transferable");
        } else {
            require(soulbound, "Roles and achievements must be soulbound");
        }

        emit CredentialTypeRegistered(
            tokenId, siteHash, siteName, typeHash,
            typeName, displayName, isSoulbound[tokenId],
            courseId, premium
        );
    }

    // ==================== ADMIN: CONFIGURATION ====================
    function setMaxSupply(uint256 tokenId, uint256 max)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(max >= totalSupply[tokenId], "Cannot set max below current supply");
        maxSupply[tokenId] = max;
    }

    function setSiteBaseURI(string memory siteName, string memory newBaseURI)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bytes32 siteHash = keccak256(bytes(siteName));
        require(bytes(siteBaseURI[siteHash]).length > 0, "Site not registered");
        siteBaseURI[siteHash] = newBaseURI;
        emit BaseURIUpdated(siteHash, newBaseURI);
    }

    // ==================== MINTING FUNCTIONS ====================
    /**
     * @dev Mint a credential (role, achievement, or NFT). Admin only.
     */
    function mintCredential(address account, uint256 tokenId, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
    {
        bytes32 typeHash = tokenTypeHash[tokenId];
        require(typeHash != bytes32(0), "Credential type not registered");
        require(typeHash != COURSE_COMPLETION_HASH, "Use mintCourseCompletion for courses");
        require(bytes(tokenNames[tokenId]).length > 0, "Credential not configured");

        _validateMint(account, tokenId, amount);
        totalSupply[tokenId] += amount;
        _mint(account, tokenId, amount, "");
        hasCredential[account][tokenId] = true;
        emit CredentialMinted(tokenId, account, tokenNames[tokenId], false, block.timestamp);
    }

    /**
     * @dev Mint a course completion credential (for learn.tg). Admin only.
     */
    function mintCourseCompletion(
        address account,
        uint256 courseId,
        string memory courseName,
        bool premium
    ) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = courseIdToTokenId[courseId];
        require(tokenId != 0, "Course not registered");
        require(
            keccak256(bytes(courseName)) == keccak256(bytes(tokenNames[tokenId])),
            "Course name mismatch"
        );
        require(premium == isPremiumCourse[tokenId], "Premium status mismatch");
        require(isSoulbound[tokenId], "Course credential must be soulbound");

        _validateMint(account, tokenId, 1);
        totalSupply[tokenId] += 1;
        _mint(account, tokenId, 1, "");
        hasCredential[account][tokenId] = true;
        emit CredentialMinted(tokenId, account, tokenNames[tokenId], premium, block.timestamp);
    }

    // ==================== INTERNAL VALIDATION ====================
    function _validateMint(address account, uint256 tokenId, uint256 amount)
        private
        view
    {
        require(
            !hasCredential[account][tokenId],
            "Account already has this credential"
        );
        uint256 max = maxSupply[tokenId];
        if (max > 0) {
            require(totalSupply[tokenId] + amount <= max, "Would exceed max supply");
        }
    }

    // ==================== METADATA ====================
    /**
     * @dev Returns the metadata URI for a given tokenId.
     * The actual JSON with attributes is served by the respective site's API.
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
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
