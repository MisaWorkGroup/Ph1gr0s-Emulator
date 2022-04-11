'use strict';

/*** ==================== 声明变量 ==================== ***/
var pixi;
var textures = {};
var sprites = {};
var chart = {};
var zipFiles = {};
var songList = {};
var selectedSong = null;
const doms = {
    loadingPage     : document.querySelector('.game-loading'),
    loadingProgress : document.querySelector('.game-loading .progress'),

    selectSongPage        : document.querySelector('.select-song'),
    selectSongImportInput : document.querySelector('.select-song .song-list .header .actions input.import-file-input'),
    selectSongImportBtn   : document.querySelector('.select-song .song-list .header .actions button.import-file'),

    selectedSong : document.querySelector('.select-song .selected-song'),
    songList     : document.querySelector('.select-song .song-list .content'),

    songHigestScore : document.querySelector('.select-song .song-extra-info .song-higest-score'),
    songNoteDesigner : document.querySelector('.select-song .song-extra-info .song-chart-designer'),

    songLoadingDiffType  : document.querySelector('.select-song .song-loading-info .diff-info .diff-type'),
    songLoadingDiffValue : document.querySelector('.select-song .song-loading-info .diff-info .diff-value'),
    songLoadingTitle     : document.querySelector('.select-song .song-loading-info .song-info .title'),
    songLoadingSubtitle  : document.querySelector('.select-song .song-loading-info .song-info .subtitle')
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
doms.loadingPage.addEventListener('click', () => {
    if (doms.loadingPage.classList.contains('loaded')) {
        showSongListScreen();
    }
});

// 监听导入文件按钮被按下
doms.selectSongImportBtn.addEventListener('click', () => {
    doms.selectSongImportInput.click();
});
// 监听导入新文件
doms.selectSongImportInput.addEventListener('input', () => {
    let file = doms.selectSongImportInput.files[0];
    if (!file) return;
    LoadZip(file);
});

// 监听歌曲列表滚动事件
doms.songList.addEventListener('scroll', (e) => {
    let items = doms.songList.childNodes;
    for (let item of items) {
        if (!(item instanceof HTMLElement)) continue;
        if (-20 <= (doms.songList.scrollTop - item.offsetTop) && (doms.songList.scrollTop - item.offsetTop) <= 20) {
            if (doms.songList.currentSelected == item) break;
            selectSong(songList[item.getAttribute('song')]);

            doms.songList.currentSelected = item;
            break;
        }
    }
});


/*** ==================== 全局初始化 ==================== ***/
(async () => {
    // 加载多语言文件到变量中
    for (let name in langFiles) {
        let response = await fetch(langFiles[name]);
        response = await response.json();
        langFiles[name] = {};
        langFiles[name].translation = response;
    }

    // 初始化多语言框架 https://github.com/i18next/i18next
    await i18next.init({
        lng: 'zh_cn',
        debug: true,
        compatibilityJSON: 'v3',
        resources: langFiles
    });

    // 清空语言文件变量
    langFiles = undefined;
    // 自动切换语言
    await switchLanguage(undefined);

    // 创建舞台和 Renderer
    pixi = new PIXI.Application({
        width       : document.documentElement.clientWidth,
        height      : document.documentElement.clientHeight,
        antialias   : true,
        autoDensity : true,
        resolution  : window.devicePixelRatio,
        view        : document.getElementById('stage')
    });

    // 稍等片刻后加载程序所需的所有资源
    setTimeout(() => {
        pixi.loader.add(resources)
            .load((e) => {
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
                doms.loadingPage.classList.remove('fade-in');
                doms.loadingPage.classList.add('loaded');
            })
            .onProgress.add((e) => { // 推送加载进度到加载画面
                doms.loadingProgress.style.setProperty('--content', '\'' + i18next.t('game_init.loading_resources', { progress: Math.ceil(e.progress) }) + '\'');
                doms.loadingProgress.style.setProperty('--progress', e.progress + '%');
            }
        );
    }, 1000);

    ResizeWindow();
    doms.songList.scrollTo(0, 0);
})();

// 加载并解析 ZIP 文件
function LoadZip(file) {
    let reader = new FileReader();
    let zip = new JSZip(); // https://github.com/Stuk/jszip

    reader.addEventListener('loadend', () => {
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

                // 清空 zipFiles
                zipFiles = {
                    info: null,
                    line: null,
                    charts: {},
                    images: {},
                    audios: {}
                };

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

                    } catch (e) {
                        console.error(e);
                    }
                }

                doms.selectSongImportBtn.disabled = false;
                doms.selectSongImportBtn.innerHTML = i18next.t('string.import_file');

                if (!zipFiles.info) {
                    alert('缺少 info.csv，无法读取文件！');
                    return;
                }

                // 全部文件解析完毕后
                for (let info of zipFiles.info) {
                    let diffPattern = /^([a-zA-Z]+) Lv\.([\d|\?]+)$/;
                    let diffs = diffPattern.exec(info.Level);
                    let songName = Date.now() + '_' + encodeURIComponent(info.Chart);
                    let song = {
                        name: info.Name,
                        artist: info.Artist || 'Unknown',
                        designer: info.Designer,
                        chart: zipFiles.charts[info.Chart],
                        background: zipFiles.images[info.Image],
                        music: zipFiles.audios[info.Music]
                    };

                    if (!(song.chart instanceof Object)) continue;
                    
                    if (diffs && diffs.length == 3) {
                        switch (diffs[1].toLowerCase()) {
                            case 'ez': {
                                song.diffType = 'easy';
                                break;
                            }
                            case 'hd': {
                                song.diffType = 'hard';
                                break;
                            }
                            case 'in': {
                                song.diffType = 'insane';
                                break;
                            }
                            case 'at': {
                                song.diffType = 'another';
                                break;
                            }
                            case 'sp': {
                                song.diffType = 'special';
                                break;
                            }
                            case 'legacy': {
                                song.diffType = 'legacy';
                                break;
                            }
                            default: {
                                song.diffType = 'insane';
                            }
                        }

                        if (!isNaN(Number(diffs[2]))) {
                            song.diffValue = Number(diffs[2]);
                        } else {
                            song.diffValue = -1;
                        }
                    } else {
                        song.diffType = 'insane';
                        song.diffValue = -1;
                    }

                    songList[songName] = song;
                    addSong(songName, song);
                }
            })
            .catch((e) => {

            }
        );
    });

    if (file.type.toLowerCase().indexOf('zip') < 0) {
        alert(i18next.t('select_song.not_correct_file'));
        return;
    }

    doms.selectSongImportBtn.disabled = true;
    doms.selectSongImportBtn.innerHTML = '<div class="loading center"></div>';
    reader.readAsArrayBuffer(file);
}



