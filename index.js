const fs = require('fs');
const config = require('./config.json');

// Xbox Game Pass catalog SIGL IDs (Subscription Item Group List)
const SIGL_IDS = {
    console: 'fdd9e2a7-0fee-49f6-ad69-4354098401ff',
    pc: 'b8900d09-a491-44cc-916e-32b5acae621b'
};

async function fetchGameIds(platform, market, language) {
    const siglId = SIGL_IDS[platform];
    const url = `https://catalog.gamepass.com/sigls/v2?id=${siglId}&language=${language}&market=${market}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`SIGL fetch failed: ${response.status}`);
    const data = await response.json();
    return data.filter(item => item.id).map(item => item.id);
}

async function fetchGameDetails(ids, market, language) {
    const chunkSize = 20;
    const chunks = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize));
    }
    const results = await Promise.all(chunks.map(async chunk => {
        const url = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${chunk.join(',')}&market=${market}&languages=${language}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Products fetch failed: ${response.status}`);
        const data = await response.json();
        return data.Products || [];
    }));
    return results.flat();
}

function formatGame(product, includedProperties) {
    const result = {};
    if (includedProperties.productTitle) {
        result.productTitle = product.LocalizedProperties?.[0]?.ProductTitle || '';
    }
    return result;
}

async function main() {
    if (!fs.existsSync('./output')) fs.mkdirSync('./output');

    for (const market of config.markets) {
        for (const platform of config.platformsToFetch) {
            console.log(`Fetching ${platform} games for market ${market}...`);
            const ids = await fetchGameIds(platform, market, config.language);
            const products = await fetchGameDetails(ids, market, config.language);
            const formatted = products.map(p => formatGame(p, config.includedProperties));
            const outPath = `./output/formattedGameProperties_${platform}_${market}.json`;
            fs.writeFileSync(outPath, JSON.stringify(formatted, null, 2));
            console.log(`Wrote ${formatted.length} games to ${outPath}`);
        }
    }
}

main().catch(err => { console.error(err); process.exit(1); });
