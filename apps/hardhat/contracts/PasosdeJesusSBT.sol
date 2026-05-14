// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PasosDeJesusSBT is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant LEARN_TG_MAX = 9999;
    uint256 public constant SIVEL_XYZ_MIN = 10000;
    uint256 public constant SIVEL_XYZ_MAX = 19999;
    uint256 public constant STABLE_SL_MIN = 20000;
    uint256 public constant STABLE_SL_MAX = 29999;

    mapping(uint256 => uint256) public maxSupply;
    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => bool) public isPremium;
    mapping(uint256 => string) public courseNames;
    mapping(address => mapping(uint256 => bool)) public hasSbt;

    event SbtMinted(uint256 indexed tokenId, address indexed account, string courseName, bool isPremium, uint256 timestamp);

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // Soulbound: prohibit transfers
    function safeTransferFrom(address, address, uint256, uint256, bytes memory) public pure override {
        revert("Soulbound: cannot transfer");
    }

    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory) public pure override {
        revert("Soulbound: cannot transfer");
    }

    function mintRole(address account, uint256 tokenId, uint256 amount) external onlyRole(MINTER_ROLE) {
        _validateMint(account, tokenId, amount);
        totalSupply[tokenId] += amount;
        _mint(account, tokenId, amount, "");
        hasSbt[account][tokenId] = true;
        emit SbtMinted(tokenId, account, courseNames[tokenId], isPremium[tokenId], block.timestamp);
    }

    function mintCourseCompletion(address account, uint256 courseId, string memory courseName, bool premium) external onlyRole(MINTER_ROLE) {
        require(courseId >= 1 && courseId <= LEARN_TG_MAX, "Course ID out of range");
        require(bytes(courseName).length > 0, "Course name cannot be empty");
        
        _validateMint(account, courseId, 1);
        
        if (bytes(courseNames[courseId]).length == 0) {
            courseNames[courseId] = courseName;
            isPremium[courseId] = premium;
        }
        
        totalSupply[courseId] += 1;
        _mint(account, courseId, 1, "");
        hasSbt[account][courseId] = true;
        emit SbtMinted(courseId, account, courseName, premium, block.timestamp);
    }

    function _validateMint(address account, uint256 tokenId, uint256 amount) private view {
        require(!hasSbt[account][tokenId], "Account already has this SBT");
        uint256 max = maxSupply[tokenId];
        if (max > 0) {
            require(totalSupply[tokenId] + amount <= max, "Exceeds max supply");
        }
    }

    // Admin functions
    function setMaxSupply(uint256 tokenId, uint256 max) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxSupply[tokenId] = max;
    }

    function setCourseInfo(uint256 tokenId, string memory name, bool premium) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(totalSupply[tokenId] == 0, "Cannot modify after mint");
        courseNames[tokenId] = name;
        isPremium[tokenId] = premium;
    }

    // URI for token metadata
    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory baseURI;
        
        if (tokenId >= 1 && tokenId <= LEARN_TG_MAX) {
            baseURI = "https://learn.tg/api/sbt/";
        } else if (tokenId >= SIVEL_XYZ_MIN && tokenId <= SIVEL_XYZ_MAX) {
            baseURI = "https://sivel.xyz/api/sbt/";
        } else if (tokenId >= STABLE_SL_MIN && tokenId <= STABLE_SL_MAX) {
            baseURI = "https://stable-sl.pdJ.app/api/sbt/";
        } else {
            revert("Token ID out of range");
        }
        
        return string(abi.encodePacked(baseURI, Strings.toString(tokenId), ".json"));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
