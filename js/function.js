
function ResizeWindow() {
    window.realWidth = document.documentElement.clientWidth;
    window.realHeight = document.documentElement.clientHeight;

    window.fixedWidth = realHeight / 9 * 16 < realWidth ? realHeight / 9 * 16 : realWidth;
    window.fixedWidthPercent = fixedWidth / 18;
    window.fixedWidthOffset = (realWidth - fixedWidth) / 2;

    window.noteSpeed = realHeight * 0.6;
    window.noteSclae = fixedWidth / settings.noteSclae;
    window.lineScale = fixedWidth > realHeight * 0.75 ? realHeight / 18.75 : fixedWidth / 14.0625;

    document.body.style.setProperty('--line-scale', window.lineScale);
    
    if (pixi) {
        pixi.renderer.resize(window.realWidth, window.realHeight);
    }
}