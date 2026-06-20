// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SIVeL3RewardEscrow
 * @dev Minimal contract for releasing USDT rewards to citizens.
 *      Only BACKEND_ROLE can release payments.
 *      DEFAULT_ADMIN_ROLE can deposit and manage roles.
 */
contract SIVeL3RewardEscrow is AccessControl, ReentrancyGuard {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    IERC20 public immutable usdtToken;

    event FundsDeposited(address indexed from, uint256 amount);
    event PaymentReleased(address indexed recipient, uint256 amount);
    event EmergencyWithdrawn(address indexed to, uint256 amount);

    constructor(address _usdtToken, address _backend) {
        require(_usdtToken != address(0), "Invalid USDT address");
        usdtToken = IERC20(_usdtToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BACKEND_ROLE, _backend);
    }

    /**
     * @dev Deposits USDT into the contract.
     * @param amount Amount in USDT (6 decimals).
     */
    function deposit(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(amount > 0, "Amount must be > 0");
        usdtToken.transferFrom(msg.sender, address(this), amount);
        emit FundsDeposited(msg.sender, amount);
    }

    /**
     * @dev Releases a payment to a citizen.
     * @param recipient Citizen's wallet address.
     * @param amount Amount in USDT (6 decimals).
     */
    function releasePayment(address recipient, uint256 amount) external onlyRole(BACKEND_ROLE) nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(usdtToken.balanceOf(address(this)) >= amount, "Insufficient balance");

        usdtToken.transfer(recipient, amount);
        emit PaymentReleased(recipient, amount);
    }

    /**
     * @dev Emergency withdrawal by admin.
     * @param amount Amount in USDT (6 decimals).
     */
    function emergencyWithdraw(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(usdtToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        usdtToken.transfer(msg.sender, amount);
        emit EmergencyWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Returns the USDT balance of this contract.
     */
    function balance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }
}
