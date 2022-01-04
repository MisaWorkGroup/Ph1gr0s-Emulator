var panelInst = new mdui.Panel('#panel');
var drawerInst = new mdui.Drawer('#drawer');

var pixi = null; // 备用
var Loader = new PIXI.Loader(); // Pixi.js 自带的资源加载器

// 精灵和贴图信息
var sprites = {};
var textures = {
	sound: {}
};

// 谱面信息
var _chart = {}; // 被选中的谱面信息
var chartData = {
	images : undefined,
	audios : undefined,
	charts : undefined,
	infos  : undefined,
	lines  : undefined
};

// 用户输入信息
var inputs = {
	taps: [],
	touches: {},
	mouse: {},
	keyboard: {}
};

// 用户设置数据
var settings = {
	windowRatio         : 16 / 9, // 屏幕宽高比
	antiAlias           : true, // 抗锯齿
	resolution          : 2, // 清晰度
	background          : true, // 启用背景图
	backgroundDim       : 0.75, // 背景图亮度
	backgroundBlur      : true, // 背景图模糊
	clickAnimate        : true, // 打击动画
	accIndicator        : false, // 准度指示器
	showFinger          : false, // 手指触摸点
	noteScale           : 8e3, // 按键缩放
	accIndicatorScale   : 500, // 准度指示器缩放
	multiNotesHighlight : true, // 多押高亮
	
	hitsound            : true, // 开启打击音
	musicVolume         : 1, // 音乐音量
	hitsoundVolume      : 0.75, // 打击音音量
	
	challengeMode       : false, // 课题模式
	autoPlay            : false, // 自动播放
	chartDelay          : 0, // 谱面延迟
	
	developMode         : false,
	disableJudgeLineAlpha : false
};
var global = {};

var stat = {
	isPaused : false,
	isFullscreen : false
};

var judgements = new Judgements();
const score = {
	init: function(totalNotes, isChallenge = false) {
		this.totalNotes = totalNotes;
		this.challenge = isChallenge;
		
		this.score = 0;
		this.combo = 0;
		this.maxCombo = 0;
	
		this.perfect = 0;
		this.good = 0;
		this.bad = 0;
		this.miss = 0;
		
		this.acc = 0;
		this.perfectAcc = [0, 0];
		this.goodAcc = [0, 0];
		this.badAcc = [0, 0];
		this.missAcc = [0, 0];
		
		if (!isChallenge) {
			this.scorePerNote = 900000 / totalNotes;
			
		} else {
			this.scorePerNote = 1000000 / totalNotes;
			
		}
		
		return this;
	},
	
	addCombo: function(type, acc = 0) {
		if (type == 4) {
			this.perfect += 1;
			this.combo += 1;
			
			if (!!acc)
				this.perfectAcc[(acc < 0 ? 0 : 1)] += 1;
		}
		if (type == 3) {
			this.good += 1;
			this.combo += 1;
			
			if (!!acc)
				this.goodAcc[(acc < 0 ? 0 : 1)] += 1;
		}
		if (type == 2) {
			this.bad += 1;
			this.combo = 0;
			
			if (!!acc)
				this.badAcc[(acc < 0 ? 0 : 1)] += 1;
		}
		if (type == 1) {
			this.miss += 1;
			this.combo = 0;
			
			if (!!acc)
				this.missAcc[(acc < 0 ? 0 : 1)] += 1;
		}
		
		if (this.combo > this.maxCombo) {
			this.maxCombo = this.combo;
		}
		
		this.score = this.scorePerNote * this.perfect + this.scorePerNote * this.good * 0.65;
		if (!this.challenge)
				this.score += (this.maxCombo / this.totalNotes) * 100000;
		
		this.score = this.score.toFixed(0);
		this.scoreText = this.score + '';
		
		while (7 > this.scoreText.length) {
			this.scoreText = '0' + this.scoreText;
		}
		
		if (sprites.scoreText)
			sprites.scoreText.text = this.scoreText;
		
		if (sprites.comboText) {
			if (this.combo > 2) {
				sprites.comboText.alpha = 1;
				sprites.comboText.children[0].text = this.combo;
				
			} else {
				sprites.comboText.alpha = 0;
			}
		}
		
		return this;
	}
};

// ========此处声明监听器=========
// ==Pixijs Loader 事件监听器==
// 监听图像加载进度
Loader.onProgress.add(function (loader, resource) {
	if (loader.progress.toFixed(0) < 100) {
		setProgress('loading-sources', '正在加载资源：' + resource.url + '...', loader.progress / 100);
	} else {
		setProgress('loading-sources', '全部资源加载完毕！', 1);
		setTimeout(() => {
			panelInst.closeAll();
			panelInst.open(1);
		}, 500);
	}
});

