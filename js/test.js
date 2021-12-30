// let zip = new JSZip();

// 初始化 Pixijs，并将绘图区添加到页面中
let pixi = new PIXI.Application({
	width     : document.body.offsetWidth,
	height    : document.body.offsetWidth / 16 * 9,
	antialias : true, // 抗锯齿
	backgroundColor: 0x1099bb,
	autoDensity: true, // 配合 resolution 使用
	resolution : window.devicePixelRatio // 默认是设备的像素密度
	/* view: glid('canvas') */
});
glid('canvas-box').appendChild(pixi.view);
// pixi.settings.RESOLUTION = ;
// 精灵和贴图信息
let sprites = {};
let textures = {};

// 触摸手指信息
let touches = {};

// 谱面信息
var chartData = {
	images : [],
	audios : [],
	charts : [],
	infos  : [],
	lines  : []
};
	
var _chart = {};

var global = {};

let settings = {
	windowRatio: 16 / 9, // 设备宽高比
	noteScale: 8e3, // 按键缩放比
	multiNotesHighlight : true,  // 多押高亮
	disableJudgeLineAlpha: false,
	autoPlay: false
}

// ========此处声明监听器=========

// ==Windows 对象 事件监听器==
// 监听窗口尺寸修改事件，以实时修改舞台宽高和材质缩放值
window.onresize = (e) => {
	pixi.renderer.resize(document.body.offsetWidth, document.body.offsetWidth * (1 / settings.windowRatio));
	ResizeChartSprites(sprites, pixi.renderer.width, pixi.renderer.height, settings.noteScale);
}

// ==Pixijs Loader 事件监听器==
// 监听图像加载进度
pixi.loader.onProgress.add(function (e) {
	console.log(e.progress);
});

// ==Pixijs Events 事件监听器==
// 舞台触摸开始事件
pixi.view.addEventListener('touchstart', (e) => {
	/***
	 * 全局变量 touches 用于存放当前共有几个手指在屏幕上
	 * 局部变量 diff 用于传递当前新增的手指信息
	***/
	let diff = e.changedTouches;
	touches = e.touches;
	
	
});

// 舞台触摸移动事件
pixi.view.addEventListener('touchmove', (e) => {
	// 这里可以直接把 touches 传出去
	touches = e.touches;
	
});

// 舞台触摸结束事件
pixi.view.addEventListener('touchend', (e) => {
	/***
	 * 全局变量 touches 用于存放当前共有几个手指在屏幕上
	 * 局部变量 diff 用于传递当前移开的手指信息
	***/
	let diff = e.changedTouches;
	touches = e.touches;
	
	
});


// =======此处声明初始化事件=======
// 创建一个全局 AudioContext 对象
{
	let audioCtx = window.AudioContext || window.webkitAudioContext;
	global.audioContext = new audioCtx();
	global.audioGain = global.audioContext.createGain();
	
	global.audioGain.connect(global.audioContext.destination);
}

// 启用 Pixi 的自动缩放，并将舞台尺寸调整到正确的尺寸
pixi.renderer.autoResize = true;
pixi.renderer.resize(document.body.offsetWidth, document.body.offsetWidth * (1 / settings.windowRatio));

// 设定舞台的可操作区域，应该是整个舞台
pixi.stage.interactive = true;
pixi.stage.hitArea = pixi.renderer.screen;


