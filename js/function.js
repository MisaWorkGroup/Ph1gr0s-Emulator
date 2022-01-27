'use strict';
// ==声明 global.finctions==
// 重修改舞台尺寸
global.functions = {};
global.functions.resizeCanvas = function () {
	if (!pixi) return;
	
	let canvasBox = document.getElementById('game-canvas-box');
	
	if (stat.isFullscreen && fullscreen.check(pixi.view)) {
		pixi.renderer.resize(document.documentElement.clientWidth, document.documentElement.clientHeight);
	} else {
		if (stat.isFullscreen) pixi.renderer.resize(1, 1);
		pixi.renderer.resize(canvasBox.offsetWidth, canvasBox.offsetWidth * (1 / settings.windowRatio));
		stat.isFullscreen = false;
	}
	
	pixi.renderer.realWidth = pixi.renderer.width / pixi.renderer.resolution;
	pixi.renderer.realHeight = pixi.renderer.height / pixi.renderer.resolution;
	
	pixi.renderer.fixedWidth = pixi.renderer.realWidth <= pixi.renderer.realHeight / 9 * 16 ? pixi.renderer.realWidth : pixi.renderer.realHeight / 9 * 16;
	pixi.renderer.fixedWidthOffset = (pixi.renderer.realWidth - pixi.renderer.fixedWidth) / 2;
	
	pixi.renderer.noteSpeed = pixi.renderer.realHeight * 0.6;
	pixi.renderer.noteScale = pixi.renderer.fixedWidth / settings.noteScale;
	
	pixi.renderer.lineScale = pixi.renderer.fixedWidth > pixi.renderer.realHeight * 0.75 ? pixi.renderer.realHeight / 18.75 : pixi.renderer.fixedWidth / 14.0625;
	
	ResizeChartSprites(sprites, pixi.renderer.realWidth, pixi.renderer.realHeight, settings.noteScale);
};

// Note 排序
global.functions.sortNote = (a, b) => a.realTime - b.realTime || a.lineId - b.lineId || a.id - b.id;


// 游戏分数相关
const score = {
	init: function(totalNotes, isChallenge = false) {
		this.totalNotes = totalNotes;
		this.challenge = isChallenge;
		
		this.score = 0;
		this.combo = 0;
		this.maxCombo = 0;
		this.judge = 0;
		this.apType = 2;
		
		this.perfect = 0;
		this.good = 0;
		this.bad = 0;
		this.miss = 0;
		
		this.acc = 0.00000;
		this.perfectAcc = [0, 0];
		this.goodAcc = [0, 0];
		this.badAcc = [0, 0];
		this.missAcc = [0, 0];
		
		this.scorePerNote = (isChallenge ? 1000000 : 900000) / totalNotes;
		
		return this;
	},
	
	addCombo: function(type, acc = 0) {
		if (type == 4) {
			this.perfect += 1;
			this.combo += 1;
			
			if (!!acc)
				this.perfectAcc[(acc < 0 ? 0 : 1)] += 1;
			
		} else if (type == 3) {
			this.good += 1;
			this.combo += 1;
			
			if (!!acc)
				this.goodAcc[(acc < 0 ? 0 : 1)] += 1;
			
		} else if (type == 2) {
			this.bad += 1;
			this.combo = 0;
			
			if (!!acc)
				this.badAcc[(acc < 0 ? 0 : 1)] += 1;
			
		} else {
			this.miss += 1;
			this.combo = 0;
			
			if (!!acc)
				this.missAcc[(acc < 0 ? 0 : 1)] += 1;
		}
		
		// 最大连击
		if (this.combo > this.maxCombo) {
			this.maxCombo = this.combo;
		}
		
		// 分数计算
		this.score = this.scorePerNote * this.perfect + this.scorePerNote * this.good * 0.65;
		if (!this.challenge)
				this.score += (this.maxCombo / this.totalNotes) * 100000;
		this.score = this.score.toFixed(0);
		
		// 判定等级计算
		if (this.score < 700000 && this.score > 0) {
			this.judge = 0;
		} else if (this.score < 820000 && this.score >= 700000) {
			this.judge = 1;
		} else if (this.score < 880000 && this.score >= 820000) {
			this.judge = 2;
		} else if (this.score < 920000 && this.score >= 880000) {
			this.judge = 3;
		} else if (this.score < 960000 && this.score >= 920000) {
			this.judge = 4;
		} else if (this.score < 1000000 && this.score >= 960000) {
			this.judge = 5;
		} else if (this.score == 1000000) {
			this.judge = 6;
		} else {
			this.judge = -1;
		}
		
		// Acc 计算
		this.acc = ((this.perfect + this.good * 0.65) / (this.perfect + this.good + this.bad + this.miss) * 100).toFixed(2);
		
		// 分数文本补零
		this.scoreText = this.score + '';
		while (7 > this.scoreText.length) {
			this.scoreText = '0' + this.scoreText;
		}
		
		// 判定当前是否为 AP 或者 FC
		if ((this.bad > 0 || this.miss > 0) && this.apType > 0) {
			this.apType = 0;
			
			if (settings.showApStatus) {
				for (let container of sprites.containers) {
					container.children[0].tint = 0xFFFFFF;
				}
			}
			
		} else if (this.good > 0 && this.apType > 1) {
			this.apType = 1;
			
			if (settings.showApStatus) {
				for (let container of sprites.containers) {
					container.children[0].tint = 0xB4E1FF;
				}
			}
		}
		
		// 推送分数到游戏 UI
		sprites.scoreText.text = this.scoreText;
		
		// 推送连击到游戏 UI
		if (this.combo > 2) {
			sprites.comboText.alpha = 1;
			sprites.comboText.children[0].text = this.combo;
			
		} else {
			sprites.comboText.alpha = 0;
		}
		
		// 实时显示当前判定状态
		if (sprites.judgeRealTime) {
			switch (this.judge) {
				case 0: {
					sprites.judgeRealTime.judge.text = 'Judge: False';
					break;
				}
				case 1: {
					sprites.judgeRealTime.judge.text = 'Judge: C';
					break;
				}
				case 2: {
					sprites.judgeRealTime.judge.text = 'Judge: B';
					break;
				}
				case 3: {
					sprites.judgeRealTime.judge.text = 'Judge: A';
					break;
				}
				case 4: {
					sprites.judgeRealTime.judge.text = 'Judge: S';
					break;
				}
				case 5: {
					sprites.judgeRealTime.judge.text = 'Judge: V';
					break;
				}
				case 6: {
					sprites.judgeRealTime.judge.text = 'Judge: Phi';
					break;
				}
				default: {
					sprites.judgeRealTime.judge.text = 'Judge: None';
				}
			}
			
			sprites.judgeRealTime.acc.text = 'Acc: ' + this.acc + '%';
			sprites.judgeRealTime.perfect.text = 'Perfect: ' + this.perfect;
			sprites.judgeRealTime.good.text = 'Good: ' + this.good;
			sprites.judgeRealTime.bad.text = 'Bad: ' + this.bad;
			sprites.judgeRealTime.miss.text = 'Miss: ' + this.miss;
		}
		
		return this;
	}
};

// 全屏相关。代码来自 lchzh3473
const fullscreen = {
	// 切换全屏状态
	toggle(elem, inDocument = false) {
		// if (!this.enabled) return false;
		if (this.element) {
			if (!inDocument) {
				if (document.exitFullscreen) return document.exitFullscreen();
				if (document.cancelFullScreen) return document.cancelFullScreen();
				if (document.webkitCancelFullScreen) return document.webkitCancelFullScreen();
				if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
				if (document.msExitFullscreen) return document.msExitFullscreen();
			}
			
			if (this.element == elem) {
				elem.style.position = 'relative';
				elem.style.top = 'unset';
				elem.style.left = 'unset';
				elem.style.zIndex = 'unset';
				document.body.style.overflow = 'auto';
				
				document.inDocumentFullscreenElement = null;
				if (global.functions.resizeCanvas) global.functions.resizeCanvas();
				return true;
			}
			
			return false;
			
		} else {
			if (!inDocument) {
				if (!(elem instanceof HTMLElement)) elem = document.body;
				if (elem.requestFullscreen) return elem.requestFullscreen();
				if (elem.webkitRequestFullscreen) return elem.webkitRequestFullscreen();
				if (elem.mozRequestFullScreen) return elem.mozRequestFullScreen();
				if (elem.msRequestFullscreen) return elem.msRequestFullscreen();
			}
			
			if (elem != document.body) {
				elem.style.position = 'fixed';
				elem.style.top = '0';
				elem.style.left = '0';
				elem.style.zIndex = '5050';
				document.body.style.overflow = 'hidden';
				
				document.inDocumentFullscreenElement = elem;
				if (global.functions.resizeCanvas) global.functions.resizeCanvas();
				return true;
			}
			
			return false;
		}
	},
	
	// 检查当前全屏的元素
	check(elem) {
		if (!(elem instanceof HTMLElement)) elem = document.body;
		return this.element == elem;
	},
	
	// 返回当前浏览器的全屏组件。
	get element() {
		return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.inDocumentFullscreenElement;
	},
	
	// 返回当前浏览器是否支持全屏 API。
	get enabled() {
		return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled);
	},
	
	// 返回当前的全屏模式。2 == 网页内全屏，1 == API 全屏，0 == 没有开启全屏
	get type() {
		if (document.inDocumentFullscreenElement) {
			return 2;
		} else if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
			return 1;
		} else {
			return 0;
		}
	}
};

