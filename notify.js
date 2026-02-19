const fs = require('fs');
const webhook = process.env.DISCORD_WEBHOOK;

const getGames = (f) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)).map(g => g.productTitle) : [];
const oldGames = getGames('./output/old_games.json');

const newGames = [
    ...getGames('./output/formattedGameProperties_console_US.json'),
    ...getGames('./output/formattedGameProperties_pc_US.json')
];

const added = newGames.filter(g => g && !oldGames.includes(g));

if (added.length > 0 && webhook) {
    fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `**New Game Pass Drop:**\n${added.join('\n')}` })
    });
}
if (!fs.existsSync('./output')) fs.mkdirSync('./output');
fs.writeFileSync('./output/old_games.json', JSON.stringify(newGames));
