// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDT is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Mock USDT", "MUSDT") Ownable(initialOwner) {
        _mint(initialOwner, 1_000_000 * 10**6); // Mint 1,000,000 tokens with 6 decimals
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
