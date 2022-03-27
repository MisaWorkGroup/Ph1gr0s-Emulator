'use strict';

/*** ==================== 声明变量 ==================== ***/
var pixi;
var textures = {};
var sprites = {};
var chart = {};
var zipFiles = {
    info: null,
    line: null,
    charts: {},
    images: {},
    audios: {}
};
const doms = {
    touchToStart: document.querySelector('.game-screen.touch-to-start'),
    touchToStartInfo: document.querySelector('.game-screen.touch-to-start .touch-to-start-prompt'),
    fileInput: document.querySelector('.game-screen.touch-to-start .touch-to-start-input'),
    selectFile: document.querySelector('.game-screen.select-files')
};
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
// 监听窗口尺寸被改变
window.addEventListener('resize', ResizeWindow);

// 监听 Touch To Start 被按下
doms.touchToStart.addEventListener('click', () => {
    if (doms.touchToStart.getAttribute('disabled') == 'true') return;
    doms.fileInput.click();
});

// 监听选择外部文件事件
doms.fileInput.addEventListener('input', () => {
    if (doms.fileInput.files.length <= 0 || !doms.fileInput.files[0]) return;
    LoadZip(doms.fileInput.files[0]);
});

/*** ==================== 全局初始化 ==================== ***/
(async () => {
    let loadingDetailDom = document.querySelector('.game-screen.loading .loading-detail');

    pixi = new PIXI.Application({ // 创建舞台和 Renderer
        width       : document.documentElement.clientWidth,
        height      : document.documentElement.clientHeight,
        antialias   : true,
        autoDensity : true,
        resolution  : window.devicePixelRatio,
        view        : document.getElementById('stage')
    });

    setTimeout(() => { // 稍等片刻后加载程序所需的所有资源
        pixi.loader.add(resources)
            .load((e) => {
                loadingDetailDom.innerHTMl = '';

                // 归档加载的素材到指定位置
                for (let name in e.resources) {
                    let resource = e.resources[name];

                    if (name.indexOf('hitsound') >= 0) {
                        // 处理游戏中的各种音效
                        if (!(textures.sound instanceof Object)) textures.sound = {};
                        if (!(textures.sound.hitsound instanceof Object)) textures.sound.hitsound = {};

                        let realName = name.replace('hitsound', '').toLowerCase();
                        textures.sound.hitsound[realName] = resource.sound;

                    } else if (name.indexOf('levelOver') >= 0) {
                        // 处理游戏结束时的结算音乐
                        if (!(textures.sound instanceof Object)) textures.sound = {};
                        if (!(textures.sound.levelOver instanceof Object)) textures.sound.levelOver = {};

                        let realName = name.replace('levelOver', '').toLowerCase();
                        textures.sound.levelOver[realName] = resource.sound;

                    } else if (name.indexOf('clickRaw') >= 0) {
                        // 处理单击动画雪碧图。会先将图片拆分成 30 张大小一样的小贴图，然后以数组的形式存储在素材变量中
                        let clickTextures = [];

                        for (let i = 0; i < Math.floor(resource.texture.height / resource.texture.width); i++) {
                            let rectangle = new PIXI.Rectangle(0, i * resource.texture.width, resource.texture.width, resource.texture.width);
                            let texture = new PIXI.Texture(resource.texture.baseTexture, rectangle);

                            clickTextures.push(texture);
                        }

                        textures.clickRaw = clickTextures;

                    } else if (name.indexOf('judgeIcon') >= 0) {
                        // 处理结算等级贴图
                        if (!(textures.judgeIcon instanceof Object)) textures.judgeIcon = {};

                        let realName = name.replace('judgeIcon', '').toLowerCase();
                        textures.judgeIcon[realName] = resource.texture;

                    } else {
                        // 处理游戏画面需要使用的各种素材
                        textures[name] = resource.texture;
                    }
                }

                // 显示 Touch To Start
                doms.touchToStart.style.display = 'block';
                doms.touchToStart.classList.add('fade-in');

                // 播放加载画面消失动画并在播放完毕后移除它
                loadingDetailDom.parentNode.classList.remove('fade-in');
                loadingDetailDom.parentNode.classList.add('fade-out');
                setTimeout(() => {
                    loadingDetailDom.parentNode.style.display = 'none';
                }, 1000);
            })
            .onProgress.add((e) => { // 推送加载进度到加载画面
                loadingDetailDom.innerHTML = e.progress.toFixed(0) + '%';
            }
        );
    }, 1000);

    ResizeWindow();
})();