function switchLanguage(lang = 'zh_cn') {
    return new Promise((resolve, reject) => {
        i18next.changeLanguage(lang)
            .then((t) => {
                let langDoms = document.querySelectorAll('[i18n]');
                let langDomsContent = document.querySelectorAll('[i18n-content]');
                for (let langDom of langDoms) {
                    langDom.innerHTML = t(langDom.getAttribute('i18n'));
                }
                for (let langDom of langDomsContent) {
                    langDom.style.setProperty('--content', '\'' + t(langDom.getAttribute('i18n-content')) + '\'');
                }
                resolve(true);
            })
            .catch((e) => {
                alert('There\'s an error while switch the language.');
                console.error(e);
                reject(e);
            }
        );
    });
}



function showSongListScreen() {
    doms.loadingPage.classList.add('fade-out');

    setTimeout(() => {
        doms.loadingPage.style.display = 'none';

        doms.selectSongPage.style.display = 'block';
        doms.selectSongPage.classList.add('fade-in');

        setTimeout(() => {
            
        }, 1000);
    }, 1000);
}

function addSong(songName, songInfo) {
    let isListEmpty = (doms.songList.childNodes.length <= 0);
    let songItem = document.createElement('div');

    songItem.className = 'list-item';
    songItem.innerHTML = `<div class="title">${songInfo.name}</div>
    <div class="subtitle">${songInfo.artist}</div>
    <div class="subtitle">${songInfo.diffType.toUpperCase()} Lv.${songInfo.diffValue <= 0 ? '?' : songInfo.diffValue}</div>`;

    songItem.setAttribute('song', songName);

    doms.songList.appendChild(songItem);

    for (let item of doms.songList.childNodes) {
        if (!(item instanceof HTMLElement)) continue;
        item.onclick = function () {
            doms.songList.scrollTo(0, item.offsetTop);
        }
    }

    if (isListEmpty) {
        doms.songList.classList.remove('no-items');
        doms.songList.scrollTo(0, 0);
    }
}

