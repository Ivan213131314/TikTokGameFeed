const fs = require('fs');
const path = require('path');
const https = require('https');

const ICONS_DIR = path.join(__dirname, '../assets/game-icons');
const USERS_ICONS_DIR = path.join(ICONS_DIR, 'users_icons');
const TARGET_COUNT = 30;

// List of 30 game-themed keywords for the "Mix"
const ICON_NAMES = [
    'joystick', 'arcade-machine', 'ghost', 'cherry', 'mushroom',
    'coin', 'bomb', 'pixel-heart', 'star', 'question-mark',
    'sword', 'shield', 'potion', 'scroll', 'key',
    'diamond', 'treasure-chest', 'crown', 'dragon', 'game-controller',
    'rocket', 'laser-gun', 'target', 'trophy', 'racing-flag',
    'lightning-bolt', 'skull', 'dna', 'ufo', 'robot'
];

if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_ICONS_DIR)) {
    fs.mkdirSync(USERS_ICONS_DIR, { recursive: true });
}

// 1. Move existing icons
const moveExistingIcons = () => {
    const files = fs.readdirSync(ICONS_DIR);
    let movedCount = 0;
    files.forEach(file => {
        if (file.startsWith('icon_') && file.endsWith('.png')) {
            const oldPath = path.join(ICONS_DIR, file);
            const newPath = path.join(USERS_ICONS_DIR, file);
            // Overwrite if exists in dest to avoid errors, or skip?
            // Let's just move.
            fs.renameSync(oldPath, newPath);
            movedCount++;
        }
    });
    console.log(`Moved ${movedCount} existing icons to users_icons/`);
};

// 2. Download new icons
const downloadIcon = (name, index) => {
    return new Promise((resolve, reject) => {
        // Using Icons8 for specific objects. 
        // We use common names. If one fails, we might end up with a missing file.
        // Format: https://img.icons8.com/color/96/{name}.png
        const url = `https://img.icons8.com/color/96/${name}.png`;
        const filePath = path.join(ICONS_DIR, `game_icon_${index}.png`);
        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`Downloaded ${name} as game_icon_${index}.png`);
                    resolve(true);
                });
            } else {
                file.close();
                fs.unlink(filePath, () => { });
                console.error(`Error downloading ${name}: Status ${response.statusCode}`);
                resolve(false);
            }
        }).on('error', (err) => {
            fs.unlink(filePath, () => { });
            console.error(`Network error for ${name}`, err);
            resolve(false);
        });
    });
};

const generateIndex = () => {
    const files = fs.readdirSync(ICONS_DIR);
    const validIcons = files.filter(f => f.startsWith('game_icon_') && f.endsWith('.png'));

    // Sort logic to ensure stable order if needed, though they are named with index
    validIcons.sort((a, b) => {
        const numA = parseInt(a.replace('game_icon_', '').replace('.png', ''));
        const numB = parseInt(b.replace('game_icon_', '').replace('.png', ''));
        return numA - numB;
    });

    let content = 'export const GAME_ICONS = [\n';
    validIcons.forEach(file => {
        content += `    require('./${file}'),\n`;
    });
    content += '];\n';

    fs.writeFileSync(path.join(ICONS_DIR, 'index.ts'), content);
    console.log(`Generated index.ts with ${validIcons.length} icons`);
};

const main = async () => {
    moveExistingIcons();

    console.log('Starting new icon downloads...');
    for (let i = 0; i < ICON_NAMES.length; i++) {
        const success = await downloadIcon(ICON_NAMES[i], i);
        if (!success) {
            // Fallback to DiceBear specifically for this index so we don't have gaps?
            // User wanted specific icons. If 'joystick' fails, maybe try 'console'.
            // For now, if it fails, we just don't have it, and generateIndex filters it.
            // But we promised 30.
            // Let's try an alternative source for fallback? 
            // Or just a generic pixel avatar if specific fails.
            console.log(`Fallback for ${ICON_NAMES[i]}...`);
            // Attempt generic
            await new Promise((resolve) => {
                const url = `https://api.dicebear.com/9.x/pixel-art/png?seed=${ICON_NAMES[i]}&size=96`;
                const filePath = path.join(ICONS_DIR, `game_icon_${i}.png`);
                const file = fs.createWriteStream(filePath);
                https.get(url, (res) => {
                    res.pipe(file);
                    file.on('finish', () => { file.close(); resolve(); });
                });
            });
        }
    }

    generateIndex();
    console.log('Done!');
};

main();