// 加载贴图
pixi.loader
	.add([
		{ name: 'tap',        url: './img/Tap.png' },
		{ name: 'tap2',       url: './img/Tap2.png' },
		{ name: 'tapHl',      url: './img/TapHL.png' },
		{ name: 'drag',       url: './img/Drag.png' },
		{ name: 'dragHl',     url: './img/DragHL.png' },
		{ name: 'flick',      url: './img/Flick.png' },
		{ name: 'flickHl',    url: './img/FlickHL.png' },
		{ name: 'holdHead',   url: './img/HoldHead.png' },
		{ name: 'holdHeadHl', url: './img/HoldHeadHL.png' },
		{ name: 'holdBody',   url: './img/Hold.png' },
		{ name: 'holdBodyHl', url: './img/HoldHL.png' },
		{ name: 'holdEnd',    url: './img/HoldEnd.png' },
		{ name: 'judgeLine',  url: './img/JudgeLine.png' },
		{ name: 'clickRaw',   url: './img/clickRaw128.png' }
	])
	.load(function (event) {
		// 将贴图信息添加到 textures 对象中
		for (const name in event.resources) {
			textures[name] = event.resources[name].texture;
			
			if (name == 'clickRaw') { // 将点击爆裂效果雪碧图转换为贴图数组，以方便创建动画精灵对象。
				/***
				 * 根据 PIXI 对于动画组件的规定，我们需要将动画雪碧图拆分成 30 个同等大小的
				 * 图片，将它们按照顺序存放入材质数组，这样才可以用他来正常创建动画精灵。
				 * 至于为什么图片分辨率被我压缩到了 128px，是因为我的设备读不了原尺寸的图片...
				***/
				let _clickTextures = [];
				
				for (let i = 0; i < Math.floor(textures[name].height / 128); i++) {
					let rectangle = new PIXI.Rectangle(0, i * 128, 128, 128);
					let texture = new PIXI.Texture(textures[name].baseTexture, rectangle);
					
					_clickTextures.push(texture);
				}
				
				textures[name] = _clickTextures;
			}
		}
	}
);


