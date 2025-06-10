// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

error InvalidSignature();
error NothingToClaim();

contract RewardClaimer is ERC20, EIP712 {
    using ECDSA for bytes32;

    // Immutable signer address (set at deployment)
    address public immutable trustedSigner;

    // Tracks how much each user has already claimed (cumulative)
    mapping(address => uint256) private _claimed;

    event Claimed(address indexed user, uint256 amount);

    constructor(
        address signer_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) EIP712("MyGameRewards", "1") {
        trustedSigner = signer_;
    }

    /**
     * @notice Claim newly‐minted tokens up to your signed total entitlement.
     * @param totalAmount The cumulative total you’re allowed to claim (signed by backend).
     * @param signature   EIP‐712 signature from `trustedSigner` over (msg.sender, totalAmount).
     */
    function claim(
        uint256 totalAmount,
        bytes calldata signature
    ) external {
        // Recreate the signed calldata
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Claim(address user,uint256 totalAmount)"),
                msg.sender,
                totalAmount
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        // Recover and verify
        if (digest.recover(signature) != trustedSigner) revert InvalidSignature();

        uint256 already = _claimed[msg.sender];
        if (totalAmount <= already) revert NothingToClaim();

        unchecked {
            uint256 toMint = totalAmount - already;
            _claimed[msg.sender] = totalAmount;
            _mint(msg.sender, toMint);
            emit Claimed(msg.sender, toMint);
        }
    }

    /**
     * @notice View how much this user has already claimed.
     */
    function claimed(address user) external view returns (uint256) {
        return _claimed[user];
    }
}