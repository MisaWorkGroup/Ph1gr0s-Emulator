/***
 * 备忘录：如何计算 BeatVaule
 * 
 * 考虑到官谱、PE 和 RPE 的时间定位方式各不相同，以及为了之后的兼容性考虑，特
 * 在此设计一个新的时间定位单位，即 BeatValue。
 * BeatValue 即将一个小节定位数组（如 [1, 0, 4]）转换为一个浮点数。
 * 
 * BeatValue = Beat[0] + (beat[1] / Beat[2])
 * 
 * 例如，一个小节定位数组表示的是第一小节的第 3/4 拍，则该 Beat 定义为：
 * Beat = [0, 2, 4]
 * 那么对应的 BeatValue 为：
 * BeatValue = Beat[0] + (Beat[1] / Beat[2]) = 0 + (2 / 4) = 0.5
 * 
 * 将当前时间转换为 BeatValue：
 * currentBeatValue = lastChangedBeatValue + (currentTime - currentOffset) / currentBPM
 *     备注：假使以上所有绝对时间都是以秒为单位
***/


var texture = {};
var chart = null;
var pixi;

(() => {
	pixi = new PIXI.Application({
		width: document.documentElement.clientWidth,
		height: document.documentElement.clientWidth / 16 * 9,
		view: document.getElementById('stage')
	});

	pixi.loader
		.add([
			// 图像资源-游戏画面
			{ name: 'tap',         url: '/img/Tap.png' },
			{ name: 'tapHl',       url: '/img/TapHL.png' },
			{ name: 'tap2',        url: '/img/Tap2.png' },
			{ name: 'drag',        url: '/img/Drag.png' },
			{ name: 'dragHl',      url: '/img/DragHL.png' },
			{ name: 'holdHead',    url: '/img/HoldHead.png' },
			{ name: 'holdHeadHl',  url: '/img/HoldHeadHL.png' },
			{ name: 'holdBody',    url: '/img/Hold.png' },
			{ name: 'holdBodyHl',  url: '/img/HoldHL.png' },
			{ name: 'holdEnd',     url: '/img/HoldEnd.png' },
			{ name: 'holdEndHl',   url: '/img/HoldEndHL.png' },
			{ name: 'flick',       url: '/img/Flick.png' },
			{ name: 'flickHl',     url: '/img/FlickHL.png' },
			{ name: 'judgeLine',   url: '/img/JudgeLine.png' },
			{ name: 'progressBar', url: '/img/ProgressBar.png' },
			{ name: 'songNameBar', url: '/img/SongsNameBar.png' },
			{ name: 'clickRaw',    url: '/img/clickRaw128.png' }
		])
		.load((e) => {
			for (let name in e.resources) {
				let resource = e.resources[name].texture;
				texture[name] = resource;
			}
			console.log('load end');
		}
	);
})();



function selectFile(input) {
	let reader = new FileReader();
	let file = input.files[0];
	let zip = new JSZip();

	if (!file) return;

	reader.onloadend = () => {
		zip.loadAsync(reader.result)
			.then(async (e) => {
				for (let name in e.files) {
					let file = e.files[name];
					let format = name.split('.');

					format = format[format.length - 1];

					if (format == 'json') {
						chart = JSON.parse(await file.async('text'));

						let music = chart.META.song;
						let musicFormat = music.split('.');
						musicFormat = musicFormat[musicFormat.length - 1];
						music = await PIXI.sound.Sound.from('data:audio/' + musicFormat + ';base64,' + (await e.files[music].async('base64')), { preload: true });

						chart = CreateChart(chart);
						chart.music = music;
					}
				}
			})
			.catch((e) => {
				console.error(e);
			}
		);
	}

	reader.readAsArrayBuffer(file);
}

function changeTime (time) {
	if (!chart) return;
	chart.calcTime(time, pixi.screen.width, pixi.screen.height);
	document.getElementById('text-current-time').innerHTML = time;
	document.getElementById('text-current-beat').innerHTML = chart._beatValue;
}



function CreateChart(chartJSON) {
	let chart = new Chart(
		chartJSON.META.song,
		chartJSON.META.background,
		chartJSON.META.offset,
		chartJSON.META.name,
		chartJSON.META.composer,
		chartJSON.META.charter,
		'Unknown',
		chartJSON.META.level
	);

	for (let bpm of chartJSON.BPMList) {
		chart.addBPM(new BPM(bpm.bpm, bpm.startTime));
	}

	for (let _judgeline of chartJSON.judgeLineList) {
		let judgeline = new Judgeline(_judgeline.Texture, _judgeline.isCover);

		// 整理 EventLayers，并将里边的 Event 整理推送给判定线
		for (let _eventLayer of _judgeline.eventLayers) {
			let eventLayer = new JudgelineEvents();

			for (let event of _eventLayer.moveXEvents) eventLayer.addEvent('moveX', new JudgelineEvent(event.startTime, event.endTime, event.easingType, event.start, event.end));
			for (let event of _eventLayer.moveYEvents) eventLayer.addEvent('moveY', new JudgelineEvent(event.startTime, event.endTime, event.easingType, event.start, event.end));
			for (let event of _eventLayer.alphaEvents) eventLayer.addEvent('alpha', new JudgelineEvent(event.startTime, event.endTime, event.easingType, event.start, event.end));
			for (let event of _eventLayer.rotateEvents) eventLayer.addEvent('angle', new JudgelineEvent(event.startTime, event.endTime, event.easingType, event.start, event.end));
			for (let event of _eventLayer.speedEvents) eventLayer.addEvent('speed', new JudgelineEvent(event.startTime, event.endTime, event.easingType, event.start, event.end));
			
			judgeline.addEvents(eventLayer);
		}

		judgeline.sprite = new PIXI.Sprite(texture.judgeLine);
		judgeline.sprite.anchor.set(0.5);
		pixi.stage.addChild(judgeline.sprite);

		// 向判定线对象添加 Note
		if (_judgeline.notes instanceof Array) {
			for (let _note of _judgeline.notes) {
				let note = new Note(
					_note.startTime,
					_note.type,
					_note.endTime,
					_note.positionX,
					(_note.above === 1),
					_note.speed,
					(_note.isFake === 1),
					_note.alpha,
					_note.visibleTime,
					_note.yOffset
				);


				note.sprite = new PIXI.Sprite();


				judgeline.addNote(note);
				chart.addNote(note);
			}
		}

		chart.judgelines.push(judgeline);
	}

	console.log(chart);
	return chart;
}