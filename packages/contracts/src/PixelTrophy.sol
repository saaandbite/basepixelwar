// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PixelTrophy is ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 public tokenCounter;
    address public tournamentContract;

    constructor() ERC721("PixelWar Trophy", "PWT") Ownable(msg.sender) {
        tokenCounter = 0;
    }

    // --- MODIFIERS ---
    modifier onlyTournament() {
        require(msg.sender == tournamentContract, "Hanya Tournament Contract yang boleh mint!");
        _;
    }

    // --- ADMIN FUNCTIONS ---
    function setTournamentContract(address _contract) external onlyOwner {
        tournamentContract = _contract;
    }

    // --- CORE MINTING LOGIC (Fixed) ---
    // Update fungsi minting untuk menerima RoomID
    function mintTrophy(address winner, uint256 weekNumber, uint256 roomSerial) external onlyTournament {
        uint256 newItemId = tokenCounter;
        
        // Generate Metadata & SVG On-Chain
        string memory finalTokenUri = generateTokenURI(weekNumber, roomSerial);
        
        _safeMint(winner, newItemId);
        _setTokenURI(newItemId, finalTokenUri);
        
        tokenCounter++;
    }

    // --- ON-CHAIN SVG GENERATOR ---
    function generateTokenURI(uint256 weekNumber, uint256 roomSerial) internal pure returns (string memory) {
        // 1. Tentukan Bentuk dan Warna berdasarkan Minggu
        string memory trophyShape;
        string memory color;

        // Logika visual sederhana
        if (weekNumber % 3 == 1) { 
            // Minggu 1, 4, dst: Kotak Emas
            trophyShape = "<rect x='100' y='100' width='150' height='150'"; 
            color = "#FFD700"; 
        } else if (weekNumber % 3 == 2) {
            // Minggu 2, 5, dst: Lingkaran Perak
            trophyShape = "<circle cx='175' cy='175' r='75'"; 
            color = "#C0C0C0"; 
        } else {
            // Minggu 3, 6, dst: Kotak Perunggu (disederhanakan dari polygon agar hemat gas)
            trophyShape = "<rect x='125' y='100' width='100' height='150' rx='20'"; 
            color = "#cd7f32"; 
        }

        // 2. Rakit Gambar SVG
        // Kita menyisipkan 'color' ke dalam 'fill' dan menutup tag shape
        string memory svg = string(abi.encodePacked(
            "<svg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='xMinYMin meet' viewBox='0 0 350 350'>",
            "<style>.base { fill: white; font-family: monospace; font-weight: bold; }</style>",
            "<rect width='100%' height='100%' fill='black' />", // Background Hitam
            trophyShape, " fill='", color, "' />", // Gambar Piala
            "<text x='50%' y='50%' class='base' dominant-baseline='middle' text-anchor='middle' font-size='24'>WEEK ", weekNumber.toString(), "</text>",
            "<text x='50%' y='65%' class='base' dominant-baseline='middle' text-anchor='middle' font-size='16'>SERIAL: ROOM #", roomSerial.toString(), "</text>",
            "</svg>"
        ));

        // 3. Bungkus jadi JSON Metadata (Base64)
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "PixelWar Champion #', weekNumber.toString(), '",',
                        '"description": "Trophy for the winner of Weekly PixelWar Room #', roomSerial.toString(), '",',
                        '"attributes": [{"trait_type": "Week", "value": "', weekNumber.toString(), '"}, {"trait_type": "Room Serial", "value": "', roomSerial.toString(), '"}],',
                        '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}