// ========此处为所有的初始化代码========
// 加载图像和声音资源
Loader.add([
		{ name: 'tap',         url: './img/Tap.png' },
		{ name: 'tap2',        url: './img/Tap2.png' },
		{ name: 'tapHl',       url: './img/TapHL.png' },
		{ name: 'drag',        url: './img/Drag.png' },
		{ name: 'dragHl',      url: './img/DragHL.png' },
		{ name: 'flick',       url: './img/Flick.png' },
		{ name: 'flickHl',     url: './img/FlickHL.png' },
		{ name: 'holdHead',    url: './img/HoldHead.png' },
		{ name: 'holdHeadHl',  url: './img/HoldHeadHL.png' },
		{ name: 'holdBody',    url: './img/Hold.png' },
		{ name: 'holdBodyHl',  url: './img/HoldHL.png' },
		{ name: 'holdEnd',     url: './img/HoldEnd.png' },
		{ name: 'judgeLine',   url: './img/JudgeLine.png' },
		{ name: 'clickRaw',    url: './img/clickRaw128.png' },
		
		{ name: 'progressBar', url: './img/ProgressBar.png' },
		
		{ name: 'soundTap',    url: './sound/Hitsound-Tap.ogg' },
		{ name: 'soundDrag',   url: './sound/Hitsound-Drag.ogg' },
		{ name: 'soundFlick',  url: './sound/Hitsound-Flick.ogg' }
	])
	.load(function (event) {
		// 将贴图信息添加到 textures 对象中
		for (const name in event.resources) {
			if (name.indexOf('sound') <= -1) {
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
			} else { // 把声音资源过滤出来单独分进一个 Object
				textures.sound[name.replace('sound', '').toLowerCase()] = event.resources[name].sound;
			}
		}
	}
);


// =======此处声明一些函数，工具函数请在 function.js 中声明========
// 选择一个 zip 文件
function selectZip() {
	let input = document.getElementById('input-select-chart');
	let button = document.getElementById('button-select-chart-zip');
	
	input.click();
	
	input.onchange = function () {
		if (!this.files || this.files.length != 1) return;
		
		button.innerHTML = '当前文件：' + this.files[0].name;
		decodeZip(this);
	};
}

/***
 * @function 导入和解析 zip 文件
 * @param input {object} input 元素
***/
function decodeZip(input) {
	let reader = new FileReader();
	let zip    = new JSZip();
	
	// 监听文件读取进度
	reader.onprogress = (e) => {
		if (e.loaded != input.files[0].size) {
			setProgress('loading-chart-zip', '正在读取谱面包...', e.loaded / input.files[0].size);
		} else {
			setProgress('loading-chart-zip', '谱面包读取完成！', 1);
		}
	}
	
	// 文件打开后使用 JSZip 解析压缩包
	reader.onloadend = (e) => {
		zip.loadAsync(reader.result)
			.then((e) => loadZip(e))
			.catch((e) => {
				mdui.alert('这不是一个有效的 *.zip 文件！<br>请确认您选择的是正确的文件格式。', '前方高能');
				console.warn('"' + input.files[0].name + '" 可能不是一个有效的 zip 文件。', e);
			}
		);
	}
	
	// 过滤非 zip 文件
	if (getFileFormat(input.files[0].name) != 'zip') {
		mdui.alert('这不是一个 *.zip 后缀的文件！<br>请确认您选择的是正确的文件格式。', '前方高能');
		return false;
	}
	
	// 解析选择的文件
	reader.readAsArrayBuffer(input.files[0]);
	mdui.$('#loading-chart-group').removeClass('mdui-hidden');
	
	async function loadZip(e) {
		const imageFormat = ('jpeg,jpg,gif,png,webp').split(',');
		const audioFormat = ('aac,flac,mp3,ogg,wav,webm').split(',');
		
		let loadedFiles = 0;
		let zipFiles    = [];
		
		// 清空之前加载的谱面信息
		for (let i in chartData) {
			chartData[i] = {};
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
			
			setProgress('loading-decode-chart', '正在解析文件：' + file.name + '...', loadedFiles / zipFiles.length);
			
			if (file.name == 'info.csv') { // 读取谱面信息
				let _infos = await file.async('text');
				let infos = Csv2Array(_infos, true);
				
				chartData.infos = JSON.parse(JSON.stringify(infos));
				
			} else if (file.name == 'line.csv') { // 读取判定线贴图信息
				let _lines = await file.async('text');
				let lines = Csv2Array(_lines, true);
				
				chartData.lines = lines;
				
			} else if (imageFormat.indexOf(format.toLowerCase()) !== -1) { // 处理图片
				try {
					let texture = await PIXI.Texture.fromURL('data:image/' + format + ';base64,' + (await file.async('base64')));
					
					chartData.images[file.name] = texture;
					
				} catch (e) {
					console.warn('"' + file.name + '" 可能不是一个有效的图像文件，将不会加载该文件。', e);
				}
				
			} else if (audioFormat.indexOf(format.toLowerCase()) !== -1) {
				try {
					let audio = PIXI.sound.Sound.from({
						source : await file.async('arraybuffer'),
						preload : true
					});
					
					chartData.audios[file.name] = audio;
					
				} catch (e) {
					console.warn('"' + file.name + '" 可能不是一个有效的音频文件，将不会加载该文件。', e);
				}
				
			} else if (format === 'json') {
				try {
					let chart = await file.async('text');
					
					chart = await ConvertChartVersion(JSON.parse(chart));
					chart = await CalculateChartData(chart);
					
					chartData.charts[file.name] = chart;
					
				} catch (e) {
					console.warn('"' + file.name + '" 可能不是一个有效的谱面文件，将不会加载该文件。', e);
				}
				
			} else if (format === 'pec') {
				try {
					let chart = await file.async('text');
					
					chart = await ConvertChartVersion(await ConvertPEC2Json(chart, file.name));
					chart = await CalculateChartData(chart);
					
					chartData.charts[file.name] = chart;
					
				} catch (e) {
					console.warn('"' + file.name + '" 可能不是一个有效的谱面文件，将不会加载该文件。', e);
				}
				
			} else {
				console.warn('"' + file.name + '" 是一个不支持的文件，将不会加载该文件。');
			}
			
			loadedFiles++;
		}
		
		createSelection('select-chart-file', chartData.charts);
		createSelection('select-chart-music', chartData.audios);
		createSelection('select-chart-bg', chartData.images);
		
		switchChart(mdui.$('#select-chart-file').val());
		
		setProgress('loading-decode-chart', '全部文件解析完毕！', 1);
		setTimeout(() => {
			panelInst.closeAll();
			panelInst.open(2);
		}, 500);
	}
	
	function getFileFormat(filename) {
		let arr = filename.split('.');
		return arr[arr.length - 1];
	}
}

