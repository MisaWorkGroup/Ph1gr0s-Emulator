'use strict';

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
	images     : undefined,
	imagesBlur : undefined,
	audios     : undefined,
	charts     : undefined,
	infos      : undefined,
	lines      : undefined
};

// 用户输入信息
var inputs = {
	taps: [],
	touches: {},
	mouse: {},
	isMouseDown: {},
	keyboard: {}
};

var stat = {
	isRetrying : false,
	isTransitionEnd: false,
	isPaused : false,
	isFullscreen : false
};

var judgements = new Judgements();
const judgementTimes = {
	bad              : 200,
	good             : 160,
	perfect          : 80,
	badChallenge     : 100,
	goodChallenge    : 75,
	perfectChallenge : 40
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

// ==正常 DOM 元素事件监听器==
// 监听侧边抽屉式导航栏项目被按下事件
{
	let drawerItems = document.getElementById('drawer').getElementsByClassName('mdui-list-item');
	for (let drawerItem of drawerItems) {
		drawerItem.addEventListener('click', (e) => {
			if (!drawerInst.isDesktop() && drawerInst.isOpen()) {
				drawerInst.close();
			}
		});
	}
}

// ========此处为所有的初始化代码========
// 注册所有的 Pixi.js 插件
PIXI.CanvasRenderer.registerPlugin('graphics', PIXI.CanvasGraphicsRenderer);
PIXI.CanvasRenderer.registerPlugin('sprite', PIXI.CanvasSpriteRenderer);

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
		
		{ name: 'songNameBar', url: './img/SongsNameBar.png' },
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
					 * 如果修改了这里的材质图的分辨率，记得在 function.js 中的 CreateClickAnimation() 中修改缩放值！
					***/
					let _clickTextures = [];
					
					for (let i = 0; i < Math.floor(textures[name].height / textures[name].width); i++) {
						let rectangle = new PIXI.Rectangle(0, i * textures[name].width, textures[name].width, textures[name].width);
						let texture = new PIXI.Texture(textures[name].baseTexture, rectangle);
						
						_clickTextures.push(texture);
					}
					
					textures[name] = _clickTextures;
				}
			} else { // 把声音资源过滤出来单独分进一个 Object
				textures.sound[name.replace('sound', '').toLowerCase()] = event.resources[name].sound;
				textures.sound[name.replace('sound', '').toLowerCase()].play({ volume:0 });
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
		if (e.loaded < input.files[0].size) {
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
				console.error('"' + input.files[0].name + '" 可能不是一个有效的 zip 文件。', e);
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
					let blur = PIXI.Texture.from(BlurImage(texture.baseTexture, 20));
					
					chartData.images[file.name] = texture;
					chartData.imagesBlur[file.name] = blur;
					
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
		
		createMenuItems('menu-chart-file', chartData.charts, '_chart.data', 'chartData.charts', null, -1, 'switchChart(this.getAttribute(\'menu-value\'))', 'list-text-chart-file');
		createMenuItems('menu-chart-audio', chartData.audios, '_chart.audio', 'chartData.audios', null, null, null, 'list-text-chart-audio');
		createMenuItems('menu-chart-image', chartData.images, '_chart.image', 'chartData.images', null, null, '_chart.imageBlur = chartData.imagesBlur[this.getAttribute(\'menu-value\')]', 'list-text-chart-image');
		
		// 不知道该怎么简写
		{
			let chartItems = document.getElementById('menu-chart-file').getElementsByTagName('a');
			switchChart(chartItems[chartItems.length - 1].getAttribute('menu-value'));
		}
		
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
 * @param name {steing} 谱面文件名称
***/
function switchChart(name) {
	let chartInfos = chartData.infos;
	
	if (!chartInfos) return;
	
	let chart = {};
	
	// 为了避免某些玄学问题才使用这样的写法
	try {
		for (let _chartInfo of chartInfos) {
			let chartInfo = JSON.parse(JSON.stringify(_chartInfo));
			
			let audioItems = document.getElementById('menu-chart-audio').getElementsByTagName('a');
			let imageItems = document.getElementById('menu-chart-image').getElementsByTagName('a');
			
			for (let keyName in chartInfo) {
				if (keyName.indexOf('Chart') >= 0 && chartInfo[keyName] == name) {
					chart = {
						info      : {
							name        : chartInfo.Name,
							level       : chartInfo.Level,
							illustrator : chartInfo.Illustrator,
							designer    : chartInfo.Designer
						},
						data      : chartData.charts[name],
						audio     : chartData.audios[chartInfo.Music],
						image     : chartData.images[chartInfo.Image],
						imageBlur : chartData.imagesBlur[chartInfo.Image],
						lines     : []
					};
					
					if (chartData.lines instanceof Array) {
						for (let line of chartData.lines) {
							if (line.Chart == chartInfo.Chart) {
								chart.lines.push(line);
							}
						}
					}
					
					for (let audioItem of audioItems) {
						if (audioItem.getAttribute('menu-value') == chartInfo.Music) {
							selectMenuItem('menu-chart-audio', audioItem, 'list-text-chart-audio');
							break;
						}
					}
					
					for (let imageItem of imageItems) {
						if (imageItem.getAttribute('menu-value') == chartInfo.Image) {
							selectMenuItem('menu-chart-image', imageItem, 'list-text-chart-image');
							break;
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
		
	} catch (e) { // 兼容没有 info.csv 文件的谱面包
		console.warn('该谱面包可能不自带谱面信息，您可能需要手动填写相关信息。', e);
		
		let firstImage = document.getElementById('menu-chart-image').getElementsByTagName('a')[0];
		let firstAudio = document.getElementById('menu-chart-audio').getElementsByTagName('a')[0];
		let firstImageName = firstImage.getAttribute('menu-value');
		let firstAudioName = firstAudio.getAttribute('menu-value');
		
		chart = {
			info      : {
				name        : null,
				level       : null,
				illustrator : null,
				designer    : null
			},
			data      : chartData.charts[name],
			audio     : chartData.audios[firstAudioName],
			image     : chartData.images[firstImageName],
			imageBlur : chartData.imagesBlur[firstImageName],
			lines     : []
		};
		
		if (chartData.lines instanceof Array) {
			for (let line of chartData.lines) {
				if (line.Chart == name) {
					chart.lines.push(line);
				}
			}
		}
		
		selectMenuItem('menu-chart-audio', firstAudio, 'list-text-chart-audio');
		selectMenuItem('menu-chart-image', firstImage, 'list-text-chart-image');
		
		_chart = chart;
		return;
	}
}

// 更改当前展开的面板
function switchPanel(id) {
	panelInst.closeAll();
	panelInst.open(id);
}

/***
 * @function 打开这个列表项目相关联的菜单，不用 MDUI 的自定义类型方法打开是因为
 *     菜单的宽度一般都非常窄
 * @param targetDom {HTMLElementObject} 按 MDUI 的要求，需要传入列表项目
 *     的 Dom 元素，目的是为了定位
 * @param id {string} 菜单的 ID
***/
function openMenu(targetDom, id) {
	let menuDom  = document.getElementById(id);
	let menuInst = new mdui.Menu(targetDom, menuDom, { align: 'right' } );
	
	menuDom.style.width = (targetDom.clientWidth - 72 > 320 ? 320 : targetDom.clientWidth - 72) + 'px';
	menuInst.toggle();
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
		mdui.alert('模拟器已经启动啦！', '前方高能', () => { switchPanel(6) });
		return;
	}
	
	// 定义判定时间
	global.judgeTimes = {
		perfect : (settings.challengeMode ? judgementTimes.perfectChallenge : judgementTimes.perfect) / 1000,
		good    : (settings.challengeMode ? judgementTimes.goodChallenge : judgementTimes.good) / 1000,
		bad     : (settings.challengeMode ? judgementTimes.badChallenge : judgementTimes.bad) / 1000
	};
	
	switchPanel(6);
	// 初始化 Pixi 舞台
	pixi = new PIXI.Application({
		width       : canvasBox.offsetWidth,
		height      : canvasBox.offsetWidth * (1 / settings.windowRatio),
		antialias   : settings.antiAlias,
		autoDensity : true,
		resolution  : settings.resolution,
		forceCanvas : settings.forceCanvas
	});
	canvasBox.innerHTML = '';
	canvasBox.appendChild(pixi.view);
	
	pixi.renderer.realWidth = pixi.renderer.width / pixi.renderer.resolution;
	pixi.renderer.realHeight = pixi.renderer.height / pixi.renderer.resolution;
	
	pixi.renderer.fixedWidth = pixi.renderer.realWidth <= pixi.renderer.realHeight / 9 * 16 ? pixi.renderer.realWidth : pixi.renderer.realHeight / 9 * 16;
	pixi.renderer.fixedWidthOffset = (pixi.renderer.realWidth - pixi.renderer.fixedWidth) / 2;
	
	pixi.renderer.noteSpeed = pixi.renderer.realHeight * 0.6;
	pixi.renderer.noteScale = pixi.renderer.fixedWidth / settings.noteScale;
	
	pixi.renderer.lineScale = pixi.renderer.fixedWidth > pixi.renderer.realHeight * 0.75 ? pixi.renderer.realHeight / 18.75 : pixi.renderer.fixedWidth / 14.0625;
	
	// ========此处声明监听器=========
	// ==Passive 兼容性检测，代码来自 Moz://a==
	let passiveIfSupported = false;
	try {
		pixi.view.addEventListener('test', null, Object.defineProperty({}, 'passive', { get: function() { passiveIfSupported = { passive: false }; } }));
	} catch(err) {}
	
	// ==Windows 对象 事件监听器==
	// 监听窗口尺寸修改事件，以实时修改舞台宽高和材质缩放值
	window.addEventListener('resize', () => { global.functions.resizeCanvas(pixi) });
	
	// ==舞台用户输入事件监听器==
	// 舞台触摸开始事件
	pixi.view.addEventListener('touchstart', (e) => {
		e.preventDefault();
		
		for (let touch of e.changedTouches) {
			let fingerId = touch.identifier;
			let fixedPosition = getCurrentInputPosition(touch);
			
			inputs.touches[fingerId] = Click.activate(fixedPosition.x, fixedPosition.y, 'touches', fingerId);
		}
	}, passiveIfSupported); // 设置 passive 为 false 是为了能在回调函数中调用 preventDefault()，下同
	
	// 舞台触摸移动事件
	pixi.view.addEventListener('touchmove', (e) => {
		e.preventDefault();
		
		for (let touch of e.changedTouches) {
			let fingerId = touch.identifier;
			let fixedPosition = getCurrentInputPosition(touch);
			
			inputs.touches[fingerId].move(fixedPosition.x, fixedPosition.y);
		}
	}, passiveIfSupported);
	
	// 舞台触摸结束事件
	pixi.view.addEventListener('touchend', (e) => {
		e.preventDefault();
		
		for (let touch of e.changedTouches) {
			let fingerId = touch.identifier;
			
			delete inputs.touches[fingerId];
			if (settings.showFinger && sprites.inputs.touches[fingerId]) {
				sprites.inputs.touches[fingerId].visible = false;
			}
		}
	}, passiveIfSupported);
	pixi.view.addEventListener('touchcancel', (e) => {
		e.preventDefault();
		
		for (let touch of e.changedTouches) {
			let fingerId = touch.identifier;
			
			delete inputs.touches[fingerId];
			if (settings.showFinger && sprites.inputs.touches[fingerId]) {
				sprites.inputs.touches[fingerId].visible = false;
			}
		}
	}, passiveIfSupported);
	
	// 舞台鼠标开始事件
	pixi.view.addEventListener('mousedown', (e) => {
		e.preventDefault();
		
		let btnId = e.button;
		let fixedPosition = getCurrentInputPosition(e);
		
		inputs.mouse[btnId] = Click.activate(fixedPosition.x, fixedPosition.y, 'mouse', btnId);
		inputs.isMouseDown[btnId] = true;
	}, passiveIfSupported);
	
	// 舞台鼠标移动事件
	pixi.view.addEventListener('mousemove', (e) => {
		e.preventDefault();
		
		for (let btnId in inputs.isMouseDown) {
			if (inputs.isMouseDown[btnId]) {
				let fixedPosition = getCurrentInputPosition(e);
				
				inputs.mouse[btnId].move(fixedPosition.x, fixedPosition.y);
			}
		}
	}, passiveIfSupported);
	
	// 舞台鼠标结束事件
	pixi.view.addEventListener('mouseup', (e) => {
		e.preventDefault();
		
		let btnId = e.button;
		
		delete inputs.mouse[btnId];
		delete inputs.isMouseDown[btnId];
		
		if (settings.showFinger && sprites.inputs.mouse[btnId]) {
			sprites.inputs.mouse[btnId].visible = false;
		}
	}, passiveIfSupported);
	pixi.view.addEventListener('mouseout', (e) => {
		e.preventDefault();
		
		for (let btnId in inputs.mouse) {
			if (inputs.isMouseDown[btnId]) {
				delete inputs.mouse[btnId];
				delete inputs.isMouseDown[btnId];
				
				if (settings.showFinger && sprites.inputs.mouse[btnId]) {
					sprites.inputs.mouse[btnId].visible = false;
				}
			}
		}
	}, passiveIfSupported);
	
	// 校正输入点的位置
	function getCurrentInputPosition(e) {
		let output = { x: 0, y: 0 };
		if (!fullscreen.check(pixi.view)) {
			output.x = e.pageX - pixi.view.offsetLeft;
			output.y = e.pageY - pixi.view.offsetTop;
		} else {
			output.x = e.clientX;
			output.y = e.clientY;
		}
		return output;
	}
	
	sprites = CreateChartSprites(_chart.data, pixi); // 创建所有的谱面精灵
	CreateChartInfoSprites(sprites, pixi, true); // 创建谱面信息文字
	
	if (settings.accIndicator) // 根据需求创建准度指示器
		sprites.accIndicator = CreateAccurateIndicator(pixi, settings.accIndicatorScale, settings.challengeMode);
	score.init(sprites.totalNotes.length, settings.challengeMode); // 计算分数
	
	if (settings.showJudgementRealTime) {
		let judge = {
			container: new PIXI.Container(),
			judge: new PIXI.Text('Judge: False', { fill:'white', fontSize: 8 }),
			acc: new PIXI.Text('Acc: 0%', { fill:'white', fontSize: 8 }),
			perfect: new PIXI.Text('Perfect: 0', { fill:'white', fontSize: 8 } ),
			good: new PIXI.Text('Good: 0', { fill:'white', fontSize: 8 } ),
			bad: new PIXI.Text('Bad: 0', { fill:'white', fontSize: 8 } ),
			miss: new PIXI.Text('Miss: 0', { fill:'white', fontSize: 8 } )
		}
		
		judge.container.addChild(judge.judge, judge.acc, judge.perfect, judge.good, judge.bad, judge.miss);
		
		judge.acc.position.y = judge.judge.height;
		judge.perfect.position.y = judge.acc.position.y + judge.acc.height;
		judge.good.position.y = judge.perfect.position.y + judge.perfect.height;
		judge.bad.position.y = judge.good.position.y + judge.good.height;
		judge.miss.position.y = judge.bad.position.y + judge.bad.height;
		
		judge.container.position.set(8);
		
		pixi.stage.addChild(judge.container);
		sprites.judgeRealTime = judge;
	}
	
	pixi.ticker.add(CalculateChartActualTime);
	if (settings.clickAnimate) pixi.ticker.add(CalculateClickAnimateActualTime); // 启动 Ticker 循环
	
	// 适配 AudioContext 的 baseLatency
	_chart.audio.baseLatency = _chart.audio.context.audioContext.baseLatency ? _chart.audio.context.audioContext.baseLatency : 0;
	
	{
		let startAnimateTimer = 0;
		
		let startAnimateTicker = function() {
			startAnimateTimer += 1 / pixi.ticker.FPS;
			
			if (sprites.headInfos.position.y < 0) {
				sprites.headInfos.position.y = -sprites.headInfos.height + sprites.headInfos.height * (startAnimateTimer / 0.5);
				sprites.headInfos.alpha = 1 * (startAnimateTimer / 0.5);
				
			} else {
				sprites.headInfos.position.y = 0;
				sprites.headInfos.alpha = 1;
			}
			
			if (sprites.footInfos.position.y > 0) {
				sprites.footInfos.position.y = sprites.headInfos.height - sprites.headInfos.height * (startAnimateTimer / 0.5);
				sprites.footInfos.alpha = 1 * (startAnimateTimer / 0.5);
				
			} else {
				sprites.footInfos.position.y = 0;
				sprites.footInfos.alpha = 1;
			}
			
			if (sprites.titlesBig.alpha < 1 && startAnimateTimer < 5) {
				sprites.titlesBig.alpha += 2 / pixi.ticker.FPS;
			}
			
			if (sprites.titlesBig.alpha > 0 && startAnimateTimer >= 5.5) {
				sprites.titlesBig.alpha -= 2 / pixi.ticker.FPS;
			}
			
			if (startAnimateTimer >= 6) {
				sprites.titlesBig.alpha = 0;
				
				stat.isTransitionEnd = true;
				global.audio = _chart.audio.play({start: 0, volume: settings.musicVolume}); // 播放音乐并正式启动模拟器
				if (stat.isPaused)
					_chart.audio.pause();
				
				pixi.ticker.remove(startAnimateTicker);
			}
		};
		
		// 留给设备处理大量数据的时间
		setTimeout(() => {
			stat.isTransitionEnd = false;
			pixi.ticker.add(startAnimateTicker);
		}, 1000);
		
		for (let name in textures.sound) {
			textures.sound[name].play({ volume:0 });
		}
	}
	
	document.getElementById('game-btn-pause').innerHTML = '<i class="mdui-icon material-icons">&#xe034;</i> 暂停';
	
	if (settings.showPerformanceIndicator) {
		sprites.performanceIndicator = new Stats();
		sprites.performanceIndicator.showPanel(1);
		
		document.body.appendChild(sprites.performanceIndicator.dom);
		
		sprites.performanceIndicator.dom.style.position = 'fixed';
		sprites.performanceIndicator.dom.style.top = '0px';
		sprites.performanceIndicator.dom.style.left = 'unset';
		sprites.performanceIndicator.dom.style.right = '0px';
	}
}

function setCanvasFullscreen(forceInDocumentFull = false) {
	if (!pixi || !pixi.view) return;
	
	/**
	if (!fullscreen.enabled) {
		mdui.alert('你的浏览器不支持全屏！', '前方高能');
		return;
	}
	**/
	
	stat.isFullscreen = true;
	fullscreen.toggle(pixi.view, (forceInDocumentFull ? true : (!fullscreen.enabled || fullscreen.type == 2 ? true : false)));
}

function gamePause() {
	if (!pixi) return;
	if (!_chart.audio) return;
	
	if (!stat.isPaused) {
		_chart.audio.pause();
		sprites.comboText.children[1].text = 'Paused';
		stat.isPaused = true;
		
		document.getElementById('game-btn-pause').innerHTML = '<i class="mdui-icon material-icons">&#xe037;</i> 继续';
		
	} else {
		global.audio = _chart.audio.play({start: _chart.audio.duration * global.audio.progress, volume: settings.musicVolume});
		sprites.comboText.children[1].text = settings.autoPlay ? 'Autoplay' : 'combo';
		stat.isPaused = false;
		
		document.getElementById('game-btn-pause').innerHTML = '<i class="mdui-icon material-icons">&#xe034;</i> 暂停';
	}
}

function gameRestart() {
	if (!pixi) return;
	if (!stat.isTransitionEnd || stat.isRetrying) return;
	
	stat.isRetrying = true;
	
	let fixedWidth = pixi.renderer.fixedWidth;
	let fixedWidthOffset = pixi.renderer.fixedWidthOffset;
	let noteSpeed = pixi.renderer.noteSpeed;
	let noteScale = pixi.renderer.noteScale;
	let rendererResolution = pixi.renderer.resolution;
	
	stat.isPaused = false;
	_chart.audio.stop();
	pixi.ticker.remove(CalculateChartActualTime);
	
	if (sprites.gameEnd) {
		sprites.gameEnd.container.destroy();
		sprites.gameEnd = null;
	}
	
	for (let container of sprites.containers) {
		container.position.set(pixi.renderer.realWidth / 2, pixi.renderer.realHeight / 2);
		container.angle = 0;
		
		container.children[0].alpha = 0;
		container.children[0].tint = settings.showApStatus ? 0xFFECA0 : 0xFFFFFF;
		
		for (let i = 1; i < container.children.length; i++) {
			if (!container.children[i]) continue;
			
			let noteContainer = container.children[i];
			noteContainer.position.y = 0;
			
			if (noteContainer.speedNotes && noteContainer.speedNotes.length > 0) {
				for (let note of noteContainer.speedNotes) {
					note.position.y = (
						((note.offsetY * noteSpeed) - 0) * note.speed
					) * noteContainer.noteDirection * -1;
				}
			}
		}
	}
	
	for (let note of sprites.totalNotes) {
		note.alpha = 1;
		note.visible = true;
		
		note.score = 0;
		note.accType = 0;
		note.isScored = false;
		note.isProcessed = false;
		
		note.isPressing = false;
		note.pressTime = null;
		
		if (note.type == 3) {
			let rawNoteOffsetY = note.offsetY * noteSpeed;
			let rawHoldLength = (note.holdLength * noteSpeed * rendererResolution) / (noteScale * rendererResolution);
			
			note.children[1].height = rawHoldLength;
			note.children[2].position.y = -rawHoldLength;
			
			if (note.isAbove) note.position.y = -rawNoteOffsetY;
			else note.position.y = rawNoteOffsetY;
		}
	}
	
	sprites.headInfos.position.y = -sprites.headInfos.height;
	sprites.footInfos.position.y = sprites.headInfos.height;
	
	sprites.comboText.alpha = 0;
	sprites.comboText.children[0].text = '0';
	sprites.comboText.children[1].text = settings.autoPlay ? 'Autoplay' : 'combo';
	sprites.scoreText.text = '0000000';
	
	judgements = new Judgements();
	global.audio = null;
	
	score.init(sprites.totalNotes.length, settings.challengeMode);
	pixi.ticker.add(CalculateChartActualTime);
	
	_chart.audio.baseLatency = _chart.audio.context.audioContext.baseLatency ? _chart.audio.context.audioContext.baseLatency : 0;
	
	{
		let startAnimateTimer = 0;
		
		let startAnimateTicker = function() {
			startAnimateTimer += 1 / pixi.ticker.FPS;
			
			if (sprites.headInfos.position.y < 0) {
				sprites.headInfos.position.y = -sprites.headInfos.height + sprites.headInfos.height * (startAnimateTimer / 0.5);
				sprites.headInfos.alpha = 1 * (startAnimateTimer / 0.5);
				
			} else {
				sprites.headInfos.position.y = 0;
				sprites.headInfos.alpha = 1;
			}
			
			if (sprites.footInfos.position.y > 0) {
				sprites.footInfos.position.y = sprites.headInfos.height - sprites.headInfos.height * (startAnimateTimer / 0.5);
				sprites.footInfos.alpha = 1 * (startAnimateTimer / 0.5);
				
			} else {
				sprites.footInfos.position.y = 0;
				sprites.footInfos.alpha = 1;
			}
			
			if (sprites.titlesBig.alpha < 1 && startAnimateTimer < 5) {
				sprites.titlesBig.alpha += 2 / pixi.ticker.FPS;
			}
			
			if (sprites.titlesBig.alpha > 0 && startAnimateTimer >= 5.5) {
				sprites.titlesBig.alpha -= 2 / pixi.ticker.FPS;
			}
			
			if (startAnimateTimer >= 6) {
				sprites.titlesBig.alpha = 0;
				
				stat.isTransitionEnd = true;
				global.audio = _chart.audio.play({start: 0, volume: settings.musicVolume}); // 播放音乐并正式启动模拟器
				if (stat.isPaused)
					_chart.audio.pause();
				
				pixi.ticker.remove(startAnimateTicker);
			}
		};
		
		setTimeout(() => {
			stat.isTransitionEnd = false;
			stat.isRetrying = false;
			pixi.ticker.add(startAnimateTicker);
		}, 200); // 这里就不需要很多时间了
	}
	
	document.getElementById('game-btn-pause').innerHTML = '<i class="mdui-icon material-icons">&#xe034;</i> 暂停';
}