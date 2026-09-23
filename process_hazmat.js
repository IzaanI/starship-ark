const { Jimp } = require('jimp');

async function processHazmat() {
    const img = await Jimp.read('hazmat_bases.jpg');
    const width = img.bitmap.width;
    const height = img.bitmap.height;
    console.log('Loaded hazmat_bases.jpg:', width, 'x', height);

    const data = img.bitmap.data;
    const visited = new Uint8Array(width * height);
    const queue = [];

    function isBlack(x, y) {
        const idx = (y * width + x) * 4;
        return data[idx] < 20 && data[idx + 1] < 20 && data[idx + 2] < 20;
    }

    // Seed edges
    for (let x = 0; x < width; x++) {
        if (isBlack(x, 0)) { queue.push(x, 0); visited[x] = 1; }
        if (isBlack(x, height - 1)) { queue.push(x, height - 1); visited[(height - 1) * width + x] = 1; }
    }
    for (let y = 0; y < height; y++) {
        if (isBlack(0, y) && !visited[y * width]) { queue.push(0, y); visited[y * width] = 1; }
        if (isBlack(width - 1, y) && !visited[y * width + (width - 1)]) { queue.push(width - 1, y); visited[y * width + (width - 1)] = 1; }
    }

    let head = 0;
    while (head < queue.length) {
        const x = queue[head++];
        const y = queue[head++];
        const idx = (y * width + x) * 4;
        data[idx + 3] = 0; // Transparent

        const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        for (let i = 0; i < neighbors.length; i++) {
            const nx = neighbors[i][0];
            const ny = neighbors[i][1];
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (!visited[nIdx] && isBlack(nx, ny)) {
                    visited[nIdx] = 1;
                    queue.push(nx, ny);
                }
            }
        }
    }

    img.write('hazmat_bases.png');
    console.log('Successfully saved hazmat_bases.png via boundary flood-fill!');
}

processHazmat();
