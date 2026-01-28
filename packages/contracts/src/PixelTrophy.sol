// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PixelTrophy is ERC721, Ownable {
    using Strings for uint256;

    uint256 public tokenCounter;
    address public tournamentContract;

    // --- DATA PENYIMPANAN PART PIXEL ART ---
    string[] public bodies;
    string[] public handles;
    string[] public lids;
    string[] public bases;

    // --- STRUKTUR TEMA WARNA ---
    struct ColorTheme {
        string bg;      // Warna Latar
        string fill;    // Warna Piala
        string text;    // Warna Teks (Kontras)
    }
    ColorTheme[] public themes;

    // --- DATA TOKEN ---
    // Kita simpan data minggunya, bukan URI-nya (Hemat Gas)
    struct TrophyData {
        uint256 weekNumber;
        uint256 roomSerial;
    }
    mapping(uint256 => TrophyData) public trophyDetails;

    constructor() ERC721("PixelWar Trophy", "PWT") Ownable(msg.sender) {
        tokenCounter = 0;

        // ==========================================================
        // 1. SETUP TEMA WARNA (Supaya Kontras Terjamin)
        // ==========================================================
        
        // Tema 0: Classic (Bg Putih, Piala Emas, Teks Hitam)
        themes.push(ColorTheme("#FFFFFF", "#FFD700", "#000000"));
        // Tema 1: Dark Mode (Bg Hitam, Piala Neon Biru, Teks Putih)
        themes.push(ColorTheme("#000000", "#00FFFF", "#FFFFFF"));
        // Tema 2: Royal (Bg Ungu Gelap, Piala Perak, Teks Emas)
        themes.push(ColorTheme("#2E003E", "#C0C0C0", "#FFD700"));
        // Tema 3: Retro (Bg Hijau Gelap, Piala Hijau Muda, Teks Hijau Neon)
        themes.push(ColorTheme("#0D1F0D", "#39FF14", "#CCFFCC"));
        // Tema 4: Sunset (Bg Merah Marun, Piala Oranye, Teks Putih)
        themes.push(ColorTheme("#8B0000", "#FF8C00", "#FFFFFF"));

        // ==========================================================
        // 2. SETUP PIXEL ART PATHS (Grid 32x32)
        // ==========================================================

        // --- BODIES (Badan Piala) ---
        bodies.push("<path d='M10 12 h12 v8 h-1 v1 h-1 v1 h-8 v-1 h-1 v-1 h-1 v-8 Z' />"); // Kotak U
        bodies.push("<path d='M8 12 h16 v2 h-1 v2 h-1 v2 h-1 v1 h-1 v1 h-6 v-1 h-1 v-1 h-1 v-2 h-1 v-2 h-1 v-2 Z' />"); // V Shape
        bodies.push("<path d='M12 10 h8 v12 h-8 Z' />"); // Tabung

        // --- HANDLES (Gagang) ---
        handles.push("<path d='M8 13 h2 v4 h-2 v-4 M22 13 h2 v4 h-2 v-4' />"); // Kuping Kecil
        handles.push("<path d='M6 11 h4 v2 h-2 v4 h2 v2 h-4 v-8 M22 11 h4 v8 h-4 v-2 h2 v-4 h-2 v-2' />"); // Sayap Besar
        handles.push("<path d='M7 14 h3 v1 h-1 v2 h1 v1 h-3 v-4 M22 14 h3 v4 h-3 v-1 h1 v-2 h-1 v-1' />"); // Bulat

        // --- LIDS (Tutup) ---
        lids.push("<path d='M11 11 h10 v-2 h-10 Z M14 9 h4 v-2 h-4 Z' />"); // Datar
        lids.push("<path d='M10 11 h12 v-3 h-2 v-2 h-2 v2 h-4 v-2 h-2 v2 h-2 Z' />"); // Mahkota
        lids.push("<path d='M10 11 h12 v-2 h-2 v-2 h-2 v-2 h-4 v2 h-2 v2 h-2 Z' />"); // Kubah

        // --- BASES (Alas) ---
        bases.push("<path d='M14 22 h4 v2 h4 v2 h-12 v-2 h4 Z' />"); // Standar
        bases.push("<path d='M15 22 h2 v3 h4 v2 h-10 v-2 h4 Z' />"); // Tinggi
        bases.push("<path d='M12 24 h8 v4 h-8 Z' />"); // Kotak Tebal
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

    // --- CORE MINTING LOGIC ---
    // Signature function ini SAMA PERSIS dengan kode lama Anda agar kompatibel
    function mintTrophy(address winner, uint256 weekNumber, uint256 roomSerial) external onlyTournament {
        uint256 newItemId = tokenCounter;
        // Simpan data, nanti gambar di-generate on-the-fly (Hemat Gas)
        trophyDetails[newItemId] = TrophyData(weekNumber, roomSerial);
        
        _safeMint(winner, newItemId);
        tokenCounter++;
    }

    // --- ON-CHAIN SVG ENGINE ---
    function generateSVG(uint256 tokenId) public view returns (string memory) {
        TrophyData memory data = trophyDetails[tokenId];
        
        // 1. Seed Random (Deterministik per minggu)
        uint256 seed = uint256(keccak256(abi.encodePacked(data.weekNumber, "PIXEL_SECRET")));
        
        // 2. Pilih Tema Warna (Rotasi mingguan)
        ColorTheme memory theme = themes[data.weekNumber % themes.length];

        // 3. Pilih Komponen Bentuk (Acak berdasarkan seed mingguan)
        string memory body = bodies[seed % bodies.length];
        string memory lid = lids[(seed / 10) % lids.length];
        string memory handle = handles[(seed / 100) % handles.length];
        string memory base = bases[(seed / 1000) % bases.length];

        // 4. Rakit SVG (Grid 32x32 Pixel Perfect)
        return string(abi.encodePacked(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' shape-rendering='crispEdges'>",
            "<style>",
            ".bg { fill: ", theme.bg, "; }",
            ".trophy { fill: ", theme.fill, "; }",
            ".txt { font-family: monospace; font-size: 3px; font-weight: bold; fill: ", theme.text, "; }",
            "</style>",
            "<rect width='32' height='32' class='bg' />", // Background
            "<g class='trophy'>",
            handle, base, body, lid, // Layering: Belakang -> Depan
            "</g>",
            "<text x='2' y='30' class='txt'>#", data.roomSerial.toString(), "</text>", // Nomor Seri
            "</svg>"
        ));
    }

    // --- TOKEN URI (METADATA) ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // Cek kepemilikan token (Kompatibel dengan OpenZeppelin versi lama dan baru)
        require(_ownerOf(tokenId) != address(0), "Token tidak ditemukan");

        string memory svg = generateSVG(tokenId);
        TrophyData memory data = trophyDetails[tokenId];

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "PixelWar Champion W', data.weekNumber.toString(), '",',
            '"description": "Official Trophy for PixelWar Winner. Week: ', data.weekNumber.toString(), ', Room: ', data.roomSerial.toString(), '",',
            '"attributes": [',
                '{"trait_type": "Week", "value": "', data.weekNumber.toString(), '"},',
                '{"trait_type": "Room Serial", "value": "', data.roomSerial.toString(), '"}',
            '],',
            '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}