// 特殊点击事件相关，代码参考 lchzh3473
const specialClick = {
	clicks : [0, 0, 0, 0],
	functions : [
		() => { gamePause() },
		() => { gameRestart() },
		() => {},
		() => { setCanvasFullscreen() }
	],
	click : function(id) {
		let currentTime = Date.now();
		if (currentTime - this.clicks[id] < 300) {
			this.functions[id]();
		}
		this.clicks[id] = currentTime;
	}
}

/***
 * @function 向 <div id="loading-*"> 模块推送进度信息
 * @param id {string} 该进度模块的具体 ID
 * @param text {string} 推送的进度名称
 * @param [progress] {num} 推送的进度百分比，提交的值为小数
***/
function setProgress(id, text, progress = null) {
	let progressDiv  = document.getElementById(id);
	let progressText = progressDiv.getElementsByClassName('text')[0];
	let progressBar  = progressDiv.getElementsByClassName('progress')[0];
	progressBar = progressBar.getElementsByTagName('div')[0];
	
	if (!progressDiv) return;
	
	progressText.innerHTML = text;
	
	if (progress != null && progress >= 0) {
		progressBar.className = 'mdui-progress-determinate';
		progressBar.style.width = progress * 100 + '%';
		
	} else {
		progressBar.className = 'mdui-progress-indeterminate';
	}
	
	mdui.mutation(progressDiv);
}

/***
 * @function 为给定的 select 元素自动填充选项。可传入 object 或者 array。传
 *     入 array 时可选 array 中 object 的键名作为显示的文本
 * @param id {string} select 元素的 id
 * @param object {object|array} 欲填充的对象或数组
 * @param [keyName] {string} 数组内对象的指定键名
***/
function createSelection(id, object, keyName = null) {
	let select = document.getElementById(id);
	
	select.innerHTML = '';
	
	if (object instanceof Array) {
		for (let i = 0; i < object.length; i++) {
			let obj = object[i];
			let option = document.createElement('option');
			option.value = i;
			if (keyName)
				option.innerHTML = obj[keyName];
			else
				option.innerHTML = obj;
			select.appendChild(option);
		}
	} else if (object instanceof Object) {
		for (let name in object) {
			let option = document.createElement('option');
			option.innerHTML = option.value = name;
			select.appendChild(option);
		}
	}
}

/***
 * @function 为给定的 mdui-menu 元素自动填充选项。可传入 object 或者 array。传
 *     入 array 时可选 array 中 object 的键名作为显示的文本
 * @param id {string} mdui-menu 元素的 id
 * @param object {object|array} 欲填充的对象或数组
 * @param targetValueName {string} 选中项目后会被修改值的变量
 * @param [anotherTargetValue] {string} 选中项目后用于修改值的变量，应该是一个 object
 * @param [keyName] {string} 数组内对象的指定键名
 * @param [defalutValue] {string|number} 默认值。设定为 -1 则默认值为倒数第一个项目
 * @param [extraJsText] {string} 选中后额外运行的 Js 代码
 * @param [changedTextId] {string} 选中后修改这个 Dom 的内容为“当前选择了：...”
***/
function createMenuItems(id, object, targetValueName, anotherTargetValue = null, keyName = null, defaultValue = null, extraJsText = null, changedTextId = null) {
	let menu = document.getElementById(id);
	let selectedValue = NaN;
	
	menu.innerHTML = '';
	
	let div = document.createElement('div');
	let a = document.createElement('a');
	
	if (object instanceof Array) {
		for (let i = 0; i < object.length; i++) {
			let obj = object[i];
			let innerHtml = '';
			
			if ((keyName ? obj[keyName] : obj).indexOf('.') == 0) continue;
			
			div = document.createElement('div');
			a = document.createElement('a');
			
			if (defaultValue == -1 && isNaN(selectedValue)) {
				innerHtml = '<i class="mdui-menu-item-icon mdui-icon material-icons">&#xe5ca;</i>';
				selectedValue = i;
				
			} else if (defaultValue == i) {
				innerHtml = '<i class="mdui-menu-item-icon mdui-icon material-icons">&#xe5ca;</i>';
				selectedValue = i;
				
			} else {
				innerHtml = '<i class="mdui-menu-item-icon mdui-icon material-icons"></i>';
			}
			
			if (keyName)
				innerHtml += obj[keyName];
			else
				innerHtml += obj;
			
			a.setAttribute('onclick',
				'selectMenuItem(\'' + menu.id.replace(/'/g, '\'') + '\', this' + (changedTextId ? ', \'' + changedTextId + '\'' : '') + ');' +
				targetValueName + ' = \'' + i + '\'' +
				(extraJsText ? ';' + extraJsText : '')
			);
			a.setAttribute('menu-value', keyName ? obj[keyName] : obj);
			
			a.className = 'mdui-ripple';
			div.className = 'mdui-menu-item';
			a.innerHTML = innerHtml;
			div.appendChild(a);
			menu.appendChild(div);
		}
		
	} else if (object instanceof Object) {
		for (let name in object) {
			let innerHtml = '';
			
			if (name.indexOf('.') == 0) continue;
			
			div = document.createElement('div');
			a = document.createElement('a');
			
			if (defaultValue == -1 && isNaN(selectedValue)) {
				innerHtml = '<i class="mdui-menu-item-icon mdui-icon material-icons">&#xe5ca;</i>' + name;
				selectedValue = 0;
				
			} else if (defaultValue == name) {
				innerHtml = '<i class="mdui-menu-item-icon mdui-icon material-icons">&#xe5ca;</i>' + name;
				selectedValue = 0;
				
			} else {
				innerHtml = '<i class="mdui-menu-item-icon mdui-icon material-icons"></i>' + name;
			}
			
			a.setAttribute('onclick',
				'selectMenuItem(\'' + menu.id.replace(/'/g, '\'') + '\', this' + (changedTextId ? ', \'' + changedTextId + '\'' : '') + ');' +
				targetValueName + ' = ' + anotherTargetValue + '[\'' + name.replace(/'/g, '\'') + '\']' +
				(extraJsText ? ';' + extraJsText : '')
			);
			a.setAttribute('menu-value', name);
			
			a.className = 'mdui-ripple';
			div.className = 'mdui-menu-item';
			a.innerHTML = innerHtml;
			div.appendChild(a);
			menu.appendChild(div);
		}
	}
	
	if (!isNaN(selectedValue)) {
		selectMenuItem(menu.id, a, changedTextId);
	}
	
	mdui.mutation(menu);
}

/***
 * @function 该方法用于修改菜单相关 UI
 * @param menuId {string} 菜单的 ID
 * @param itemDom {HTMLElementObject} 菜单项目的 Dom，一般用 `this` 即可
 * @param [textId] {string} 如果传入，将自动修改该组件的内容
***/
function selectMenuItem(menuId, itemDom, textId = null) {
	let menuDom = document.getElementById(menuId);
	let menuItems = menuDom.getElementsByClassName('mdui-menu-item');
	
	for (let menuItem of menuItems) {
		let a = menuItem.getElementsByTagName('a')[0];
		let icon = a.getElementsByClassName('mdui-menu-item-icon')[0];
		
		icon.innerHTML = '';
	}
	
	itemDom.getElementsByClassName('mdui-menu-item-icon')[0].innerHTML = '&#xe5ca;';
	
	if (textId) {
		document.getElementById(textId).innerHTML = '当前选择了：' + itemDom.getAttribute('menu-value');
	}
}

