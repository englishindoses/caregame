// Picture-based tile drawn from existing item art; no new icon asset.
function makeMemoryTileTexture(scene) {
    if (scene.textures.exists('memory_tile')) return;
    const target = scene.add.renderTexture(-400, -400, 300, 300);
    const pieces = [];
    [90, 210].forEach((x, i) => {
        const g = scene.add.graphics();
        g.fillStyle(0xB98B68, 0.2).fillRoundedRect(x - 67, 84, 134, 158, 20);
        g.fillStyle(0xFFF8EC).fillRoundedRect(x - 67, 75, 134, 158, 20);
        g.lineStyle(5, i ? 0xDFA49B : 0xA8BFA4).strokeRoundedRect(x - 67, 75, 134, 158, 20);
        pieces.push(g);
        const img = scene.add.image(x, 154, 'item_ball');
        img.setScale(112 / Math.max(img.width, img.height));
        pieces.push(img);
    });
    pieces.forEach(piece => target.draw(piece));
    target.saveTexture('memory_tile');
    pieces.forEach(piece => piece.destroy());
    target.destroy();
}
