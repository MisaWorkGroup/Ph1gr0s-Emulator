'use strict';

let fileSelector = document.getElementById('input-select-file');
let fileSelectorBtn = document.getElementById('select-file-btn');
let chartSelector = document.getElementById('select-chart-file');
let imageSelector = document.getElementById('select-image-file');
let audioSelector = document.getElementById('select-audio-file');
let gameContainer = document.getElementById('game');

let sprites = {};
let chart = {
    info: null,
    image: null,
    audio: null,
    chart: null
}
let zipData = {
    infos: [],
    line: {},
    images: {},
    audios: {},
    charts: {}
};


fileSelectorBtn.addEventListener('click', () => {
    if (fileSelectorBtn.getAttribute('disabled') == 'true') return;
    fileSelector.click();
});

fileSelector.addEventListener('input', () => {
    let file = fileSelector.files[0];
    let reader = new FileReader();
    let zip = new JSZip();

    if (!file) {
        alert('是不是玩不起？');
        return;
    }

    reader.addEventListener('loadend', () => {
        zip.loadAsync(reader.result)
            .then(async (e) => {
                const imageFormat = ('jpeg,jpg,gif,png,webp').split(',');
                const audioFormat = ('aac,flac,mp3,ogg,wav,webm').split(',');
                let _files = e.files;
                let files = [];

                for (let _file in _files) {
                    let file = _files[_file];
                    if (file.dir) continue;

                    let realName = file.name.split('/');
                    let format;

                    realName = realName[realName.length - 1];
                    format = realName.split('.');
                    format = format[format.length - 1];

                    file.realName = realName;
                    file.format = format;

                    files.push(file);
                }

                for (let file of files) {
                    try {
                        if (file.name === 'info.csv') {
                            let info = await file.async('text');
                            info = Csv2Array(info, true);
                            zipData.infos = info;

                        } else if (audioFormat.indexOf(file.format) >= 0) {
                            let audio = new Audio();
                            audio.src = 'data:audio/' + file.format + ';base64,' + (await file.async('base64'));
                            zipData.audios[file.name] = audio;

                        } else if (imageFormat.indexOf(file.format) >= 0) {
                            let image = new Image();
                            image.src = 'data:image/' + file.format + ';base64,' + (await file.async('base64'));
                            zipData.images[file.name] = image;

                        } else if (file.format === 'json') {
                            let chart = JSON.parse(await file.async('text'));
                            chart = ConvertChartVersion(chart);
                            chart = CalculateChartData(chart);
                            zipData.charts[file.name] = chart;

                        } else if (file.format === 'pec') {
                            let chart = await file.async('text');
                            chart = ConvertPEC2Json(chart);
                            chart = ConvertChartVersion(chart);
                            chart = CalculateChartData(chart);
                            zipData.charts[file.name] = chart;

                        } else {
                            // Just Silence
                        }
                    } catch (e) { // Just Silence.
                        console.error(e);
                    }
                }

                chartSelector.innerHTML = '';
                for (let name in zipData.charts) {
                    let option = document.createElement('option');
                    option.value = name;
                    option.innerHTML = name;
                    if (chartSelector.innerHTML == '') option.selected = true;
                    chartSelector.appendChild(option);
                }

                imageSelector.innerHTML = '';
                for (let name in zipData.images) {
                    let option = document.createElement('option');
                    option.value = name;
                    option.innerHTML = name;
                    if (imageSelector.innerHTML == '') option.selected = true;
                    imageSelector.appendChild(option);
                }

                audioSelector.innerHTML = '';
                for (let name in zipData.audios) {
                    let option = document.createElement('option');
                    option.value = name;
                    option.innerHTML = name;
                    if (audioSelector.innerHTML == '') option.selected = true;
                    audioSelector.appendChild(option);
                }

                chartSelector.parentNode.parentNode.style.display = 'block';
                fileSelectorBtn.style.display = 'none';
            })
            .catch((e) => {
                alert('你的文件我读不来');
                console.error(e);
            }
        );
    });

    fileSelectorBtn.innerHTML = '请坐和放宽，这可能需要几分钟...';
    fileSelectorBtn.setAttribute('disabled', true);

    reader.readAsArrayBuffer(file);
});


window.addEventListener('resize', ResizeWindow);


(() => {
    ResizeWindow();
})();

function ResizeWindow() {
    let realWidth = document.documentElement.clientWidth;
    let realHeight = document.documentElement.clientHeight;
    let fixedWidth = realHeight / 9 * 16 < realWidth ? realHeight / 9 * 16 : realWidth;
    let lineScale = fixedWidth > realHeight * 0.75 ? realHeight / 18.75 : fixedWidth / 14.0625;

    window.realWidth = realWidth;
    window.realHeight = realHeight;

    window.fixedWidth = fixedWidth;
    window.fixedWidthOffset = (realWidth - fixedWidth) / 2;
    window.fixedWidthPercent = fixedWidth / 18;

    window.noteSpeed = realHeight * 0.6;

    gameContainer.style.setProperty('--fixed-width', fixedWidth + 'px');
    gameContainer.style.setProperty('--fixed-width-percent', fixedWidth / 18);
    gameContainer.style.setProperty('--fixed-width-offset', (realWidth - fixedWidth) / 2 + 'px');

    gameContainer.style.setProperty('--note-speed', realHeight * 0.6);
    gameContainer.style.setProperty('--note-scale', document.documentElement.clientWidth / 8000);
    gameContainer.style.setProperty('--line-scale', lineScale);

    gameContainer.style.setProperty('--judgeline-width', (lineScale * 18.75 * 0.008) * 1920 / 3 * 1.042 + 'px');
}

function gameStart() {
    chart.chart = zipData.charts[chartSelector.value];
    chart.audio = zipData.audios[audioSelector.value];
    chart.image = zipData.images[imageSelector.value];

    chartSelector.parentNode.parentNode.style.display = 'none';

    sprites = CreateChartSprites(chart, gameContainer);
    startAnimate(CalculateChartActualTime);

    chart.audio.id = 'audio';
    chart.audio.controls = 'controls';
    document.body.appendChild(chart.audio);

    chart.audio.play();
}