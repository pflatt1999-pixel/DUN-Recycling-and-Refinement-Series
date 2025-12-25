// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title RefineEngineV1_Float
/// @notice Manual refine splitter/router for DUN with a fixed protocol skim + dust capture.
/// @dev V1 float router — upgrade later to V2 with dynamic routing if desired.
contract RefineEngineV1_Float is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/

    struct Bucket {
        address to;
        uint16 bps;      // share in basis points
        bool active;
        string label;
    }

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/

    IERC20 public immutable DUN;

    // 10,000 basis points = 100%
    uint16 public constant BPS_DENOM = 10_000;

    // 1 whole DUN assuming 18 decimals
    uint256 public constant WHOLE = 1e18;

    // Phoenix Vault / Protocol Treasury
    address public immutable phoenixVault;

    // Protocol skim in basis points (max 20%)
    uint16 public protocolSkimBps;

    Bucket[] public buckets;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BucketAdded(uint256 indexed index, address to, uint16 bps, string label);
    event BucketUpdated(uint256 indexed index, address to, uint16 bps, bool active);
    event Refined(address indexed user, uint256 amount, uint256 skim);
    event ProtocolSkimUpdated(uint16 oldBps, uint16 newBps);

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _dun,
        address _phoenixVault,
        address _owner
    ) {
        require(_dun != address(0), "DUN=0");
        require(_phoenixVault != address(0), "Vault=0");
        require(_owner != address(0), "Owner=0");

        DUN = IERC20(_dun);
        phoenixVault = _phoenixVault;

        _transferOwnership(_owner);
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function bucketCount() external view returns (uint256) {
        return buckets.length;
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    function addBucket(
        address to,
        uint16 bps,
        bool active,
        string calldata label
    ) external onlyOwner {
        require(to != address(0), "to=0");
        require(bps > 0, "bps=0");

        buckets.push(Bucket({
            to: to,
            bps: bps,
            active: active,
            label: label
        }));

        emit BucketAdded(buckets.length - 1, to, bps, label);
    }

    function updateBucket(
        uint256 index,
        address to,
        uint16 bps,
        bool active
    ) external onlyOwner {
        require(index < buckets.length, "bad index");
        require(to != address(0), "to=0");

        Bucket storage b = buckets[index];
        b.to = to;
        b.bps = bps;
        b.active = active;

        emit BucketUpdated(index, to, bps, active);
    }

    function setProtocolSkim(uint16 bps) external onlyOwner {
        require(bps <= 2000, "Too high"); // max 20%

        uint16 old = protocolSkimBps;
        protocolSkimBps = bps;

        emit ProtocolSkimUpdated(old, bps);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                          CORE LOGIC
    //////////////////////////////////////////////////////////////*/

    function refine(uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        require(amount >= WHOLE, "Dust");

        DUN.safeTransferFrom(msg.sender, address(this), amount);

        uint256 skim = (amount * protocolSkimBps) / BPS_DENOM;
        uint256 remainder = amount - skim;

        if (skim > 0) {
            DUN.safeTransfer(phoenixVault, skim);
        }

        uint256 totalBps;
        for (uint256 i = 0; i < buckets.length; i++) {
            if (buckets[i].active) {
                totalBps += buckets[i].bps;
            }
        }

        require(totalBps > 0, "No active buckets");

        for (uint256 i = 0; i < buckets.length; i++) {
            Bucket memory b = buckets[i];
            if (!b.active) continue;

            uint256 share = (remainder * b.bps) / totalBps;
            if (share > 0) {
                DUN.safeTransfer(b.to, share);
            }
        }

        emit Refined(msg.sender, amount, skim);
    }
}
