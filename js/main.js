'use strict';

/*** ==================== 声明变量 ==================== ***/
var pixi;
const resources = [ // 需要使用的素材文件的位置和名称
    // 图像资源-游戏画面
    { name: 'tap',         url: './img/Tap.png' },
    { name: 'tapHl',       url: './img/TapHL.png' },
    { name: 'tap2',        url: './img/Tap2.png' },
    { name: 'drag',        url: './img/Drag.png' },
    { name: 'dragHl',      url: './img/DragHL.png' },
    { name: 'holdHead',    url: './img/HoldHead.png' },
    { name: 'holdHeadHl',  url: './img/HoldHeadHL.png' },
    { name: 'holdBody',    url: './img/Hold.png' },
    { name: 'holdBodyHl',  url: './img/HoldHL.png' },
    { name: 'holdEnd',     url: './img/HoldEnd.png' },
    { name: 'holdEndHl',   url: './img/HoldEndHL.png' },
    { name: 'flick',       url: './img/Flick.png' },
    { name: 'flickHl',     url: './img/FlickHL.png' },
    { name: 'judgeLine',   url: './img/JudgeLine.png' },
    { name: 'progressBar', url: './img/ProgressBar.png' },
    { name: 'songNameBar', url: './img/SongsNameBar.png' },
    { name: 'clickRaw',    url: './img/clickRaw128.png' },
    // 图像资源-判定图标
    { name: 'judgeIconFalse', url: './img/judgeIcons/false.png' },
    { name: 'judgeIconC',     url: './img/judgeIcons/c.png' },
    { name: 'judgeIconB',     url: './img/judgeIcons/b.png' },
    { name: 'judgeIconA',     url: './img/judgeIcons/a.png' },
    { name: 'judgeIconS',     url: './img/judgeIcons/s.png' },
    { name: 'judgeIconV',     url: './img/judgeIcons/v.png' },
    { name: 'judgeIconPhi',   url: './img/judgeIcons/phi.png' },
    // 声音资源-打击音
    { name: 'hitsoundTap',   url: './sound/Hitsound-Tap.ogg' },
    { name: 'hitsoundDrag',  url: './sound/Hitsound-Drag.ogg' },
    { name: 'hitsoundFlick', url: './sound/Hitsound-Flick.ogg' },
    // 声音资源-BGM
    { name: 'levelOverEasy',    url: './sound/levelOver/ez.ogg' },
    { name: 'levelOverHard',    url: './sound/levelOver/hd.ogg' },
    { name: 'levelOverInsane',  url: './sound/levelOver/in.ogg' },
    { name: 'levelOverAnother', url: './sound/levelOver/at.ogg' },
    { name: 'levelOverSpecial', url: './sound/levelOver/sp.ogg' }
];

/*** ==================== 声明监听器 ==================== ***/
window.addEventListener('resize', function () {
    if (!pixi) return;
    pixi.renderer.resize(this.document.documentElement.clientWidth, document.documentElement.clientHeight);


});

/*** ==================== 全局初始化 ==================== ***/
(async () => {
    pixi = new PIXI.Application({ // 创建舞台和 Renderer
        width       : document.documentElement.clientWidth,
        height      : document.documentElement.clientHeight,
        antialias   : true,
        autoDensity : true,
        resolution  : window.devicePixelRatio,
        view        : document.getElementById('stage')
    });

    pixi.loader.add(resources)
        .load((e) => {

        })
        .onProgress((e) => {
            console.log(e);
        }
    );
})();