/***
 * @function 对图片进行模糊处理。此处使用了 StackBlur 模块
 * @param _texture {object} 传入 BaseTextute、Image 或者 Canvas
 * @param [radius] {number} 模糊半径，默认为 10
 * @return {object} 返回已处理好的 Canvas 元素
***/
function BlurImage(_texture, radius = 10) {
	let canvas = document.createElement('canvas');
	let texture = null;
	
	if (_texture instanceof PIXI.BaseTexture) {
		texture = _texture.resource.source;
	} else {
		texture = _texture;
	}
	
	StackBlur.image(texture, canvas, radius);
	
	return canvas;
}

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
	notes.tap.sort(global.functions.sortNote);
	notes.drag.sort(global.functions.sortNote);
	notes.hold.sort(global.functions.sortNote);
	notes.flick.sort(global.functions.sortNote);
	notesTotal.sort(global.functions.sortNote);
	
	notes.total = notesTotal;
	
	return {
		judgeLines: judgeLines,
		notes: notes,
		offset: chart.offset
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
		note.offsetY      = note.floorPosition;
		note.holdLength   = note.realHoldTime * note.speed;
		note.lineId       = judgeLine.id;
		note.id           = id;
		note.isAbove      = isAbove;
		note.score        = 0;
		note.isScored     = false;
		note.isProcessed  = false;
		note.isPressing   = false;
		note.pressTime    = 0;
		note.accType      = 0;
		
		// 兼容 PEC 谱面
		if (!note.offsetY) {
			for (let i of judgeLine.speedEvents) {
				if (note.realTime < i.startRealTime) continue;
				if (note.realTime > i.endRealTime) continue;
				
				noteSpeed = i.value;
				
				noteSpeedChangedPosition = i.floorPosition;
				noteSpeedChangedRealTime = i.startRealTime;
				
				break;
			}
			
			note.offsetY = (note.realTime - noteSpeedChangedRealTime) * noteSpeed + noteSpeedChangedPosition;
		}
		
		if (!note.holdLength) {
			holdEndRealTime = note.realTime + note.realHoldTime;
			holdHeadPosition = (note.realTime - noteSpeedChangedRealTime) * noteSpeed + noteSpeedChangedPosition;
			
			for (let i of judgeLine.speedEvents) {
				if (holdEndRealTime < i.startRealTime) continue;
				if (holdEndRealTime > i.endRealTime) continue;
				
				holdEndPosition = (holdEndRealTime - i.startRealTime) * i.value + i.floorPosition;
				break;
			}
			
			note.holdEndPosition = holdEndPosition;
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
 * @param pixi {object} 如果传入，则自动向这个 Pixi 对象提交精灵
 * @return {object} 返回一个存放 Containers 精灵数组、Notes 精灵数组和 FPS 精灵的对象
***/
function CreateChartSprites(chart, pixi) {
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
	let realWidth = pixi.renderer.realWidth;
	let realHeight = pixi.renderer.realHeight;
	let fixedWidth = pixi.renderer.fixedWidth;
	let fixedWidthOffset = pixi.renderer.fixedWidthOffset;
	let lineScale = pixi.renderer.lineScale;
	let noteScale = pixi.renderer.noteScale;
	
	let output = {
		containers: [],
		totalNotes: [],
		tapholeNotes: [],
		dragNotes: [],
		flickNotes: [],
		inputs: {
			touches: {},
			mouse: {}
		},
		clickAnimate: []
	};
	
	// 创建背景图
	if (settings.background) {
		let background = new PIXI.Sprite(settings.backgroundBlur ? _chart.imageBlur : _chart.image);
		let bgScaleWidth = fixedWidth / _chart.image.width;
		let bgScaleHeight = realHeight / _chart.image.height;
		let bgScale = bgScaleWidth > bgScaleHeight ? bgScaleWidth : bgScaleHeight;
		
		let backgroundCover = new PIXI.Graphics();
		
		backgroundCover.beginFill(0x000000);
		backgroundCover.drawRect(0, 0, background.width, background.height);
		backgroundCover.endFill();
		
		backgroundCover.position.x = -background.width / 2;
		backgroundCover.position.y = -background.height / 2;
		backgroundCover.alpha = 1 - settings.backgroundDim;
		background.addChild(backgroundCover);
		
		// background.alpha = settings.backgroundDim;
		background.anchor.set(0.5);
		background.scale.set(bgScale);
		background.position.set(realWidth / 2, realHeight / 2);
		
		output.background = background;
		pixi.stage.addChild(background);
	}
	
	// 绘制判定线与 Note
	for (let _judgeLine of chart.judgeLines) {
		let container = new PIXI.Container();
		let judgeLine = new PIXI.Sprite(textures.judgeLine);
		let notesAbove = new PIXI.Container();
		let notesBelow = new PIXI.Container();
		
		// judgeLine.raw = _judgeLine;
		for (let name in _judgeLine) {
			judgeLine[name] = _judgeLine[name];
		}
		
		// 设置判定线中心点和宽高
		judgeLine.anchor.set(0.5);
		judgeLine.height = lineScale * 18.75 * 0.008;
		judgeLine.width = judgeLine.height * judgeLine.texture.width / judgeLine.texture.height * 1.042;
		
		// 调整判定线位置
		judgeLine.position.set(0, 0);
		judgeLine.zIndex = 1;
		
		if (settings.showApStatus) {
			judgeLine.tint = 0xFFECA0;
		}
		
		if (settings.developMode) {
			let judgeLineName = new PIXI.Text(_judgeLine.id, { fill: 'rgb(255,100,100)' });
			judgeLineName.anchor.set(0.5, 1);
			judgeLineName.position.set(0);
			judgeLine.addChild(judgeLineName);
		}
		
		notesAbove.noteDirection = 1;
		notesBelow.noteDirection = -1;
		
		for (let _note of _judgeLine.notes) {
			let note;
			
			if (_note.type == 3) {
				let hold = new PIXI.Container();
				let holdHead = new PIXI.Sprite(textures['holdHead' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')]);
				let holdBody = new PIXI.Sprite(textures['holdBody' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')]);
				let holdEnd = new PIXI.Sprite(textures.holdEnd);
				
				holdHead.anchor.set(0.5);
				holdBody.anchor.set(0.5, 1);
				holdEnd.anchor.set(0.5, 1);
				
				holdBody.height = _note.holdLength * pixi.renderer.noteSpeed / noteScale;
				
				holdHead.position.set(0, holdHead.height / 2);
				holdBody.position.set(0, 0);
				holdEnd.position.set(0, -holdBody.height);
				
				hold.addChild(holdHead);
				hold.addChild(holdBody);
				hold.addChild(holdEnd);
				
				hold.zIndex = 2;
				
				note = hold;
				
			} else {
				note = new PIXI.Sprite(textures.tap);
				
				note.anchor.set(0.5);
				note.zIndex = 3;
				
				if (_note.type == 1) note.texture = textures['tap' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')];
				else if (_note.type == 2) note.texture = textures['drag' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')];
				else if (_note.type == 4) note.texture = textures['flick' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')];
			}
			
			if (settings.developMode) {
				let noteName = new PIXI.Text(_note.lineId + (_note.isAbove ? '+' : '-') + _note.id, { fill: 'rgb(100,255,100)' });
				noteName.scale.set(1 / (pixi.renderer.width / settings.noteScale));
				noteName.anchor.set(0.5, 1);
				noteName.position.set(0);
				note.addChild(noteName);
			}
			
			note.scale.set(noteScale);
			note.position.x = (_note.positionX.toFixed(6) * 0.109) * (fixedWidth / 2);
			note.position.y = _note.offsetY * (realHeight * 0.6) * (_note.isAbove ? -1 : 1);
			
			// note.raw = _note;
			for (let name in _note) {
				note[name] = _note[name];
			}
			
			if (_note.isAbove) notesAbove.addChild(note);
			else note.angle = 180, notesBelow.addChild(note);
			
			output.totalNotes.push(note);
			
			/**
			if (_note.type == 1 || _note.type == 3) {
				output.tapholeNotes.push(note);
			} else if (_note.type == 2) {
				output.dragNotes.push(note);
			} else if (_note.type == 4) {
				output.flickNotes.push(note);
			}
			**/
		}
		
		// 还是 Note 重排序
		output.totalNotes.sort(global.functions.sortNote);
		/**
		output.tapholeNotes.sort(global.functions.sortNote);
		output.dragNotes.sort(global.functions.sortNote);
		output.flickNotes.sort(global.functions.sortNote);
		**/
		container.addChild(judgeLine);
		
		if (notesAbove.children.length > 0) container.addChild(notesAbove);
		if (notesBelow.children.length > 0) container.addChild(notesBelow);
		
		pixi.stage.addChild(container);
		
		container.position.x = realWidth / 2;
		container.position.y = realHeight / 2;
		
		output.containers.push(container);
	}
	
	return output;
}

/***
 * @function 创建谱面信息文字，为了避免 CreateChartSprites() 看着很乱于是单独分出来一个函数
 * @param sprites {object} 用来存放所有精灵的对象
 * @param pixi {object} Pixi.js 应用对象
 * @param [requireFPSCounter] {bool} 是否需要创建一个 FPS 指示器，默认为 false
***/
function CreateChartInfoSprites(sprites, pixi, requireFPSCounter = false) {
	let realWidth = pixi.renderer.realWidth;
	let realHeight = pixi.renderer.realHeight;
	let fixedWidth = pixi.renderer.fixedWidth;
	let fixedWidthOffset = pixi.renderer.fixedWidthOffset;
	let lineScale = pixi.renderer.lineScale;
	
	// 头部信息合集
	if (!sprites.headInfos) {
		sprites.headInfos = new PIXI.Container();
	}
	if (!sprites.headInfos.parent)
		pixi.stage.addChild(sprites.headInfos);
	
	// 进度条
	if (!sprites.progressBar) {
		let progressBar = new PIXI.Sprite(textures.progressBar);
		
		progressBar.anchor.x = 1;
		progressBar.scale.set(fixedWidth / (1920 / pixi.renderer.resolution));
		
		sprites.headInfos.addChild(progressBar);
		sprites.progressBar = progressBar;
	}
	
	// 分数指示
	if (!sprites.scoreText) {
		let scoreText = new PIXI.Text('0000000', {
			fontFamily: 'Mina',
			fontSize: lineScale * 0.95 + 'px',
			fill: 'white'
		});
		
		scoreText.anchor.x = 1;
		scoreText.anchor.y = 0.5;
		
		sprites.headInfos.addChild(scoreText);
		sprites.scoreText = scoreText;
	}
	
	// Combo 指示
	if (!sprites.comboText) {
		let combo = new PIXI.Container();
		let number = new PIXI.Text('0', {
			fontFamily : 'Mina',
			fontSize : lineScale * 1.32 + 'px',
			fill : 'white'
		});
		let text = new PIXI.Text('combo', {
			fontFamily : 'Mina',
			fontSize : lineScale * 0.66 + 'px',
			fill : 'white'
		});
		
		if (settings.autoPlay) text.text = 'Autoplay';
		
		number.anchor.set(0.5);
		text.anchor.set(0.5, 1);
		
		combo.addChild(number);
		combo.addChild(text);
		
		sprites.headInfos.addChild(combo);
		sprites.comboText = combo;
	}
	
	// 大标题 Container
	if (!sprites.titlesBig) {
		sprites.titlesBig = new PIXI.Container();
		pixi.stage.addChild(sprites.titlesBig);
	}
	
	// 大标题-歌曲名称
	if (!sprites.songTitleBig) {
		let songTitleBig = new PIXI.Text(_chart.info.name || 'No Title', {
			fontFamily : 'Mina',
			fontSize : lineScale * 1.1 + 'px',
			fill : 'white',
			align : 'center'
		});
		
		songTitleBig.anchor.x = 0.5;
		
		sprites.titlesBig.addChild(songTitleBig);
		sprites.songTitleBig = songTitleBig;
	}
	
	// 大标题-背景图作者
	if (!sprites.bgAuthorBig) {
		let bgAuthorBig = new PIXI.Text('Illustration designed by ' + (_chart.info.illustrator || 'No name'), {
			fontFamily : 'Mina',
			fontSize: lineScale * 0.55 + 'px',
			fill : 'white',
			align : 'center'
		});
		
		bgAuthorBig.anchor.set(0.5, 1);
		
		sprites.titlesBig.addChild(bgAuthorBig);
		sprites.bgAuthorBig = bgAuthorBig;
	}
	
	// 大标题-谱面作者
	if (!sprites.chartAuthorBig) {
		let chartAuthorBig = new PIXI.Text('Level designed by ' + (_chart.info.designer || 'No name'), {
			fontFamily : 'Mina',
			fontSize: lineScale * 0.55 + 'px',
			fill : 'white',
			align : 'center'
		});
		
		chartAuthorBig.anchor.set(0.5, 1);
		
		sprites.titlesBig.addChild(chartAuthorBig);
		sprites.chartAuthorBig = chartAuthorBig;
	}
	
	// 底部歌曲信息合集
	if (!sprites.footInfos) {
		sprites.footInfos = new PIXI.Container();
	}
	if (!sprites.footInfos.parent)
		pixi.stage.addChild(sprites.footInfos);
	
	// 底部信息-歌曲名称侧边横线
	if (!sprites.songNameBar) {
		sprites.songNameBar = new PIXI.Sprite(textures.songNameBar);
		
		sprites.songNameBar.width = lineScale * 0.119;
		sprites.songNameBar.height = lineScale * 0.612;
		
		sprites.footInfos.addChild(sprites.songNameBar);
	}
	
	// 底部信息-歌曲名称
	if (!sprites.songTitle) {
		sprites.songTitle = new PIXI.Text(_chart.info.name || 'No title', {
			fontFamily : 'Mina',
			fontSize : lineScale * 0.63 + 'px',
			fill : 'white',
			align : 'center'
		});
		
		sprites.songTitle.anchor.y = 1;
		
		sprites.footInfos.addChild(sprites.songTitle);
	}
	
	// 底部信息-谱面等级
	if (!sprites.songDiff) {
		sprites.songDiff = new PIXI.Text(_chart.info.level || 'SP Lv.?', {
			fontFamily : 'Mina',
			fontSize : lineScale * 0.63 + 'px',
			fill : 'white',
			align : 'right'
		});
		
		sprites.songDiff.anchor.set(1);
		
		sprites.footInfos.addChild(sprites.songDiff);
	}
	
	// 对于超宽屏所创建的背景图盖板
	if (!sprites.backgroundCover) {
		let bgImage = new PIXI.Sprite(settings.backgroundBlur ? _chart.imageBlur : _chart.image);
		let bgBright = new PIXI.Graphics();
		let bgCovers = new PIXI.Container();
		
		let bgScaleWidth = realWidth / _chart.image.width;
		let bgScaleHeight = realHeight / _chart.image.height;
		let bgScale = bgScaleWidth > bgScaleHeight ? bgScaleWidth : bgScaleHeight;
		
		bgBright.beginFill(0x000000);
		bgBright.drawRect(0, 0, bgImage.width, bgImage.height);
		bgBright.endFill();
		
		bgBright.position.set(-bgImage.width / 2, -bgImage.height / 2);
		bgBright.alpha = 0.5;
		bgImage.addChild(bgBright);
		
		bgImage.anchor.set(0.5);
		bgImage.scale.set(bgScale);
		bgImage.position.set(realWidth / 2, realHeight / 2);
		bgImage.alpha = realWidth != fixedWidth ? 1 : 0;
		
		pixi.stage.addChild(bgImage);
		
		bgCovers.addChild(
			new PIXI.Graphics()
				.beginFill(0xFFFFFF)
				.drawRect(0, 0, fixedWidthOffset, realHeight)
				.endFill()
			, new PIXI.Graphics()
				.beginFill(0xFFFFFF)
				.drawRect(realWidth - fixedWidthOffset, 0, fixedWidthOffset, realHeight)
				.endFill()
		);
		
		bgImage.mask = bgCovers;
		
		sprites.backgroundCover = {
			image: bgImage,
			cover: bgCovers
		}
	}
	
	// FPS 计数器
	if (requireFPSCounter && !sprites.fps) {
		let fps = new PIXI.Text('00.00', {
			fontFamily : 'Mina',
			fontSize: lineScale * 0.8 + 'px',
			fill: 'rgba(255, 255, 255, 0.5)',
			align: 'right'
		});
		
		fps.anchor.set(1, 0);
		
		pixi.stage.addChild(fps);
		sprites.fps = fps;
		sprites.fpsInterval = setInterval(() => {
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
	}
	
	// 创建水印
	if (!sprites.watermark) {
		let watermark = new PIXI.Text('Ph1gr0s Emulator v1.0.0 Beta By MisaLiu Origin By lchzh3473', {
			fontFamily : 'Mina',
			fontSize: lineScale * 0.6 + 'px',
			fill: 'rgba(255, 255, 255, 0.5)',
			align: 'right'
		});
		
		watermark.anchor.set(1);
		
		pixi.stage.addChild(watermark);
		sprites.watermark = watermark;
	}
	
	// 统一调整位置和透明度
	sprites.comboText.alpha = 0;
	sprites.titlesBig.alpha = 0;
	sprites.headInfos.alpha = 0;
	sprites.footInfos.alpha = 0;
	
	sprites.scoreText.position.set(fixedWidth - lineScale * 0.65 + fixedWidthOffset, lineScale * 1.375);
	
	sprites.comboText.position.x = realWidth / 2;
	sprites.comboText.children[0].position.y = lineScale * 1.375;
	sprites.comboText.children[1].position.y = lineScale * 1.375 + sprites.comboText.children[0].height;
	
	sprites.songTitleBig.position.x = realWidth / 2;
	sprites.songTitleBig.position.y = realHeight / 2 * 0.75;
	
	sprites.bgAuthorBig.position.x = realWidth / 2;
	sprites.bgAuthorBig.position.y = realHeight / 2 * 1.25 + lineScale * 0.15;
	
	sprites.chartAuthorBig.position.x = realWidth / 2;
	sprites.chartAuthorBig.position.y = realHeight / 2 * 1.25 + lineScale;
	
	sprites.songNameBar.position.x = lineScale * 0.53 + fixedWidthOffset;
	sprites.songNameBar.position.y = realHeight - lineScale * 1.22;
	
	sprites.songTitle.position.x = lineScale * 0.85 + fixedWidthOffset;
	sprites.songTitle.position.y = realHeight - lineScale * 0.52;
	
	sprites.songDiff.position.x = realWidth - lineScale * 0.75 - fixedWidthOffset;
	sprites.songDiff.position.y = realHeight - lineScale * 0.52;
	
	sprites.fps.position.set(realWidth - 1, 1);
	
	sprites.watermark.position.set(realWidth - 2, realHeight - 2);
	
	sprites.headInfos.position.y = -sprites.headInfos.height;
	sprites.footInfos.position.y = sprites.headInfos.height;
}

/***
 * @function 游戏结束时绘制结算画面
***/
function CreateGameEndAnimate() {
	let realWidth = pixi.renderer.realWidth;
	let realHeight = pixi.renderer.realHeight;
	let fixedWidth = pixi.renderer.fixedWidth;
	let fixedWidthOffset = pixi.renderer.fixedWidthOffset;
	let lineScale = pixi.renderer.lineScale;
	
	let paddingWidth = lineScale * 0.416667;
	let bgWidth = fixedWidth * 0.828646 - paddingWidth * 2;
	let bgHeight = realHeight * 0.771296 / 2 - paddingWidth * 2;
	
	let output = {};
	
	output.container = new PIXI.Container();
	
	output.bgRect = new PIXI.Graphics()
		.beginFill(0xFFFFFF, 0.25)
		.drawFilletRect(0, 0, bgWidth + paddingWidth * 2, realHeight * 0.771296, lineScale * 0.260417)
		.endFill();
	output.container.addChild(output.bgRect);
	
	{
		let bgScale = bgWidth / _chart.image.width;
		
		output.bgImage = new PIXI.Sprite(_chart.image);
		output.bgImageCover = new PIXI.Graphics();
		
		output.bgImageCover.beginFill(0xFFFFFF)
			.drawFilletRect(0, 0, bgWidth, bgHeight, lineScale * 0.260417)
			.endFill();
		
		output.bgImage.scale.set(bgScale);
		output.bgImage.mask = output.bgImageCover;
		
		output.bgImageCover.position.set(paddingWidth);
		
		output.bgImage.position.x = paddingWidth;
		output.bgImage.position.y = (-output.bgImage.height + output.bgImageCover.height) / 2;
		
		output.container.addChild(output.bgImage, output.bgImageCover);
	}
	
	// 歌曲难度
	output.songDiff = new PIXI.Text(_chart.info.level || 'SP Lv.?', {
		fontFamily: 'Mina',
		fill: 'white',
		fontSize: lineScale * 0.520833 + 'px',
		align: 'left'
	});
	
	output.songDiff.position.x = paddingWidth;
	output.songDiff.position.y = bgHeight + paddingWidth * 2;
	
	output.container.addChild(output.songDiff);
	
	// 歌曲名称
	output.songName = new PIXI.Text(_chart.info.name || 'No title', {
		fontFamily: 'Mina',
		fill: 'white',
		fontSize: lineScale * 1.736111 + 'px',
		align: 'left'
	});
	
	output.songName.position.x = paddingWidth;
	output.songName.position.y = output.songDiff.position.y + output.songDiff.height;
	
	output.container.addChild(output.songName);
	
	// 判定详情
	output.judge = {
		container: new PIXI.Container(),
		perfect: new PIXI.Text('Perfect ' + score.perfect, {
			fontFamily: 'Mina',
			fontSize: lineScale * 0.347222 + 'px',
			fill: 'white', align: 'left'
		}),
		good: new PIXI.Text('Good ' + score.good, {
			fontFamily: 'Mina',
			fontSize: lineScale * 0.347222 + 'px',
			fill: 'white',
			align: 'left'
		}),
		bad: new PIXI.Text('Bad ' + score.bad, {
			fontFamily: 'Mina',
			fontSize: lineScale * 0.347222 + 'px',
			fill: 'white',
			align: 'left'
		}),
		miss: new PIXI.Text('Miss ' + score.miss, {
			fontFamily: 'Mina',
			fontSize: lineScale * 0.347222 + 'px',
			fill: 'white',
			align: 'left'
		}),
		apType: new PIXI.Text(score.apType == 2 ? 'All Percect' : (score.apType == 1 ? 'Full Combo' : ''), {
			fontFamily: 'Mina',
			fontSize: lineScale * 2.083333 + 'px',
			fill: (score.apType == 2 ? '#EACA72' : (score.apType == 1 ? '#8DE0FF' : 'white')),
			align: 'right'
		}),
		acc: new PIXI.Text(score.acc + '%', {
			fontFamily: 'Mina',
			fontSize: lineScale * 0.694444 + 'px',
			fill: 'white',
			align: 'right'
		})
	}
	
	output.judge.good.position.x = output.judge.perfect.width + 6;
	output.judge.bad.position.x = output.judge.good.position.x + output.judge.good.width + 6;
	output.judge.miss.position.x = output.judge.bad.position.x + output.judge.bad.width + 6;
	
	output.judge.apType.anchor.set(1);
	output.judge.acc.anchor.x = 1;
	
	output.judge.apType.position.x = bgWidth;
	output.judge.acc.position.x = bgWidth;
	
	output.judge.container.addChild(output.judge.perfect, output.judge.good, output.judge.bad, output.judge.miss, output.judge.apType, output.judge.acc);
	
	output.judge.container.position.x = paddingWidth;
	output.judge.container.position.y = output.songName.position.y + output.songName.height;
	
	output.container.addChild(output.judge.container);
	
	output.container.position.x = (realWidth - output.container.width) / 2;
	output.container.position.y = (realHeight - output.container.height) / 2;
	
	pixi.stage.addChild(output.container);
	
	return output;
}

/***
 * @function 实时计算当前时间下的精灵数据。该方法应在 PIXI.Ticker 中循环调用
***/
function CalculateChartActualTime(delta) {
	if (sprites.performanceIndicator) sprites.performanceIndicator.begin();
	
	let currentTime = (global.audio ? _chart.audio.duration * global.audio.progress : 0) - _chart.data.offset - _chart.audio.baseLatency - settings.chartDelay,
		fixedWidth = pixi.renderer.fixedWidth,
		realHeight = pixi.renderer.realHeight,
		fixedWidthHalf = fixedWidth / 2,
		realHeightHalf = realHeight / 2,
		fixedWidthOffset = pixi.renderer.fixedWidthOffset,
		noteSpeed = pixi.renderer.noteSpeed,
		noteScale = pixi.renderer.noteScale,
		rendererResolution = pixi.renderer.resolution;
	
	let currentJudgeLineOffsetY = {}; // 用来存储当前时间下 Note Container 的 y 轴位置
	
	if (!sprites.containers) return;
	
	// 进度条
	sprites.progressBar.position.x = fixedWidth * (global.audio ? global.audio.progress : 0) + fixedWidthOffset;
	
	for (let container of sprites.containers) {
		let judgeLine = container.children[0];
		
		if (!judgeLine) continue;
		
		if (!settings.disableJudgeLineAlpha) {
			for (let i of judgeLine.judgeLineDisappearEvents) {
				if (currentTime < i.startRealTime) break;
				if (currentTime > i.endRealTime) continue;
				
				let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
				let time1 = 1 - time2;
				
				judgeLine.alpha = i.start * time1 + i.end * time2;
			}
		}
		
		for (let i of judgeLine.judgeLineMoveEvents) {
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
			let time1 = 1 - time2;
			
			container.position.x = fixedWidth * (i.start * time1 + i.end * time2) + fixedWidthOffset;
			container.position.y = pixi.renderer.realHeight * (1 - i.start2 * time1 - i.end2 * time2);
		}
		
		for (const i of judgeLine.judgeLineRotateEvents) {
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
			let time1 = 1 - time2;
			
			container.rotation = i.startDeg * time1 + i.endDeg * time2;
			
			container.cosr = Math.cos(container.rotation);
			container.sinr = Math.sin(container.rotation);
		}
		
		for (const i of judgeLine.speedEvents) {
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			currentJudgeLineOffsetY[judgeLine.id] = (currentTime - i.startRealTime) * i.value + i.floorPosition;
			
			for (let x = 1; x < container.children.length; x++) {
				let noteContainer = container.children[x];
				noteContainer.position.y = currentJudgeLineOffsetY[judgeLine.id] * noteSpeed * noteContainer.noteDirection;
			}
		}
	}
	
	for (let i of sprites.totalNotes) {
		if (i.score > 0 && i.isProcessed) continue;
		
		// 处理 Hold 的高度
		if (i.type == 3 && i.offsetY <= currentJudgeLineOffsetY[i.lineId]) {
			let currentHoldLength = (i.holdLength + i.offsetY) - currentJudgeLineOffsetY[i.lineId];
			
			if (currentHoldLength >= 0) {
				i.children[1].height = currentHoldLength * noteSpeed / noteScale;
				i.children[2].position.y = -i.children[1].height;
				
				i.position.y = currentJudgeLineOffsetY[i.lineId] * noteSpeed * (i.isAbove ? -1 : 1);
			}
		}
		
		// 处理变速 Note 的位置
		if (i.speed != 1 && i.type != 3) {
			i.position.y = (
				currentJudgeLineOffsetY[i.lineId] + (
					i.offsetY - currentJudgeLineOffsetY[i.lineId]
				) * i.speed
			) * noteSpeed * (i.isAbove ? -1 : 1);
		}
		
		// Note 消失
		/**
		let globalPosition = i.getGlobalPosition();
		if (
			fixedWidthOffset <= globalPosition.x <= fixedWidthOffset + fixedWidth &&
			0 <= globalPosition.y <= realHeight
		) {
			i.visible = true;
		} else {
			i.visible = false;
		}
		**/
		
		let timeBetween = i.realTime - currentTime;
		if (timeBetween <= 0) {
			if (i.type != 3) {
				let timeBetween = i.realTime - currentTime;
				
				if (timeBetween > -global.judgeTimes.bad) {
					i.alpha = (global.judgeTimes.bad + timeBetween) / global.judgeTimes.bad;
				} else {
					i.alpha = 0;
					i.visible = false;
				}
				
			} else if ((i.realTime + i.realHoldTime) <= currentTime) {
				i.alpha = 0;
				i.visible = false;
				i.isProcessed = true;
			}
		
		} else if ( // 下面的这两个判断分支是为了将没到时间但却在判定线另一边的 Note 隐藏（我觉得用 PIXI.Mask 性能应该会更好一点）
			i.parent.position.y + i.position.y * (i.isAbove ? 1 : -1) > 0 &&
			i.visible == true
		) {
			if (i.type != 3 && timeBetween > global.judgeTimes.bad) {
				i.visible = false;
			} else if (timeBetween + i.realHoldTime > global.judgeTimes.bad) {
				i.visible = false;
			}
			
		} else if (
			i.parent.position.y + i.position.y * (i.isAbove ? 1 : -1) <= 0 &&
			i.visible == false
		) {
			if (i.type != 3 && timeBetween > global.judgeTimes.bad) {
				i.visible = true;
			} else if (timeBetween + i.realHoldTime > global.judgeTimes.bad) {
				i.visible = true;
			}
			
		}
		
		
	}
	
	judgements.addJudgement(sprites.totalNotes, currentTime);
	judgements.judgeNote(sprites.totalNotes, currentTime, fixedWidth * 0.117775);
	
	/**
	judgements.judgeNote(sprites.dragNotes, currentTime, fixedWidth * 0.117775);
	judgements.judgeNote(sprites.flickNotes, currentTime, fixedWidth * 0.117775);
	judgements.judgeNote(sprites.tapholeNotes, currentTime, fixedWidth * 0.117775);
	**/
	
	inputs.taps.length = 0;
	
	
	for (let i in inputs.touches) {
		if (inputs.touches[i] instanceof Click) inputs.touches[i].animate();
	}
	for (let i in inputs.mouse) {
		if (inputs.mouse[i] instanceof Click) inputs.mouse[i].animate();
	}
	
	
	if (global.audio && global.audio.progress == 1) {
		pixi.ticker.remove(CalculateChartActualTime);
		
		sprites.headInfos.position.y = -sprites.headInfos.height;
		sprites.footInfos.position.y = sprites.headInfos.height;
		
		sprites.gameEnd = CreateGameEndAnimate();
	}
	
	if (sprites.performanceIndicator) sprites.performanceIndicator.end();
}

/***
 * @function 实时处理打击动画
***/
function CalculateClickAnimateActualTime() {
	for (let i in sprites.clickAnimate) {
		let obj = sprites.clickAnimate[i];
		
		if (obj.type == 2) {
			obj.alpha -= 2 / pixi.ticker.FPS;
			
			if (obj.alpha <= 0) {
				obj.destroy();
				sprites.clickAnimate.splice(i, 1);
			}
		}
	}
}

/***
 * @function 创建打击动画
***/
function CreateClickAnimation(note, performance = false) {
	let obj = undefined;
	let fixedWidth = pixi.renderer.fixedWidth;
	let noteScale = pixi.renderer.noteScale;
	
	let score = note.score,
		offsetX = getNotePosition(note).x,
		offsetY = getNotePosition(note).y,
		angle = note.parent.parent.angle;
	
	if (!pixi || !settings.clickAnimate) return;
	if (score <= 1) return;
	
	if (score > 2) {
		let animate = new PIXI.AnimatedSprite(textures.clickRaw);
		let blockWidth = 30 * 0.4988;
		let blocks = [ null, null, null, null ];
		
		obj = new PIXI.Container();
		
		// 定义动画精灵
		animate.tint = score == 4 ? 0xFFECA0 : 0xB4E1FF;
		animate.anchor.set(0.5);
		animate.scale.set(256 / animate.texture.baseTexture.width);
		animate.loop = false;
		
		// 声明帧更新和播放完毕后执行的函数
		if (!performance) {
			animate.onFrameChange = function () {
				let currentFrameProgress = this.currentFrame / this.totalFrames;
				
				for (let i = 1; i < this.parent.children.length; i++) {
					let block = this.parent.children[i];
					let blockWidth = 30 * (((0.2078 * currentFrameProgress - 1.6524) * currentFrameProgress + 1.6399) * currentFrameProgress + 0.4988);
					let blockDistance = block.distance * (9 * currentFrameProgress / (8 * currentFrameProgress + 1)) * 0.6;
					
					block.clear();
					block.beginFill(0xFFFFFF)
						.drawRect(-blockWidth / 2, -blockWidth / 2, blockWidth, blockWidth)
						.endFill();
					
					block.position.x = blockDistance * block.cosr - blockDistance * block.sinr;
					block.position.y = blockDistance * block.cosr + blockDistance * block.sinr;
					
					block.alpha = 1 - currentFrameProgress;
				}
			};
		}
		animate.onComplete = function () {
			sprites.clickAnimate.splice(this.parent.id, 1);
			this.parent.destroy();
		};
		
		obj.addChild(animate);
		
		// 定义爆开的小方块
		if (!performance) {
			for (let i = 0; i < blocks.length; i++) {
				blocks[i] = new PIXI.Graphics()
					.beginFill(0xFFFFFF)
					.drawRect(-blockWidth / 2, -blockWidth / 2, blockWidth, blockWidth)
					.endFill();
				
				blocks[i].tint = score == 4 ? 0xFFECA0 : 0xB4E1FF;
				
				blocks[i].distance = Math.random() * 81 + 185;
				blocks[i].direction = Math.floor(Math.random() * 360);
				blocks[i].sinr = Math.sin(blocks[i].direction);
				blocks[i].cosr = Math.cos(blocks[i].direction);
				
				obj.addChild(blocks[i]);
			}
		}
		
		obj.scale.set(noteScale * 5.6);
		obj.position.set(offsetX, offsetY);
		
	} else {
		offsetX = getNotePosition(note, false).x;
		offsetY = getNotePosition(note, false).y;
		
		obj = new PIXI.Sprite(textures.tap2);
		
		obj.anchor.set(0.5);
		obj.scale.set(noteScale);
		obj.position.set(offsetX, offsetY);
		obj.angle = angle;
		
		obj.tint = 0x6c4343;
	}
	
	obj.type = score;
	
	pixi.stage.addChild(obj);
	if (score == 3 || score == 4) obj.children[0].play();
	
	sprites.clickAnimate.push(obj);
}

/***
 * @function 对所有精灵对象进行重定位和重缩放。本方法应仅在舞台尺寸被改变时调用。
 * @param sprites {object} 存放所有精灵的对象
 * @param width {num} 舞台的宽度
 * @param height {num} 舞台的高度
 * @param _noteScale {num} 按键缩放值。默认为 8000。
***/
function ResizeChartSprites(sprites, width, height, _noteScale = 8e3) {
	let fixedWidth = width <= height / 9 * 16 ? width : height / 9 * 16;
	let fixedWidthOffset = (width - fixedWidth) / 2;
	let windowRatio = width / height;
	let lineScale = fixedWidth > height * 0.75 ? height / 18.75 : fixedWidth / 14.0625;
	let noteScale = fixedWidth / _noteScale;
	let noteSpeed = height * 0.6;
	
	// 处理背景图
	if (sprites.background) {
		let bgScaleWidth = fixedWidth / _chart.image.width;
		let bgScaleHeight = pixi.renderer.realHeight / _chart.image.height;
		let bgScale = bgScaleWidth > bgScaleHeight ? bgScaleWidth : bgScaleHeight;
		
		sprites.background.scale.set(bgScale);
		sprites.background.position.set(width / 2, height / 2);
	}
	
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
		// 处理 Hold
		if (note.type == 3 && note.children.length == 3) {
			// note.children[1].height = note.holdLength * (height * 0.6) / note.rawNoteScale * ((noteScale * pixi.renderer.resolution) / note.rawNoteScale);
			note.children[1].height = note.holdLength * noteSpeed / noteScale;
			note.children[2].position.y = -note.children[1].height;
		}
		
		note.scale.set(noteScale);
		note.position.x = (note.positionX.toFixed(6) * 0.109) * (fixedWidth / 2);
		note.position.y = note.offsetY * noteSpeed * (note.isAbove ? -1 : 1);
	}
	
	// 处理进度条
	if (sprites.progressBar) {
		sprites.progressBar.scale.set(fixedWidth / (1920 / pixi.renderer.resolution));
	}
	
	// 处理 Combo 文字
	if (sprites.comboText) {
		sprites.comboText.children[0].style.fontSize = lineScale * 1.32 + 'px';
		sprites.comboText.children[1].style.fontSize = lineScale * 0.66 + 'px';
		
		sprites.comboText.position.x = width / 2;
		sprites.comboText.children[0].position.y = lineScale * 1.375;
		sprites.comboText.children[1].position.y = lineScale * 1.375 + sprites.comboText.children[0].height;
	}
	
	// 处理分数指示器
	if (sprites.scoreText) {
		sprites.scoreText.style.fontSize = lineScale * 0.95 + 'px';
		sprites.scoreText.position.set(width - lineScale * 0.65 - fixedWidthOffset, lineScale * 1.375);
	}
	
	// 处理歌曲名称大标题
	if (sprites.songTitleBig) {
		sprites.songTitleBig.style.fontSize = lineScale * 1.1 + 'px';
		
		sprites.songTitleBig.position.x = width / 2;
		sprites.songTitleBig.position.y = height / 2 * 0.75;
	}
	
	// 处理歌曲背景作者大标题
	if (sprites.bgAuthorBig) {
		sprites.bgAuthorBig.style.fontSize = lineScale * 0.55 + 'px';
		
		sprites.bgAuthorBig.position.x = width / 2;
		sprites.bgAuthorBig.position.y = height / 2 * 1.25 + lineScale * 0.15;
	}
	
	// 处理歌曲谱面作者大标题
	if (sprites.chartAuthorBig) {
		sprites.chartAuthorBig.style.fontSize = lineScale * 0.55 + 'px';
		
		sprites.chartAuthorBig.position.x = width / 2;
		sprites.chartAuthorBig.position.y = height / 2 * 1.25 + lineScale;
	}
	
	// 歌曲名称侧边横线
	if (sprites.songNameBar) {
		sprites.songNameBar.width = lineScale * 0.119;
		sprites.songNameBar.height = lineScale * 0.612;
		
		sprites.songNameBar.position.x = lineScale * 0.53 + fixedWidthOffset;
		sprites.songNameBar.position.y = height - lineScale * 1.22;
	}
	
	// 处理歌曲名称
	if (sprites.songTitle) {
		sprites.songTitle.style.fontSize = lineScale * 0.63 + 'px';
		
		sprites.songTitle.position.x = lineScale * 0.85 + fixedWidthOffset;
		sprites.songTitle.position.y = height - lineScale * 0.52;
	}
	
	// 处理歌曲难度
	if (sprites.songDiff) {
		sprites.songDiff.style.fontSize = lineScale * 0.63 + 'px';
		
		sprites.songDiff.position.x = width - lineScale * 0.75 - fixedWidthOffset;
		sprites.songDiff.position.y = height - lineScale * 0.52;
	}
	
	// 处理对于超宽屏所创建的背景图盖板
	if (sprites.backgroundCover) {
		let bgScaleWidth = width / _chart.image.width;
		let bgScaleHeight = height / _chart.image.height;
		let bgScale = bgScaleWidth > bgScaleHeight ? bgScaleWidth : bgScaleHeight;
		
		sprites.backgroundCover.image.scale.set(bgScale);
		sprites.backgroundCover.image.position.set(width / 2, height / 2);
		sprites.backgroundCover.image.alpha = width != fixedWidth ? 1 : 0;
		
		if (!sprites.gameEnd) {
			sprites.backgroundCover.cover.children[0].clear();
			sprites.backgroundCover.cover.children[0].beginFill(0xFFFFFF)
					.drawRect(0, 0, fixedWidthOffset, height)
					.endFill();
			
			sprites.backgroundCover.cover.children[1].clear();
			sprites.backgroundCover.cover.children[1].beginFill(0xFFFFFF)
					.drawRect(width - fixedWidthOffset, 0, fixedWidthOffset, height)
					.endFill();
		}
	}
	
	// 处理 FPS 指示器
	if (sprites.fps) {
		sprites.fps.style.fontSize = lineScale * 0.8 + 'px';
		sprites.fps.position.set(width - 1, 1);
	}
	
	// 处理水印
	if (sprites.watermark) {
		sprites.watermark.style.fontSize = lineScale * 0.6 + 'px';
		sprites.watermark.position.set(width - 2, height - 2);
	}
	
	// 处理准度指示器
	if (sprites.accIndicator) {
		sprites.accIndicator.container.position.x = width / 2;
		sprites.accIndicator.container.scale.set(width / sprites.accIndicator.scale);
	}
	
	// 处理结算页面
	if (sprites.gameEnd) {
		let paddingWidth = lineScale * 0.416667;
		let bgWidth = fixedWidth * 0.828646 - paddingWidth * 2;
		let bgHeight = height * 0.771296 / 2 - paddingWidth * 2;
		
		let bgScale = bgWidth / _chart.image.width;
		
		// 底图矩形
		sprites.gameEnd.bgRect.clear();
		sprites.gameEnd.bgRect.beginFill(0xFFFFFF, 0.25)
			.drawFilletRect(0, 0, bgWidth + paddingWidth * 2, height * 0.771296, lineScale * 0.260417)
			.endFill();
		
		// 背景图片遮罩
		sprites.gameEnd.bgImageCover.clear();
		sprites.gameEnd.bgImageCover.beginFill(0xFFFFFF)
			.drawFilletRect(0, 0, bgWidth, bgHeight, lineScale * 0.260417)
			.endFill();
		
		sprites.gameEnd.bgImage.scale.set(bgScale);
		sprites.gameEnd.bgImageCover.position.set(paddingWidth);
		
		sprites.gameEnd.bgImage.position.x = paddingWidth;
		sprites.gameEnd.bgImage.position.y = (-sprites.gameEnd.bgImage.height + sprites.gameEnd.bgImageCover.height) / 2;
		
		// 歌曲难度
		sprites.gameEnd.songDiff.style.fontSize = lineScale * 0.520833 + 'px';
		
		sprites.gameEnd.songDiff.position.x = paddingWidth;
		sprites.gameEnd.songDiff.position.y = bgHeight + paddingWidth * 2;
		
		// 歌曲名称
		sprites.gameEnd.songName.style.fontSize = lineScale * 1.736111 + 'px';
		
		sprites.gameEnd.songName.position.x = paddingWidth;
		sprites.gameEnd.songName.position.y = sprites.gameEnd.songDiff.position.y + sprites.gameEnd.songDiff.height;
		
		// 判定详情
		sprites.gameEnd.judge.perfect.style.fontSize = lineScale * 0.347222 + 'px';
		sprites.gameEnd.judge.good.style.fontSize = lineScale * 0.347222 + 'px';
		sprites.gameEnd.judge.bad.style.fontSize = lineScale * 0.347222 + 'px';
		sprites.gameEnd.judge.miss.style.fontSize = lineScale * 0.347222 + 'px';
		sprites.gameEnd.judge.apType.style.fontSize = lineScale * 2.083333 + 'px';
		sprites.gameEnd.judge.acc.style.fontSize = lineScale * 0.694444 + 'px';
		
		sprites.gameEnd.judge.good.position.x = sprites.gameEnd.judge.perfect.width + 6;
		sprites.gameEnd.judge.bad.position.x = sprites.gameEnd.judge.good.position.x + sprites.gameEnd.judge.good.width + 6;
		sprites.gameEnd.judge.miss.position.x = sprites.gameEnd.judge.bad.position.x + sprites.gameEnd.judge.bad.width + 6;
		
		sprites.gameEnd.judge.apType.position.x = bgWidth;
		sprites.gameEnd.judge.acc.position.x = bgWidth;
		
		sprites.gameEnd.judge.container.position.x = paddingWidth;
		sprites.gameEnd.judge.container.position.y = sprites.gameEnd.songName.position.y + sprites.gameEnd.songName.height;
		
		sprites.gameEnd.container.position.x = (width - sprites.gameEnd.container.width) / 2;
		sprites.gameEnd.container.position.y = (height - sprites.gameEnd.container.height) / 2;
	}
}

/***
 * @function 创建一个 osu! 风格的准度指示器
***/
function CreateAccurateIndicator(pixi, scale = 500, challengeMode = false) {
	let container = new PIXI.Container();
	let graphic   = new PIXI.Graphics();
	let accurates = [];
	let isChallengeMode = challengeMode;
	
	// 绘制白色打底
	graphic.beginFill(0xFFFFFF, 0.4);
	graphic.drawRect(0, 2, (challengeMode ? 100 : 200), 16);
	graphic.endFill();
	// 绘制 Bad(Early) 区域
	graphic.beginFill(0x8E0000, 0.8);
	graphic.drawRect(0, 6, (challengeMode ? 10 : 20), 8);
	graphic.endFill();
	// 绘制 Good(Early) 区域
	graphic.beginFill(0xB4E1FF, 0.8);
	graphic.drawRect((challengeMode ? 10 : 20), 6, (challengeMode ? 20 : 40), 8);
	graphic.endFill();
	// 绘制 Perfect 区域
	graphic.beginFill(0xFFECA0, 0.8);
	graphic.drawRect((challengeMode ? 30 : 60), 6, (challengeMode ? 40 : 80), 8);
	graphic.endFill();
	// 绘制 Good(Late) 区域
	graphic.beginFill(0xB4E1FF, 0.8);
	graphic.drawRect((challengeMode ? 70 : 140), 6, (challengeMode ? 20 : 40), 8);
	graphic.endFill();
	// 绘制 Bad(Early) 区域
	graphic.beginFill(0x8E0000, 0.8);
	graphic.drawRect((challengeMode ? 90 : 180), 6, (challengeMode ? 10 : 20), 8);
	graphic.endFill();
	// 绘制白色准心
	graphic.beginFill(0xFFFFFF, 0.8);
	graphic.drawRect((challengeMode ? 49 : 99), 0, 2, 20);
	graphic.endFill();
	
	container.addChild(graphic);
	
	// 手动居中 x 轴
	graphic.position.x = -(graphic.width / 2);
	
	// 设定指示器缩放和位置
	container.scale.set(pixi.renderer.realWidth / scale);
	container.position.x = pixi.renderer.realWidth / 2;
	
	pixi.stage.addChild(container);
	
	// 指示器刻度淡出
	pixi.ticker.add(() => {
		if (container.children.length > 1) {
			for (let i = 1, length = container.children.length; i < length; i++) {
				let accurate = container.children[i];
				if (!accurate) continue;
				
				accurate.alpha -= 0.5 / 60;
				if (accurate.alpha <= 0) {
					accurate.destroy();
				}
			}
		}
	});
	
	return {
		container,
		scale,
		pushAccurate
	};
	
	/***
	 * @function 推送准度信息到准度指示器
	***/
	function pushAccurate(noteTime, currentTime) {
		let accContainer = new PIXI.Container();
		let accGraphic = new PIXI.Graphics();
		let time = currentTime - noteTime;
		let rankColor = time > 0 ? time : -time;
		
		if (rankColor < global.judgeTimes.perfect)
			rankColor = 0xFFECA0;
		else if (rankColor < global.judgeTimes.good)
			rankColor = 0xB4E1FF;
		else if (rankColor < global.judgeTimes.bad)
			rankColor = 0x8E0000;
		
		accGraphic.beginFill(rankColor);
		accGraphic.drawRect(0, 0, 2, 20);
		accGraphic.endFill();
		
		accGraphic.position.x = time * 1000 / 2;
		
		container.addChild(accGraphic);
		
		return accGraphic;
	}
}

/***
 * @function 绘制输入点并上色。本方法不会自行删除输入点
 * @param x {number} 输入点 x 坐标
 * @paran y {number} 输入点 y 坐标
 * @param inputType {string} 输入类型，用于将输入点传入到指定的精灵对象内
 * @param inputId {number} 输入标识，用处同上
 * @param [type] {number} 该输入点状态，0 = 单击，1 = 移动，2 = 长按
 * @return {object} 返回当前输入点的精灵
***/
function DrawInputPoint(x, y, inputType, inputId, type = 0) {
	let inputPoints = sprites.inputs[inputType];
	let inputPoint = inputPoints ? inputPoints[inputId] : null;
	
	if (!settings.showFinger) return;
	
	if (!inputPoint) {
		inputPoint = new PIXI.Graphics();
		
		inputPoint.beginFill(0xFFFFFF);
		inputPoint.drawCircle(0, 0, 6);
		inputPoint.endFill();
		
		inputPoint.scale.set(pixi.renderer.lineScale * 0.08);
		
		pixi.stage.addChild(inputPoint);
		inputPoints[inputId] = inputPoint;
		
		sprites.inputs[inputType] = inputPoints;
		
	} else if (!inputPoint.visible) {
		inputPoint.scale.set(pixi.renderer.lineScale * 0.08);
		inputPoint.visible = true;
	}
	
	inputPoint.position.set(x, y);
	
	if (type == 0) {
		inputPoint.tint = 0x00FFFF;
	} else if (type == 1) {
		inputPoint.tint = 0xFFFF00;
	} else if (type == 2) {
		inputPoint.tint = 0xFF00FF;
	}
	
	return inputPoint;
}

function getNotePosition(note, followJudgeLine = true) {
	let cosr = note.parent.parent.cosr,
		sinr = note.parent.parent.sinr,
		parentX = note.parent.parent.position.x,
		parentY = note.parent.parent.position.y,
		offsetX = parentX + note.position.x,
		offsetY = parentY + (!followJudgeLine ? note.parent.position.y + note.position.y : 0),
		realX = (offsetX - parentX) * cosr - (offsetY - parentY) * sinr + parentX,
		realY = (offsetY - parentY) * cosr + (offsetX - parentX) * sinr + parentY;
	
	return { x: realX, y: realY };
}

/** 留着万一以后还要做测试用
function TestGetGlobalPosition() {
	for (let x = 0; x < 10; x++) {
		let startTime = Date.now();
		
		for (let i = 0; i < 10000; i++) {
			let note = sprites.totalNotes[0];
			
			let globalPosition = note.getGlobalPosition();
			let x = globalPosition.x;
			let y = globalPosition.y;
			
			
			let x = note.parent.parent.position.x + note.parent.position.x + note.position.x;
			let y = note.parent.parent.position.y + note.parent.position.y + note.position.y;
			
		}
		
		console.log(Date.now() - startTime);
	}
}
**/