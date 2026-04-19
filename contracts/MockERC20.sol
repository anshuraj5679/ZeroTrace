// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import { FHE, ebool, euint128 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { InEuint128 } from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";

contract MockERC20 is ERC20 {
    mapping(address => euint128) private _encryptedBalances;
    mapping(address => mapping(address => euint128)) private _encryptedAllowances;

    euint128 private _encryptedSupply;
    uint8 private immutable _tokenDecimals;

    event TransferEncrypted(address indexed from, address indexed to);
    event ApprovalEncrypted(address indexed owner, address indexed spender);

    error InvalidAddress();

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) {
        _tokenDecimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    function mint(address to, uint256 amount) external {
        if (to == address(0)) {
            revert InvalidAddress();
        }

        _mint(to, amount);
    }

    function wrap(uint256 amount) external {
        _burn(msg.sender, amount);

        euint128 encryptedAmount = FHE.asEuint128(amount);
        _encryptedBalances[msg.sender] = FHE.add(_encryptedBalances[msg.sender], encryptedAmount);
        _encryptedSupply = FHE.add(_encryptedSupply, encryptedAmount);

        _grantBalanceAccess(msg.sender);
        _grantSupplyAccess();
    }

    function mintEncrypted(address to, InEuint128 calldata encryptedAmount) external {
        if (to == address(0)) {
            revert InvalidAddress();
        }

        euint128 amount = FHE.asEuint128(encryptedAmount);
        _encryptedBalances[to] = FHE.add(_encryptedBalances[to], amount);
        _encryptedSupply = FHE.add(_encryptedSupply, amount);

        _grantBalanceAccess(to);
        _grantSupplyAccess();
    }

    function approveEncrypted(address spender, InEuint128 calldata encryptedAmount) external returns (bool) {
        if (spender == address(0)) {
            revert InvalidAddress();
        }

        _encryptedAllowances[msg.sender][spender] = FHE.asEuint128(encryptedAmount);
        _grantAllowanceAccess(msg.sender, spender);

        emit ApprovalEncrypted(msg.sender, spender);
        return true;
    }

    function transferEncrypted(address to, InEuint128 calldata encryptedAmount) external returns (euint128) {
        return _transferEncrypted(msg.sender, to, FHE.asEuint128(encryptedAmount));
    }

    function _transferEncrypted(address to, euint128 encryptedAmount) external returns (euint128) {
        return _transferEncrypted(msg.sender, to, encryptedAmount);
    }

    function transferFromEncrypted(
        address from,
        address to,
        InEuint128 calldata encryptedAmount
    ) external returns (euint128) {
        return _transferFromEncryptedInternal(from, to, FHE.asEuint128(encryptedAmount));
    }

    function _transferFromEncrypted(address from, address to, euint128 encryptedAmount) external returns (euint128) {
        return _transferFromEncryptedInternal(from, to, encryptedAmount);
    }

    function _transferFromEncryptedInternal(
        address from,
        address to,
        euint128 encryptedAmount
    ) private returns (euint128) {
        euint128 currentAllowance = _encryptedAllowances[from][msg.sender];
        euint128 approvedAmount = FHE.min(currentAllowance, encryptedAmount);

        _encryptedAllowances[from][msg.sender] = FHE.sub(currentAllowance, approvedAmount);
        _grantAllowanceAccess(from, msg.sender);

        return _transferEncrypted(from, to, approvedAmount);
    }

    function balanceOfEncrypted(address account) external view returns (bytes32) {
        return euint128.unwrap(_encryptedBalances[account]);
    }

    function allowanceEncrypted(address owner, address spender) external view returns (bytes32) {
        return euint128.unwrap(_encryptedAllowances[owner][spender]);
    }

    function encryptedTotalSupply() external view returns (bytes32) {
        return euint128.unwrap(_encryptedSupply);
    }

    function _transferEncrypted(address from, address to, euint128 encryptedAmount) private returns (euint128) {
        if (from == address(0) || to == address(0)) {
            revert InvalidAddress();
        }

        ebool hasEnough = FHE.lte(encryptedAmount, _encryptedBalances[from]);
        euint128 transferred = FHE.select(hasEnough, encryptedAmount, FHE.asEuint128(0));

        _encryptedBalances[from] = FHE.sub(_encryptedBalances[from], transferred);
        _encryptedBalances[to] = FHE.add(_encryptedBalances[to], transferred);

        FHE.allowThis(transferred);
        FHE.allow(transferred, msg.sender);

        _grantBalanceAccess(from);
        _grantBalanceAccess(to);

        emit TransferEncrypted(from, to);
        return transferred;
    }

    function _grantBalanceAccess(address account) private {
        FHE.allowThis(_encryptedBalances[account]);
        FHE.allow(_encryptedBalances[account], account);
    }

    function _grantAllowanceAccess(address owner, address spender) private {
        FHE.allowThis(_encryptedAllowances[owner][spender]);
        FHE.allow(_encryptedAllowances[owner][spender], owner);
        FHE.allow(_encryptedAllowances[owner][spender], spender);
    }

    function _grantSupplyAccess() private {
        FHE.allowThis(_encryptedSupply);
    }
}