// 加载并解析 ZIP 文件
function LoadZip(file) {
    let reader = new FileReader();
    let zip = new JSZip(); // https://github.com/Stuk/jszip

    reader.addEventListener('loadend', () => {
        doms.touchToStartInfo.innerHTML = '正在解析压缩文件 0%...';

        zip.loadAsync(reader.result)
            .then(async (e) => {
                const imageFormat = ('jpeg,jpg,gif,png,webp').split(',');
                const audioFormat = ('aac,flac,mp3,ogg,wav,webm').split(',');
                let _files = e.files;
                let files = [];
                let fileLoadedCount = 0;

                for (let name in _files) {
                    // 第一轮处理，将文件的格式、真实名称和是否是隐藏文件表示出来
                    // 其实这种写法个人感觉有些麻烦了，但是又不知道有没有什么简单的写法...

                    let  file = _files[name];
                    let realName, format, isHidden;

                    if (file.dir) continue;

                    realName = file.name.split('/');
                    realName = realName[realName.length - 1];

                    format = realName.split('.');
                    format = format[format.length - 1];

                    isHidden = realName.indexOf('.') == 0;

                    file.realName = realName;
                    file.format = format;
                    file.isHidden = isHidden;

                    files.push(file);
                }

                for (let file of files) {
                    try {
                        fileLoadedCount++;

                        if (file.name === 'info.csv') {
                            // 解析谱面包信息文件
                            let info = await file.async('text');
                            info = Csv2Array(info, true);
                            zipFiles.info = info;

                        } else if (file.name === 'line.csv') {
                            // 解析谱面包判定线贴图定义文件
                            let line = await file.async('text');
                            line = Csv2Array(line, true);
                            zipFiles.line = line;

                        } else if (imageFormat.indexOf(file.format) >= 0) {
                            // 解析图片文件
                            let texture = await (new PIXI.Texture.fromURL('data:image/' + file.format + ';base64,' + (await file.async('base64'))));
                            zipFiles.images[file.name] = texture;

                        } else if (audioFormat.indexOf(file.format) >= 0) {
                            // 解析音频文件
                            let audio = await (new PIXI.sound.Sound.from({
                                url: 'data:audio/' + file.format + ';base64,' + (await file.async('base64')),
                                preload: true
                            }));
                            zipFiles.audios[file.name] = audio;

                        } else if (file.format == 'json') {
                            // 解析 JSON 格式的官方谱面文件
                            let chart = await file.async('text');
                            chart = JSON.parse(chart);
                            chart = ConvertChartVersion(chart);
                            zipFiles.charts[file.name] = chart;

                        } else if (file.format == 'pec') {
                            // 解析 PEC 格式的 PhiEditor 谱面文件
                            let chart = await file.async('text');
                            chart = ConvertPEC2Json(chart, file.name);
                            chart = ConvertChartVersion(chart);
                            zipFiles.charts[file.name] = chart;

                        } else {
                            // 不支持的文件
                            
                        }

                        // 推送文件读取进度到 UI
                        doms.touchToStartInfo.innerHTML = '正在读取压缩文件 ' + (fileLoadedCount / files.length * 100).toFixed(0) + '%...';

                    } catch (e) {
                        console.error(e);
                    }
                }


                // 全部文件解析完毕后，隐藏 Touch To Start ...
                doms.touchToStart.classList.remove('fade-in');
                doms.touchToStart.classList.add('fade-out');
                setTimeout(() => { doms.touchToStart.style.display = 'none' }, 1000);

                // ...然后显示文件显示窗口
                doms.selectFile.style.display = 'block';
                doms.selectFile.classList.add('fade-in');
            })
            .catch((e) => {

            }
        );
    });

    if (file.type.toLowerCase().indexOf('zip') < 0) {
        alert('请选择正确的 .zip 文件！');
        return;
    }

    doms.touchToStart.setAttribute('disabled', true);
    doms.touchToStartInfo.innerHTML = '正在读取压缩文件...';
    reader.readAsArrayBuffer(file);
}