/***
 * @function 切换谱面，该谱面的信息将会被传到 _chart 中
 * @param id {num} 谱面 ID
***/
function switchChart(name) {
	let chartInfos = chartData.infos;
	
	if (!chartInfos) return;
	
	let chart = {};
	
	// 为了避免某些玄学问题才使用这样的写法
	for (let _chartInfo of chartInfos) {
		let chartInfo = JSON.parse(JSON.stringify(_chartInfo));
		
		for (let keyName in chartInfo) {
			if (keyName.indexOf('Chart') >= 0 && chartInfo[keyName] == name) {
				chart = {
					info  : {
						name        : chartInfo.Name,
						level       : chartInfo.Level,
						illustrator : chartInfo.Illustrator,
						designer    : chartInfo.Designer
					},
					data  : chartData.charts[name],
					audio : chartData.audios[chartInfo.Music],
					image : chartData.images[chartInfo.Image],
					lines : []
				};
				
				if (chartData.lines instanceof Array) {
					for (let line of chartData.lines) {
						if (line.Chart == chartInfo.Chart) {
							chart.lines.push(line);
						}
					}
				}
				
				mdui.$('#input-chart-name').val(chartInfo.Name);
				mdui.$('#input-chart-difficulty').val(chartInfo.Level);
				mdui.$('#input-chart-author').val(chartInfo.Designer);
				mdui.$('#input-chart-bg-author').val(chartInfo.Illustrator);
				
				mdui.mutation('#panel-select-chart-info');
				
				_chart = chart;
				
				return;
			}
		}
	}
}

// 更改当前展开的面板
function switchPanel(id) {
	panelInst.closeAll();
	panelInst.open(id);
}

