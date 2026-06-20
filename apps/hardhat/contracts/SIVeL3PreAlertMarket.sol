// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SIVeL3PreAlertMarket (MVP)
 * @dev Minimal marketplace for pre‑alerts on Celo.
 *      MVP version: USDT only, fixed $1 price, simplified admin withdrawal.
 */
contract SIVeL3PreAlertMarket is AccessControlEnumerable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    uint256 public constant PRICE_USDT = 1_000_000; // 1 USDT (6 decimals)

    IERC20 public immutable usdtToken;
    uint256 public preAlertCounter;

    struct PreAlert {
        bytes32 eventHash;
        bytes32 locationHash;
        uint256 timestamp;
        address publisher;
        address buyer;
        bool converted;
        bool active;
    }

    mapping(uint256 => PreAlert) public preAlerts;

    event PreAlertPublished(uint256 indexed id, bytes32 eventHash, bytes32 locationHash, uint256 timestamp, address publisher);
    event PreAlertBought(uint256 indexed id, address indexed buyer, uint256 amount);
    event AlertConverted(uint256 indexed id, address indexed converter);

    constructor(address _usdtToken, address _agentWallet) {
        require(_usdtToken != address(0), "Invalid USDT address");
        usdtToken = IERC20(_usdtToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AGENT_ROLE, _agentWallet);
    }

    /**
     * @dev Agent publishes a new pre‑alert.
     */
    function publishPreAlert(
        bytes32 eventHash,
        bytes32 locationHash,
        uint256 timestamp
    ) external onlyRole(AGENT_ROLE) whenNotPaused {
        require(eventHash != bytes32(0), "eventHash required");
        require(timestamp <= block.timestamp, "timestamp in future");

        preAlertCounter++;
        preAlerts[preAlertCounter] = PreAlert({
            eventHash: eventHash,
            locationHash: locationHash,
            timestamp: timestamp,
            publisher: msg.sender,
            buyer: address(0),
            converted: false,
            active: true
        });

        emit PreAlertPublished(preAlertCounter, eventHash, locationHash, timestamp, msg.sender);
    }

    /**
     * @dev Citizen buys a pre‑alert for exactly 1 USDT.
     */
    function buyPreAlert(uint256 preAlertId) external nonReentrant whenNotPaused {
        require(preAlertId > 0 && preAlertId <= preAlertCounter, "Invalid ID");
        require(preAlerts[preAlertId].active, "Not active");
        require(preAlerts[preAlertId].buyer == address(0), "Already bought");

        preAlerts[preAlertId].buyer = msg.sender;
        usdtToken.safeTransferFrom(msg.sender, address(this), PRICE_USDT);

        emit PreAlertBought(preAlertId, msg.sender, PRICE_USDT);
    }

    /**
     * @dev Buyer converts their pre‑alert to a citizen alert.
     */
    function convertToAlert(uint256 preAlertId) external whenNotPaused {
        require(preAlertId > 0 && preAlertId <= preAlertCounter, "Invalid ID");
        require(preAlerts[preAlertId].active, "Not active");
        require(preAlerts[preAlertId].buyer == msg.sender, "Not buyer");
        require(!preAlerts[preAlertId].converted, "Already converted");

        preAlerts[preAlertId].converted = true;
        preAlerts[preAlertId].active = false;

        emit AlertConverted(preAlertId, msg.sender);
    }

    /**
     * @dev Admin withdraws collected USDT (simplified distribution).
     */
    function withdrawUSDT(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount > 0, "Amount must be > 0");
        usdtToken.safeTransfer(msg.sender, amount);
    }

    /**
     * @dev Admin sets the agent wallet.
     */
    function setAgentWallet(address newAgent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAgent != address(0), "Invalid address");
        address current = getRoleMember(AGENT_ROLE, 0);
        if (current != address(0)) {
            revokeRole(AGENT_ROLE, current);
        }
        grantRole(AGENT_ROLE, newAgent);
    }

    /**
     * @dev Admin pauses the contract.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Admin unpauses the contract.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