function selectSong(songInfo) {
    if (!(songInfo instanceof Object)) return;
    if (songInfo == selectedSong) return;
    switchSongBg(songInfo, selectedSong);
    selectedSong = songInfo;
    setSelectedSong(selectedSong);

    function switchSongBg(newSong, oldSong) {
        let newBgUrl = newSong.background.baseTexture.resource.url;
        let oldBgUrl = oldSong ? oldSong.background.baseTexture.resource.url : '';
        if (newBgUrl != oldBgUrl) doms.selectSongPage.style.backgroundImage = 'url(' + newBgUrl + ')';
    }
}

function setSelectedSong(obj) {
    let songInfo = document.querySelector('.select-song .selected-song .song-info') || document.createElement('div');
    let songDiff = document.querySelector('.select-song .selected-song .song-diff') || document.createElement('div');
    let songInfoTitle = document.querySelector('.select-song .selected-song .song-info .title') || document.createElement('div');
    let songInfoSubtitle = document.querySelector('.select-song .selected-song .song-info .subtitle') || document.createElement('div');
    let songDiffType = document.querySelector('.select-song .selected-song .song-diff .diff-type') || document.createElement('div');
    let songDiffValue = document.querySelector('.select-song .selected-song .song-diff .diff-value') || document.createElement('div');

    songInfoTitle.innerHTML = obj.name;
    songInfoSubtitle.innerHTML = obj.artist;

    songDiffType.innerHTML = obj.diffType.toUpperCase() + ' Lv.';
    songDiffValue.innerHTML = obj.diffValue <= 0 ? '?' : obj.diffValue;

    songDiff.className = 'song-diff level-' + obj.diffType;

    doms.songHigestScore.innerHTML = i18next.t('string.high_score') + '暂无';
    doms.songNoteDesigner.innerHTML = i18next.t('string.note_designer') + obj.designer;

    if (!document.querySelector('.select-song .selected-song .song-info') || !document.querySelector('.select-song .selected-song .song-diff')) {

        songInfo.className = 'song-info';

        songInfoTitle.className = 'title';
        songInfoSubtitle.className = 'subtitle';

        songDiffType.className = 'diff-type';
        songDiffValue.className = 'diff-value';

        doms.selectedSong.innerHTML = '';
        doms.selectedSong.appendChild(songInfo);
        doms.selectedSong.appendChild(songDiff);

        songInfo.appendChild(songInfoTitle);
        songInfo.appendChild(songInfoSubtitle);

        songDiff.appendChild(songDiffValue);
        songDiff.appendChild(songDiffType);
    }
}

function startGame() {
    if (!selectedSong) {
        alert(i18next.t('string.select_song_first'));
        return;
    }

    doms.songLoadingDiffType.parentNode.classList.add('level-' + selectedSong.diffType);

    doms.songLoadingDiffType.innerHTML = selectedSong.diffType.toUpperCase();
    doms.songLoadingDiffValue.innerHTML = selectedSong.diffValue <= 0 ? '?' : selectedSong.diffValue;

    doms.songLoadingTitle.innerHTML = selectedSong.name;
    doms.songLoadingSubtitle.innerHTML = selectedSong.artist;

    doms.selectSongPage.classList.remove('fade-in');
    doms.selectSongPage.classList.add('song-loading');
}