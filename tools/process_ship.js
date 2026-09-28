const { Jimp } = require('jimp');
const path = require('path');

async function processShipCutaway() {
    const inputPath = path.join(__dirname, '../assets/phase2/starship_cutaway_raw.jpg');
    const outputPath = path.join(__dirname, '../assets/phase2/starship_cutaway.png');
    console.log(`Reading ${inputPath}...`);
    const img = await Jimp.read(inputPath);
    const width = img.bitmap.width;
    const height = img.bitmap.height;
    const data = img.bitmap.data;

    console.log(`Image dimensions: ${width} x ${height}`);

    const visited = new Uint8Array(width * height);
    const queue = [];

    // Check if pixel is outer black background
    function isOuterBlack(x, y) {
        const idx = (y * width + x) * 4;
        // Background black threshold
        return data[idx] < 12 && data[idx + 1] < 12 && data[idx + 2] < 12;
    }

    // Seed edges from all four boundaries
    for (let x = 0; x < width; x++) {
        if (isOuterBlack(x, 0)) { queue.push(x, 0); visited[x] = 1; }
        if (isOuterBlack(x, height - 1)) { queue.push(x, height - 1); visited[(height - 1) * width + x] = 1; }
    }
    for (let y = 0; y < height; y++) {
        if (isOuterBlack(0, y) && !visited[y * width]) { queue.push(0, y); visited[y * width] = 1; }
        if (isOuterBlack(width - 1, y) && !visited[y * width + (width - 1)]) { queue.push(width - 1, y); visited[y * width + (width - 1)] = 1; }
    }

    console.log(`Starting boundary flood fill with ${queue.length / 2} seed pixels...`);

    let head = 0;
    let transparentCount = 0;

    while (head < queue.length) {
        const x = queue[head++];
        const y = queue[head++];
        const idx = (y * width + x) * 4;

        // Set alpha to 0 (fully transparent)
        data[idx + 3] = 0;
        transparentCount++;

        // 4-way flood fill
        const neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1]
        ];

        for (let i = 0; i < neighbors.length; i++) {
            const nx = neighbors[i][0];
            const ny = neighbors[i][1];
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (!visited[nIdx] && isOuterBlack(nx, ny)) {
                    visited[nIdx] = 1;
                    queue.push(nx, ny);
                }
            }
        }
    }

    console.log(`Flood fill complete! Total pixels transparentized: ${transparentCount} (${((transparentCount / (width * height)) * 100).toFixed(1)}%)`);

    await img.write(outputPath);
    console.log("Successfully written starship_cutaway.png!");
}

processShipCutaway().catch(err => {
    console.error("Error processing ship:", err);
});
