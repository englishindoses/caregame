// Two face-down cards matching Memory's sage-and-cream heart backs.
function makeMemoryTileTexture(scene) {
    if (scene.textures.exists('memory_tile')) return;
    const target = scene.add.renderTexture(-400, -400, 300, 300);
    const pieces = [];
    [{ x: 28, y: 58 }, { x: 128, y: 102 }].forEach(({ x, y }) => {
        const g = scene.add.graphics();
        g.fillStyle(0x9B735B, 0.18).fillRoundedRect(x + 3, y + 8, 144, 144, 18);
        g.fillStyle(0xB4CAB5).fillRoundedRect(x, y, 144, 144, 18);
        g.lineStyle(4, 0xFFF8EC).strokeRoundedRect(x + 7, y + 7, 130, 130, 13);
        pieces.push(g);
        pieces.push(scene.add.text(x + 72, y + 72, '\u2665', {
            fontFamily: 'Arial, sans-serif', fontSize: '60px', color: '#fff8ec',
        }).setOrigin(0.5));
    });
    pieces.forEach(piece => target.draw(piece));
    target.saveTexture('memory_tile');
    pieces.forEach(piece => piece.destroy());
    target.destroy();
}