// 选择 ZIP 文件并解析
function selectZip(input) {
	let reader = new FileReader();
	let zip    = new JSZip();
	
	// 监听文件读取进度
	reader.onprogress = (e) => {
		console.log(e.loaded / input.files[0].size);
	}
	
	// 文件打开后使用 JSZip 解析压缩包
	reader.onloadend = (e) => {
		zip.loadAsync(reader.result)
			.then((e) => loadZip(e))
			.catch((e) => {
				console.log('not a zip');
				console.log(e);
			}
		);
	}
	
	// 过滤非 zip 文件
	if (getFileFormat(input.files[0].name) != 'zip') {
		console.log('not a zip');
		return;
	}
	
	// 解析选择的文件
	reader.readAsArrayBuffer(input.files[0]);
	
	
	async function loadZip(e) {
		const imageFormat = ('jpeg,jpg,gif,png,webp').split(',');
		const audioFormat = ('aac,flac,mp3,ogg,wav,webm').split(',');
		const numPattern  = /^(\-|\+)?\d+(e\d)?(\.\d+)?$/;
		
		let loadedFiles = 0;
		let zipFiles    = [];
		
		// 清空之前加载的谱面信息
		for (let i in chartData) {
			chartData[i].length = 0;
		}
		
		for (let name in e.files) { // 预处理文件信息
			let file = e.files[name];
			let realName = name.split('/');
			let format = '';
			
			realName = realName[realName.length - 1];
			format = getFileFormat(realName);
			
			if (file.dir) continue; // 过滤文件夹
			
			file.realName = realName;
			file.format = format;
			file.isHidden = realName.indexOf('.') == 0 ? true : false;
			
			zipFiles.push(file);
		}
		
		for (let file of zipFiles) {
			let format = file.format;
			
			if (file.realName == 'info.csv') { // 读取谱面信息
				let infos = [];
				let _infos = await file.async('text');
				_infos = Csv2Array(_infos, true);
				
				for (let info of _infos) { // 过滤值非法的项目
					if (numPattern.test(info.AspectRatio) && numPattern.test(info.ScaleRatio) && numPattern.test(info.GlobalAlpha)) {
						infos.push(info);
					}
				}
				
				chartData.infos = infos;
				
			} else if (file.realName == 'line.csv') { // 读取判定线贴图信息
				let lines = [];
				let _lines = await file.async('text');
				_lines = Csv2Array(_lines, true);
				
				for (let line of _lines) { // 过滤值非法的项目
					if (numPattern.test(line.LineId) && numPattern.test(line.Vert) && numPattern.test(line.Horz) && numPattern.test(line.IsDark)) {
						lines.push(line);
					}
				}
				
				chartData.lines = lines;
				
			} else if (imageFormat.indexOf(format.toLowerCase()) !== -1) { // 处理图片
				try {
					let image = { name : file.realName };
					let texture = await PIXI.Texture.fromURL('data:image/' + format + ';base64,' + (await file.async('base64')));
					
					image.data = texture;
					chartData.images.push(image);
					
				} catch (e) {
					console.log('Not an image', file.name);
				}
				
			} else if (audioFormat.indexOf(format.toLowerCase()) !== -1) {
				console.log('audio file', file.realName);
			} else if (format === 'json') {
				
			} else if (format === 'pec') {
				
			} else {
				console.warn('不支持的文件：' + file.name + '，将不会载入该文件。');
			}
			
			loadedFiles++;
			console.log(loadedFiles / zipFiles.length);
		}
		
		console.log(zipFiles);
		console.log(chartData);
	}
	
	function getFileFormat(filename) {
		let arr = filename.split('.');
		return arr[arr.length - 1];
	}
}
/***
function selectZip(input) {
	let reader = new FileReader();
	
	if (input.files[0].name.split('.')[1] === 'pec') {
		reader.readAsText(input.files[0]);
	} else {
		reader.readAsArrayBuffer(input.files[0]);
	}
	
	reader.onprogress = (e) => {
		console.log(e.loaded / input.files[0].size);
	};
	
	reader.onloadend = (e) => {
		if (input.files[0].name.split('.')[1] === 'pec') {
			console.log(ConvertPEC2Json(reader.result, input.files[0].name));
			return;
		}
		
		zip.loadAsync(reader.result, {})
			.then(async (e) => {
				let files = e.files;
				
				for (let file in files) {
					file = files[file];
					// console.log(file);
					if (file.dir) continue; // 过滤文件夹
					
					if (file.name == 'line.csv') { // 读取判定线信息
						let chartLine = file;
						chartLine = await chartLine.async('string');
						
						chartLine = Csv2Array(chartLine, true);
						// console.log(...chartLine);
						console.log('chart line loaded');
						
					} else if (file.name == 'info.csv') { // 读取谱面信息
						let chartInfo = file;
						chartInfo = await chartInfo.async('string');
						
						chartInfo = Csv2Array(chartInfo, true);
						// console.log(chartInfo);
						console.log('chart info loaded');
						
					} else {
						let audio = await file.async('arraybuffer');
						let audioCtx = (new Audio()).canPlayType('audio/ogg') != '' ? new AudioContext() : {};
						
						try { // 读取谱面音频文件
							let _audio = await audioCtx.decodeAudioData(audio);
							// audio = PIXI.sound.Sound.from(_audio);
							// console.log(audio);
							if (!_chart.audio) {
								_chart.audio = global.audioContext.createBufferSource();
								_chart.audio.buffer = _audio;
								_chart.audio.connect(global.audioGain);
								
								console.log('audio loaded');
							}
							
						} catch (e) { // 读取谱面图片文件
							let img = new Image();
							let reader = new FileReader();
							let blob = null;
							// console.log(img);
							
							reader.onerror = img.onerror = async (e) => {
								
								try {
									if (!_chart.data) {
										let json = await file.async('text');
										json = JSON.parse(json);
										console.log('chart file loaded');
										_chart.data = json;
										_chart.data = CalculateChartData(_chart.data);
										sprites = CreateChartSprites(_chart.data, !sprites.fps);
									}
								} catch (e) {
									try {
										
									} catch (e) {
										console.log('不支持的文件:', file.name);
										console.log(e);
									}
								}
							}
							
							img.onload = (e) => {
								console.log('image loaded');
							}
								
							blob = await file.async('blob');
							reader.readAsDataURL(blob);
							
							reader.onloadend = () => {
								img.src = reader.result;
							}
							
						}
					}
				}
				
			})
			.catch((e) => {
				console.log('不是zip文件');
			}
		);
	}
}
***/