// 初始化并启动模拟器
function gameInit() {
	let canvasBox = document.getElementById('game-canvas-box');
	
	if (!_chart.data) {
		mdui.alert('你还没有选择一个谱面，请选择一个谱面！', '前方高能', () => {
			switchPanel(2);
		});
		return;
	}
	
	if (!_chart.audio || !_chart.audio.isLoaded) {
		mdui.alert('谱面音频正在努力装载中，请稍等一会再试！<br>如果你持续收到该消息，请检查音频文件。', '前方高能');
		return;
	}
	
	if (pixi) {
		mdui.alert('模拟器已经启动啦！', '前方高能');
		return;
	}
	
	switchPanel(6);
	// 初始化 Pixi 舞台
	pixi = new PIXI.Application({
		width       : canvasBox.offsetWidth,
		height      : canvasBox.offsetWidth * (1 / settings.windowRatio),
		antialias   : settings.antiAlias,
		autoDensity : true,
		resolution  : settings.resolution
	});
	canvasBox.innerHTML = '';
	canvasBox.appendChild(pixi.view);
	
	
	// ========此处声明监听器=========
	// ==Windows 对象 事件监听器==
	// 监听窗口尺寸修改事件，以实时修改舞台宽高和材质缩放值
	window.onresize = (e) => {
		let canvasBox = document.getElementById('game-canvas-box');
		
		if (stat.isFullscreen && full.check(pixi.view)) {
			pixi.renderer.resize(document.body.clientWidth, document.body.clientHeight);
		} else {
			if (stat.isFullscreen) pixi.renderer.resize(1, 1);
			pixi.renderer.resize(canvasBox.offsetWidth, canvasBox.offsetWidth * (1 / settings.windowRatio));
			stat.isFullscreen = false;
		}
		
		ResizeChartSprites(sprites, pixi.renderer.width, pixi.renderer.height, settings.noteScale);
	}
	
	// 监听窗口全屏改变事件
	/***
	document.addEventListener('fullscreenchange', () => {
		let canvasBox = document.getElementById('game-canvas-box');
		
		stat.isFullscreen != stat.isFullscreen;
		
		if (!stat.isFullscreen) {
			pixi.renderer.resize(1, 1);
			pixi.renderer.resize(canvasBox.offsetWidth, canvasBox.offsetWidth * (1 / settings.windowRatio));
			
		} else {
			pixi.renderer.resize(document.body.clientWidth, document.body.clientHeight);
			ResizeChartSprites(sprites, document.body.clientWidth, document.body.clientHeight,settings.noteScale);
		}
	});
	***/
	
	// ==舞台用户输入事件监听器==
	// 舞台触摸开始事件
	pixi.view.addEventListener('touchstart', (e) => {
		e.preventDefault();
		
		for (let touch of e.changedTouches) {
			let canvasPosition = pixi.view.getBoundingClientRect();
			let fingerId = touch.pointerId;
			let x = touch.offsetX - canvasPosition.x;
			let y = touch.offsetY - canvasPosition.y;
			
			inputs.touches[fingerId] = Click.activate(x, y, fingerId);
			
			if (settings.showFinger) {
				let circle = new PIXI.Graphics();
				
				circle.beginFill(0x00FFFF);
				circle.drawCircle(0, 0, 6);
				circle.endFill();
				
				pixi.stage.addChild(circle);
				circle.position.set(x, y);
				sprites.fingers[fingerId] = circle;
			}
		}
	});
	
	// 舞台触摸移动事件
	pixi.view.addEventListener('touchmove', (e) => {
		e.preventDefault();
		
		for (let touch of e.changedTouches) {
			let canvasPosition = pixi.view.getBoundingClientRect();
			let fingerId = touch.pointerId;
			let x = touch.offsetX - canvasPosition.x;
			let y = touch.offsetY - canvasPosition.y;
			
			inputs.touches[fingerId].move(x, y);
			
			if (settings.showFinger) {
				sprites.fingers[fingerId].position.set(x, y);
			}
		}
	});
	
	// 舞台触摸结束事件
	pixi.view.addEventListener('touchend', (e) => {
		e.preventDefault();
		
		for (let touch of e.changedTouches) {
			let fingerId = touch.pointerId;
			
			if (settings.showFinger) {
				sprites.fingers[fingerId].destroy();
				delete sprites.fingers[fingerId];
			}
			delete inputs.touches[fingerId];
		}
	});
	pixi.view.addEventListener('touchcancel', (e) => {
		e.preventDefault();
		
		for (let touch of e.changedTouches) {
			let fingerId = touch.pointerId;
			
			if (settings.showFinger) {
				sprites.fingers[fingerId].destroy();
				delete sprites.fingers[fingerId];
			}
			delete inputs.touches[fingerId];
		}
	});
	
	// 创建所有的精灵
	sprites = CreateChartSprites(_chart.data, pixi, true);
	if (settings.accIndicator) // 根据需求创建准度指示器
		sprites.accIndicator = CreateAccurateIndicator(pixi, settings.accIndicatorScale, settings.challengeMode);
	score.init(sprites.totalNotes.length, settings.challengeMode); // 计算分数
	
	pixi.ticker.add(CalculateChartActualTime); // 启动 Ticker 循环
	global.audio = _chart.audio.play({start: 0, volume: settings.musicVolume}); // 播放音乐并正式启动模拟器
}

function setCanvasFullscreen() {
	if (!pixi || !pixi.view) return;
	
	if (!checkFullscreen()) {
		mdui.alert('你的浏览器不支持全屏！', '前方高能');
		return;
	}
	
	stat.isFullscreen = true;
	full.toggle(pixi.view);
}
