// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SIVeL3RegionalDonationV2
 * @dev Versión mejorada del contrato de donaciones regionales para SIVeL 3.
 *      Soporta MiniPay (transfer directo + asignación por backend) y mantiene
 *      compatibilidad con el flujo legacy (approve + donate).
 *      
 *      Flujo legacy: donate(regionId, amount) - requiere approve previo
 *      Flujo MiniPay: usuario transfiere USDT al contrato + backend llama assignDonation()
 */
contract SIVeL3RegionalDonationV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable donationToken;
    address public backendAddress;

    // Mapping from a region ID to its corresponding balance
    mapping(uint256 => uint256) public regionalBalances;

    // Mapping from a region ID to its name
    mapping(uint256 => string) public regionNames;

    // Mapping para prevenir doble procesamiento de transacciones (MiniPay flow)
    mapping(bytes32 => bool) public processedTransactions;

    // --- Events ---
    event DonationReceived(address indexed donor, uint256 indexed regionId, uint256 amount);
    event DonationAssigned(uint256 indexed regionId, address indexed donor, uint256 amount, bytes32 indexed txHash, uint256 timestamp);
    event RegionSet(uint256 indexed regionId, string name);
    event Withdrawal(uint256 indexed regionId, address indexed to, uint256 amount);
    event EmergencyWithdrawal(address indexed to, uint256 amount);
    event BackendAddressUpdated(address indexed newBackend);

    modifier onlyBackend() {
        require(msg.sender == backendAddress, "Only backend");
        _;
    }

    /**
     * @param _donationToken Dirección del token ERC20 (USDT)
     * @param initialOwner Dirección del propietario inicial
     */
    constructor(address _donationToken, address initialOwner) Ownable(initialOwner) {
        require(_donationToken != address(0), "Invalid token address");
        donationToken = IERC20(_donationToken);
        backendAddress = initialOwner; // Inicialmente el owner, luego se puede cambiar
    }

    /**
     * @dev Actualiza la dirección del backend que puede llamar a assignDonation
     * @param _backend Nueva dirección del backend
     */
    function setBackendAddress(address _backend) external onlyOwner {
        require(_backend != address(0), "Invalid backend address");
        backendAddress = _backend;
        emit BackendAddressUpdated(_backend);
    }

    /**
     * @dev Establece una región (solo owner)
     * @param _regionId ID de la región (ej: 1 para Colombia)
     * @param _name Nombre de la región
     */
    function setRegion(uint256 _regionId, string memory _name) public onlyOwner {
        require(_regionId > 0, "Region ID must be greater than 0");
        require(bytes(_name).length > 0, "Region name cannot be empty");
        regionNames[_regionId] = _name;
        emit RegionSet(_regionId, _name);
    }

    /**
     * @dev FUNCIÓN LEGACY: Donación con approve previo (compatible con wallets tradicionales)
     * @param _regionId ID de la región
     * @param _amount Monto a donar (en unidades base del token, ej: 1 USDT = 1_000_000)
     */
    function donate(uint256 _regionId, uint256 _amount) public nonReentrant {
        require(bytes(regionNames[_regionId]).length > 0, "Region does not exist");
        require(_amount > 0, "Donation must be greater than 0");

        regionalBalances[_regionId] += _amount;
        donationToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit DonationReceived(msg.sender, _regionId, _amount);
    }

    /**
     * @dev NUEVO FLUJO MINIPAY: Backend asigna donación después de verificar transfer on-chain
     * @param _regionId ID de la región
     * @param _donor Dirección del donante
     * @param _amount Monto donado
     * @param _txHash Hash de la transacción de transferencia (para evitar duplicados)
     */
    function assignDonation(
        uint256 _regionId,
        address _donor,
        uint256 _amount,
        bytes32 _txHash
    ) external onlyBackend nonReentrant {
        require(bytes(regionNames[_regionId]).length > 0, "Region does not exist");
        require(_amount > 0, "Amount must be greater than 0");
        require(!processedTransactions[_txHash], "Transaction already processed");

        processedTransactions[_txHash] = true;
        regionalBalances[_regionId] += _amount;

        emit DonationAssigned(_regionId, _donor, _amount, _txHash, block.timestamp);
    }

    /**
     * @dev FUNCIÓN DE MIGRACIÓN: Establece balance de una región (solo owner)
     * @param _regionId ID de la región
     * @param _amount Balance a establecer
     */
    function setRegionalBalance(uint256 _regionId, uint256 _amount) external onlyOwner {
        regionalBalances[_regionId] = _amount;
    }

    /**
     * @dev Retira fondos de una región a una dirección específica (solo owner)
     * @param _regionId ID de la región
     * @param _amount Monto a retirar
     * @param _to Dirección destino
     */
    function withdraw(uint256 _regionId, uint256 _amount, address _to) public onlyOwner nonReentrant {
        require(_to != address(0), "Invalid recipient address");
        require(regionalBalances[_regionId] >= _amount, "Insufficient balance");

        regionalBalances[_regionId] -= _amount;
        donationToken.safeTransfer(_to, _amount);

        emit Withdrawal(_regionId, _to, _amount);
    }

    /**
     * @dev Emergencia: retira todos los fondos del contrato al owner
     */
    function emergencyWithdraw() public onlyOwner nonReentrant {
        uint256 totalBalance = donationToken.balanceOf(address(this));
        require(totalBalance > 0, "No funds to withdraw");
        donationToken.safeTransfer(owner(), totalBalance);

        emit EmergencyWithdrawal(owner(), totalBalance);
    }
}