/***
 * @function 该方法会将传入的谱面对象进行处理，使其更加合乎规范
 * @param chart {object} 传入一个未经处理的谱面数据对象
 * @return {object} 返回一个已经处理完毕的谱面对象
***/
function CalculateChartData (chart) {
	let notesTotal = [];
	let judgeLines = [];
	let multiNotes = {};
	let notes = {
		tap   : [],
		drag  : [],
		hold  : [],
		flick : []
	};
	// 给 Note 排序时使用该方法
	let sortNote = (a, b) => a.realTime - b.realTime || a.lineId - b.lineId || a.noteId - b.noteId;
	
	for (let i = 0; i < chart.judgeLineList.length; i++) {
		let judgeLine = chart.judgeLineList[i];
		let _judgeLine = {
			id: i,
			bpm: judgeLine.bpm,
			speedEvents: [],
			judgeLineMoveEvents: [],
			judgeLineRotateEvents: [],
			judgeLineDisappearEvents: [],
			notes: [],
			notesAbove: [],
			notesBelow: [],
			numOfNotes: judgeLine.numOfNotes,
			numOfNotesAbove: judgeLine.numOfNotesAbove,
			numOfNotesBelow: judgeLine.numOfNotesBelow
		};
		
		// 过滤掉空的判定线
		if (judgeLine.notesAbove.length <= 0 &&
			judgeLine.notesBelow <= 0 &&
			judgeLine.judgeLineMoveEvents.length <= 1 &&
			judgeLine.judgeLineRotateEvents.length <= 1 &&
			judgeLine.judgeLineDisappearEvents.length <= 1 &&
			judgeLine.speedEvents.length <= 1)
		{
			continue;
		}
		
		// 规范速度事件、转换事件时间
		_judgeLine.speedEvents              = addRealTime(arrangeSpeedEvents(judgeLine.speedEvents), judgeLine.bpm);
		_judgeLine.judgeLineMoveEvents      = addRealTime(arrangeLineEvents(judgeLine.judgeLineMoveEvents), judgeLine.bpm);
		_judgeLine.judgeLineRotateEvents    = addRealTime(arrangeLineEvents(judgeLine.judgeLineRotateEvents), judgeLine.bpm);
		_judgeLine.judgeLineDisappearEvents = addRealTime(arrangeLineEvents(judgeLine.judgeLineDisappearEvents), judgeLine.bpm);
		
		// note 添加 id，设置方向参数、设置正确时间、归类并和总
		for (let x = 0; x < judgeLine.notesAbove.length; x++) {
			let note = judgeLine.notesAbove[x];
			note = addNote(note, _judgeLine, x, true);
			_judgeLine.notes.push(note);
			_judgeLine.notesAbove.push(note);
		}
		for (let y = 0; y < judgeLine.notesBelow.length; y++) {
			let note = judgeLine.notesBelow[y];
			note = addNote(note, _judgeLine, y, false);
			_judgeLine.notes.push(note);
			_judgeLine.notesBelow.push(note);
		}
		
		// 推送判定线
		judgeLines.push(_judgeLine);
	}
	
	// 标识多押 note
	for (let note of notesTotal) {
		multiNotes[note.realTime.toFixed(6)] = multiNotes[note.realTime.toFixed(6)] ? 2 : 1;
	}
	for (let note of notesTotal) {
		note.isMulti = (multiNotes[note.realTime.toFixed(6)] == 2);
	}
	
	// note 重排序
	notes.tap.sort(sortNote);
	notes.drag.sort(sortNote);
	notes.hold.sort(sortNote);
	notes.flick.sort(sortNote);
	notesTotal.sort(sortNote);
	
	notes.total = notesTotal;
	
	return {
		judgeLines: judgeLines,
		notes: notes
	};
	
	/***
	 * @function 处理 Note 的各种参数
	 * @param note {object} 一个未经处理的 Note 对象
	 * @param judgeLine {object} 该 Note 对象所属的判定线对象
	 * @param id {num} 该 Note 在该 Container 中的 ID
	 * @param isAbove {bool} 该 Note 是否存在 notesAbove 中
	 * @return {object} 已处理完毕的 Note 对象
	***/
	function addNote(note, judgeLine, id, isAbove) {
		let noteSpeed                = 1;
		let noteSpeedChangedRealTime = 0;
		let noteSpeedChangedPosition = 0;
		let holdEndRealTime          = 0;
		let holdHeadPosition         = 0;
		let holdEndPosition          = 0;
		
		note.realTime     = note.time * (1.875 / judgeLine.bpm);
		note.realHoldTime = note.holdTime * (1.875 / judgeLine.bpm);
		note.offsetY      = 0;
		note.holdLength   = 0;
		note.lineId       = judgeLine.id;
		note.id           = id;
		note.isAbove      = isAbove;
		note.score        = 0;
		
		// 预计算 Note 在 Container 中的正确位置
		for (let i of judgeLine.speedEvents) {
			if (note.realTime < i.startRealTime) continue;
			if (note.realTime > i.endRealTime) continue;
			
			noteSpeed = i.value;
			
			noteSpeedChangedPosition = i.floorPosition;
			noteSpeedChangedRealTime = i.startRealTime;
			
			break;
		}
		
		note.offsetY = (note.realTime - noteSpeedChangedRealTime) * noteSpeed + noteSpeedChangedPosition;
		
		// 预计算 Hold 长度
		if (note.type == 3) {
			holdEndRealTime = note.realTime + note.realHoldTime;
			holdHeadPosition = (note.realTime - noteSpeedChangedRealTime) * noteSpeed + noteSpeedChangedPosition;
			
			for (let i of judgeLine.speedEvents) {
				if (holdEndRealTime < i.startRealTime) continue;
				if (holdEndRealTime > i.endRealTime) continue;
				
				holdEndPosition = (holdEndRealTime - i.startRealTime) * i.value + i.floorPosition;
				break;
			}
			
			note.holdLength = (holdEndPosition - holdHeadPosition);
		}
		
		if (note.type == 1) notes.tap.push(note);
		else if (note.type == 2) notes.drag.push(note);
		else if (note.type == 3) notes.hold.push(note);
		else if (note.type == 4) notes.flick.push(note);
		
		notesTotal.push(note);
		return note;
	}
	
	/***
	 * @function 规范判定线事件
	 * @param events {array} 判定线事件数组
	 * @return {array} 返回已规范化的判定线事件数组
	***/
	function arrangeLineEvents(events) {
		let oldEvents = JSON.parse(JSON.stringify(events));
		let newEvents2 = [];
		let newEvents = [{ // 以 1-1e6 开始
			startTime : 1 - 1e6,
			endTime   : 0,
			start     : oldEvents[0] ? oldEvents[0].start : 0,
			end       : oldEvents[0] ? oldEvents[0].end : 0,
			start2    : oldEvents[0] ? oldEvents[0].start2 : 0,
			end2      : oldEvents[0] ? oldEvents[0].end2 : 0
		}];
		
		oldEvents.push({ // 以 1e9 结束
			startTime : 0,
			endTime   : 1e9,
			start     : oldEvents[oldEvents.length - 1] ? oldEvents[oldEvents.length - 1].start : 0,
			end       : oldEvents[oldEvents.length - 1] ? oldEvents[oldEvents.length - 1].end : 0,
			start2    : oldEvents[oldEvents.length - 1] ? oldEvents[oldEvents.length - 1].start2 : 0,
			end2      : oldEvents[oldEvents.length - 1] ? oldEvents[oldEvents.length - 1].end2 : 0
		});
		
		// 保证时间连续性
		for (let oldEvent of oldEvents) {
			let lastNewEvent = newEvents[newEvents.length - 1];
			
			if (lastNewEvent.endTime > oldEvent.endTime) {
				// 忽略此分支
				
			} else if (lastNewEvent.endTime == oldEvent.startTime) {
				newEvents.push(oldEvent);
				
			} else if (lastNewEvent.endTime < oldEvent.startTime) {
				newEvents.push({
					startTime : lastNewEvent.endTime,
					endTime   : oldEvent.startTime,
					start     : lastNewEvent.end,
					end       : lastNewEvent.end,
					start2    : lastNewEvent.end2,
					end2      : lastNewEvent.end2
				}, oldEvent);
				
			} else if (lastNewEvent.endTime > oldEvent.startTime) {
				newEvents.push({
					startTime : lastNewEvent.endTime,
					endTime   : oldEvent.endTime,
					start     : (oldEvent.start * (oldEvent.endTime - lastNewEvent.endTime) + oldEvent.end * (lastNewEvent.endTime - oldEvent.startTime)) / (oldEvent.endTime - oldEvent.startTime),
					end       : lastNewEvent.end,
					start2    : (oldEvent.start2 * (oldEvent.endTime - lastNewEvent.endTime) + oldEvent.end2 * (lastNewEvent.endTime - oldEvent.startTime)) / (oldEvent.endTime - oldEvent.startTime),
					end2      : lastNewEvent.end2
				});
			}
		}
		
		// 合并相同变化率事件
		newEvents2 = [newEvents.shift()];
		for (let newEvent of newEvents) {
			let lastNewEvent2 = newEvents2[newEvents2.length - 1];
			let duration1 = lastNewEvent2.endTime - lastNewEvent2.startTime;
			let duration2 = newEvent.endTime - newEvent.startTime;
			
			if (newEvent.startTime == newEvent.endTime) {
				// 忽略此分支
				
			} else if (
				lastNewEvent2.end == newEvent.start &&
				lastNewEvent2.end2 == newEvent.start2 &&
				(lastNewEvent2.end - lastNewEvent2.start) * duration2 == (newEvent.end - newEvent.start) * duration1 &&
				(lastNewEvent2.end2 - lastNewEvent2.start2) * duration2 == (newEvent.end2 - newEvent.start2) * duration1
			) {
				lastNewEvent2.endTime = newEvent.endTime;
				lastNewEvent2.end     = newEvent.end;
				lastNewEvent2.end2    = newEvent.end2;
				
			} else {
				newEvents2.push(newEvent);
			}
		}
		
		return JSON.parse(JSON.stringify(newEvents2));
	}
	
	/***
	 * @function 规范速度事件
	 * @param events {array} 传入各类速度事件
	 * @return {array} 返回规范过的速度事件
	***/
	function arrangeSpeedEvents(events) {
		let newEvents = [];
		for (let i of events) {
			let lastEvent = newEvents[newEvents.length - 1];
			
			if (!lastEvent || lastEvent.value != i.value) {
				newEvents.push(i);
			} else {
				lastEvent.endTime = i.endTime;
			}
		}
		
		return JSON.parse(JSON.stringify(newEvents));
	}
	
	/***
	 * @function 将时间计算为正确的时间
	 * @param events {array} 任意带起始时间和终止时间的事件列表
	 * @param bpm {num} 当前事件列表的 BPM
	 * @return {array} 返回已计算完毕时间的事件列表
	***/
	function addRealTime(events, bpm) {
		for (let i of events) {
			i.startRealTime = i.startTime / bpm * 1.875;
			i.endRealTime   = i.endTime / bpm * 1.875;
			i.startDeg = -(Math.PI / 180) * i.start;
			i.endDeg   = -(Math.PI / 180) * i.end;
		}
		return events;
	}
}

