// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RegionalDonation
 * @dev Manages donations for specific geographic regions using an ERC20 token (USDT).
 * The list of valid regions is managed off-chain (e.g., in a database) and the frontend
 * is responsible for providing users with valid region IDs. This contract only validates
 * that a given region ID has been set by the owner.
 */
contract RegionalDonation is Ownable, ReentrancyGuard {
    IERC20 public immutable donationToken;

    // Mapping from a region ID to its corresponding balance
    mapping(uint256 => uint256) public regionalBalances;

    // Mapping from a region ID to its name. Used to validate if a region exists.
    mapping(uint256 => string) public regionNames;

    // --- Events ---
    event DonationReceived(address indexed donor, uint256 indexed regionId, uint256 amount);
    event RegionSet(uint256 indexed regionId, string name);
    event Withdrawal(uint256 indexed regionId, address indexed to, uint256 amount);
    event EmergencyWithdrawal(address indexed to, uint256 amount);

    /**
     * @param _donationToken The address of the ERC20 token for donations (e.g., USDT).
     * @param initialOwner The address of the contract's initial owner.
     */
    constructor(address _donationToken, address initialOwner) Ownable(initialOwner) {
        require(_donationToken != address(0), "Invalid token address");
        donationToken = IERC20(_donationToken);
    }

    /**
     * @dev Allows the owner to add/update a region. This makes the region ID valid for donations.
     * @param _regionId The ID of the region (e.g., 1 for Colombia).
     * @param _name The name of the region (e.g., "Colombia").
     */
    function setRegion(uint256 _regionId, string memory _name) public onlyOwner {
        require(_regionId > 0, "Region ID must be greater than 0");
        require(bytes(_name).length > 0, "Region name cannot be empty");
        regionNames[_regionId] = _name;
        emit RegionSet(_regionId, _name);
    }

    /**
     * @dev Public function to donate tokens to a specific region.
     * The donor must have approved this contract to spend tokens on their behalf.
     * @param _regionId The ID of the region to donate to.
     * @param _amount The amount of tokens to donate.
     */
    function donate(uint256 _regionId, uint256 _amount) public nonReentrant {
        require(bytes(regionNames[_regionId]).length > 0, "Region does not exist");
        require(_amount > 0, "Donation must be greater than 0");

        regionalBalances[_regionId] += _amount;
        donationToken.transferFrom(msg.sender, address(this), _amount);

        emit DonationReceived(msg.sender, _regionId, _amount);
    }

    /**
     * @dev Allows the owner to withdraw funds from a region's balance to a specific address.
     * @param _regionId The ID of the region.
     * @param _amount The amount to withdraw.
     * @param _to The address to send the withdrawn funds to.
     */
    function withdraw(uint256 _regionId, uint256 _amount, address _to) public onlyOwner nonReentrant {
        require(_to != address(0), "Invalid recipient address");
        require(regionalBalances[_regionId] >= _amount, "Insufficient balance");

        regionalBalances[_regionId] -= _amount;
        require(donationToken.transfer(_to, _amount), "Transfer failed");

        emit Withdrawal(_regionId, _to, _amount);
    }

    /**
     * @dev Allows the owner to withdraw all funds from the contract to their address.
     * This is a critical function for emergency situations or for migrating to a new contract.
     */
    function emergencyWithdraw() public onlyOwner nonReentrant {
        uint256 totalBalance = donationToken.balanceOf(address(this));
        require(totalBalance > 0, "No funds to withdraw");

        // For safety, this sends all funds directly to the owner of the contract.
        require(donationToken.transfer(owner(), totalBalance), "Emergency transfer failed");

        emit EmergencyWithdrawal(owner(), totalBalance);
    }
}
