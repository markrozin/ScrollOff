// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ScreenTimeChallenge.sol";

contract DeployTestnetScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        address mockUsdc = 0xfB5a512B8a16ae11d3A4Fd0Cfca068656d3cb414;

        vm.startBroadcast(deployerKey);

        // Deploy ScreenTimeChallenge pointing to existing MockUSDC
        ScreenTimeChallenge challenge = new ScreenTimeChallenge(
            mockUsdc,
            vm.addr(deployerKey)
        );

        console.log("MockUSDC:", mockUsdc);
        console.log("ScreenTimeChallenge:", address(challenge));
        console.log("Reporter:", vm.addr(deployerKey));

        vm.stopBroadcast();
    }
}