/***
 * @function 该方法将为传入的谱面数据创建所有的精灵。传入谱面前请确认使用 CalculateChartData() 处理过。
 * @param chart {object} 已使用 CalculateChartData() 处理过的谱面数据
 * @param requireFPSCounter {bool} 如果该值为真，则创建一个 FPS 指示器
 * @return {object} 返回一个存放 Containers 精灵数组、Notes 精灵数组和 FPS 精灵的对象
***/
function CreateChartSprites(chart, requireFPSCounter = false) {
	/***
	 * 渲染思路：
	 * 将每一个判定线视为一个 Container，该 Container 除了包含该判
	 * 定线本身外还包含两个 Container 用于分别控制判定线两面的 Note。
	 * 如此做法的好处是整个判定线的 Note 流速、旋转、位移都更加方便控
	 * 制，坏处就是由于 Pixi 的 Container 元素没有设定中心点的方法，
	 * 所以中心点得靠手动移动子元素来实现，且不方便绘制那些有速度变化的
	 * Note。
	***/
	
	/***
	 * 备忘录：Storyboard 中渲染出的图片就是改了指定贴图的判定线
	***/
	let lineScale = pixi.renderer.width > pixi.renderer.height * 0.75 ? pixi.renderer.height / 18.75 : pixi.renderer.width / 14.0625;
	let output = {
		containers: [],
		totalNotes: []
	};
	
	for (let _judgeLine of chart.judgeLines) {
		let container = new PIXI.Container();
		let judgeLine = new PIXI.Sprite(textures.judgeLine);
		let notesAbove = new PIXI.Container();
		let notesBelow = new PIXI.Container();
		
		judgeLine.raw = _judgeLine;
		
		// 设置判定线中心点和宽高
		judgeLine.anchor.set(0.5);
		judgeLine.height = lineScale * 18.75 * 0.008 / pixi.renderer.resolution;
		judgeLine.width = judgeLine.height * judgeLine.texture.width / judgeLine.texture.height * 1.042;
		
		// 调整判定线位置
		judgeLine.position.set(0, 0);
		
		notesBelow.angle = 180; // 目前还是不确定官方是否也是这个做法
		
		for (let _note of _judgeLine.notes) {
			let note;
			
			if (_note.type == 3) {
				let hold = new PIXI.Container();
				let holdHead = new PIXI.Sprite(textures['holdHead' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')]);
				let holdBody = new PIXI.Sprite(textures['holdBody' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')]);
				let holdEnd = new PIXI.Sprite(textures.holdEnd);
				let baseLength = (pixi.renderer.height * 0.6);
				let holdLength = (_note.holdLength * baseLength) / (pixi.renderer.width / settings.noteScale);
				
				holdHead.anchor.set(0.5);
				holdBody.anchor.set(0.5, 1);
				holdEnd.anchor.set(0.5, 1);
				
				holdBody.height = holdLength;
				
				holdHead.position.set(0, holdHead.height / 2);
				holdBody.position.set(0, 0);
				holdEnd.position.set(0, -holdLength);
				
				hold.addChild(holdHead);
				hold.addChild(holdBody);
				hold.addChild(holdEnd);
				
				note = hold;
				
			} else {
				note = new PIXI.Sprite(textures.tap);
				
				note.anchor.set(0.5);
				
				if (_note.type == 1) note.texture = textures['tap' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')];
				else if (_note.type == 2) note.texture = textures['drag' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')];
				else if (_note.type == 4) note.texture = textures['flick' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')];
			}
			
			note.scale.set(pixi.renderer.width / settings.noteScale / pixi.renderer.resolution);
			note.position.x = (_note.positionX.toFixed(6) * 0.109) * (pixi.renderer.width / 2) / pixi.renderer.resolution;
			note.position.y = -_note.offsetY * (pixi.renderer.height * 0.6) / pixi.renderer.resolution;
			
			note.raw = _note;
			note.id = _note.id;
			note.lineId = _note.lineId;
			
			if (_note.isAbove) notesAbove.addChild(note);
			else notesBelow.addChild(note);
			
			output.totalNotes.push(note);
		}
		
		container.addChild(judgeLine);
		
		if (notesAbove.children.length > 0) container.addChild(notesAbove);
		if (notesBelow.children.length > 0) container.addChild(notesBelow);
		
		pixi.stage.addChild(container);
		
		container.position.x = pixi.renderer.width / 2 / pixi.renderer.resolution;
		container.position.y = pixi.renderer.height / 2 / pixi.renderer.resolution;
		
		output.containers.push(container);
	}
	
	if (requireFPSCounter) {
		let fps = new PIXI.Text('00.00', {
			fontFamily : 'Mina',
			fontSize: lineScale / pixi.renderer.resolution * 0.8 + 'px',
			fill: 'rgba(255, 255, 255, 0.5)',
			align: 'right'
		});
		
		pixi.stage.addChild(fps);
		fps.position.set(pixi.renderer.width / pixi.renderer.resolution - fps.width - 2, 1 / pixi.renderer.resolution);
		
		output.fps = fps;
		output.fpsInterval = setInterval(() => {
			fps.text = fillZero((pixi.ticker.FPS).toFixed(2));
			
			function fillZero(num) {
				let nums = (num + '').split('.');
				
				for (let _num of nums) {
					if (_num < 10) {
						_num = '0' + _num;
					}
				}
				return nums[0] + (nums[1] ? '.' + nums[1] : '');
			}
		}, 200);
		
	} else {
		output.fps = sprites.fps;
	}
	
	return output;
}


/***
 * @function 对所有精灵对象进行重定位和重缩放。本方法应仅在舞台尺寸被改变时调用。
 * @param sprites {object} 存放所有精灵的对象
 * @param width {num} 舞台的宽度
 * @param height {num} 舞台的高度
 * @param _noteScale {num} 按键缩放值。默认为 8000。
***/
function ResizeChartSprites(sprites, width, height, _noteScale = 8e3) {
	let windowRatio = width / height;
	let lineScale = (width > height * 0.75 ? height / 18.75 : width / 14.0625) / pixi.renderer.resolution;
	let noteScale = width / _noteScale / pixi.renderer.resolution;
	let noteSpeed = height * 0.6 / pixi.renderer.resolution;
	
	// 不处理没有判定线和 Note 的精灵对象
	if (!sprites.containers || !sprites.totalNotes) {
		return;
	}
	if (sprites.containers.length <= 0 || sprites.totalNotes.length <= 0) {
		return;
	}
	
	// 处理判定线
	for (let container of sprites.containers) {
		let judgeLine = container.children[0];
		
		judgeLine.height = lineScale * 18.75 * 0.008;
		judgeLine.width = judgeLine.height * judgeLine.texture.width / judgeLine.texture.height * 1.042;
	}
	
	// 处理 Note
	for (let note of sprites.totalNotes) {
		note.scale.set(noteScale);
		note.position.x = (note.raw.positionX.toFixed(6) * 0.109) * (width / 2) / pixi.renderer.resolution;
		note.position.y = -note.raw.offsetY * (height * 0.6) / pixi.renderer.resolution;
		
		// 处理 Hold
		if (note.raw.type == 3 && note.children.length == 3) {
			note.children[1].height = note.raw.holdLength * noteSpeed / noteScale;
			note.children[2].position.y = -((note.raw.holdLength * noteSpeed) / noteScale);
		}
	}
	
	// 处理 FPS 指示器
	if (sprites.fps) {
		sprites.fps.fontSize = lineScale * 0.8 + 'px';
		sprites.fps.position.set(width / pixi.renderer.resolution - sprites.fps.width - 2, 1 / pixi.renderer.resolution);
	}
}

/***
 * @function 实时计算当前时间下的精灵数据。该方法应在 PIXI.Ticker 中循环调用
***/
function CalculateChartActualTime(delta) {
	let currentTime = global.startTime ? (Date.now() - global.startTime) / 1000 : 0;
	
	for (let container of sprites.containers) {
		let judgeLine = container.children[0];
		
		if (!judgeLine) continue;
		
		if (!settings.disableJudgeLineAlpha) {
			for (let i of judgeLine.raw.judgeLineDisappearEvents) {
				if (currentTime < i.startRealTime) break;
				if (currentTime > i.endRealTime) continue;
				
				let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
				let time1 = 1 - time2;
				
				judgeLine.alpha = i.start * time1 + i.end * time2;
			}
		}
		
		for (let i of judgeLine.raw.judgeLineMoveEvents) {
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
			let time1 = 1 - time2;
			
			container.position.x = pixi.renderer.width * (i.start * time1 + i.end * time2) / pixi.renderer.resolution;
			container.position.y = pixi.renderer.height * (1 - i.start2 * time1 - i.end2 * time2) / pixi.renderer.resolution;
		}
		
		for (const i of judgeLine.raw.judgeLineRotateEvents) {
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
			let time1 = 1 - time2;
			
			container.rotation = i.startDeg * time1 + i.endDeg * time2;
		}
		
		for (const i of judgeLine.raw.speedEvents) {
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			if (container.children[1])
				container.children[1].position.y = ((currentTime - i.startRealTime) * i.value + i.floorPosition) * (pixi.renderer.height * 0.6) / pixi.renderer.resolution;
			
			if (container.children[2])
				container.children[2].position.y = -((currentTime - i.startRealTime) * i.value + i.floorPosition) * (pixi.renderer.height * 0.6) / pixi.renderer.resolution;
		}
		
	}
	
	for (let i of sprites.totalNotes) {
		if (i.raw.score > 0) continue;
		
		if (i.raw.realTime - currentTime <= 0) {
			let timeBetween = i.raw.type != 3 ? i.raw.realTime - currentTime : (i.raw.realTime + i.raw.realHoldTime) - currentTime;
			
			if (settings.autoPlay) {
				if (0 >= timeBetween >= -0.2) {
					i.alpha = 0;
					i.raw.score = 4;
					
					continue;
				}
			}
			
			if (timeBetween > -0.2) {
				i.alpha = (0.2 + timeBetween) / 0.2;
			} else {
				i.alpha = 0;
				i.raw.score = 1;
				// console.log('miss');
			}
		}
	}
}