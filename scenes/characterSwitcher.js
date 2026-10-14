// Same stacked corner thumbnails as the care game; the host updates its plushie.
function addCharacterSwitcher(scene, onChange) {
    let objects = [];
    const rebuild = () => {
        objects.forEach(o => o.destroy());
        objects = [];
        const size = Math.round(scene.scale.width * 0.14), pad = 10;
        const x = pad + size / 2;
        CHARACTERS.filter(c => c.id !== scene.characterId).forEach((char, i) => {
            const y = pad + size / 2 + i * (size + pad);
            objects.push(scene.add.circle(x, y, size / 2 + 6, 0xFFFFFF, 0.55).setDepth(70));
            const img = scene.textures.exists(char.neutral)
                ? scene.add.image(x, y, char.neutral) : scene.add.circle(x, y, size / 2, char.color);
            if (img.setTexture) img.setScale(size / Math.max(img.width, img.height));
            img.setDepth(71).setInteractive({ useHandCursor: true });
            img.on('pointerdown', () => {
                if (scene._navigationOpen) return;
                scene.characterId = char.id;
                localStorage.setItem('tcm_character', char.id);
                onChange(char);
                rebuild();
            });
            objects.push(img);
        });
    };
    rebuild();
    scene.events.once('shutdown', () => { objects = []; });
    return { rebuild };
}
