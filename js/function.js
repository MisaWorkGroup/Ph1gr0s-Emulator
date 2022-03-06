'use strict';
// ==声明 global.functions==
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
	pixi.renderer.fixedWidthPercent = pixi.renderer.fixedWidth / 18;
	pixi.renderer.fixedWidthOffset = (pixi.renderer.realWidth - pixi.renderer.fixedWidth) / 2;
	
	pixi.renderer.noteSpeed = pixi.renderer.realHeight * 0.6;
	pixi.renderer.noteScale = pixi.renderer.fixedWidth / settings.noteScale;
	
	pixi.renderer.lineScale = pixi.renderer.fixedWidth > pixi.renderer.realHeight * 0.75 ? pixi.renderer.realHeight / 18.75 : pixi.renderer.fixedWidth / 14.0625;
	
	ResizeChartSprites(sprites, pixi.renderer.realWidth, pixi.renderer.realHeight, settings.noteScale);
};

// Note 排序
global.functions.sortNote = (a, b) => {
	try {
		return a.raw.realTime - b.raw.realTime || a.raw.lineId - b.raw.lineId || a.raw.id - b.raw.id;
	} catch (e) {
		return a.realTime - b.realTime || a.lineId - b.lineId || a.id - b.id;
	}
};


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
		this.accArray = [];
		
		this.scorePerNote = (isChallenge ? 1000000 : 900000) / totalNotes;
		
		return this;
	},
	
	addCombo: function(type, acc = 0) {
		switch (type) {
			case 4: {
				this.perfect += 1;
				this.combo += 1;
				break;
			}
			case 3: {
				this.good += 1;
				this.combo += 1;
				break;
			}
			case 2: {
				this.bad += 1;
				this.combo = 0;
				break;
			}
			default: {
				this.miss += 1;
				this.combo = 0;
			}
		}
		
		if (!!acc) {
			this.accArray.push(acc);
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
		if (this.score >= 1000000) this.judge = 6;
		else if (this.score >= 960000) this.judge = 5;
		else if (this.score >= 920000) this.judge = 4;
		else if (this.score >= 880000) this.judge = 3;
		else if (this.score >= 820000) this.judge = 2;
		else if (this.score >= 700000) this.judge = 1;
		else if (this.score > 0)  this.judge = 0;
		else this.judge = -1;
		
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
				for (let judgeLine of sprites.game.judgeLines) {
					judgeLine.tint = 0xFFFFFF;
				}
				
				if (sprites.ui.start.fakeJudgeline) sprites.ui.start.fakeJudgeline.tint = 0xFFFFFF;
			}
			
		} else if (this.good > 0 && this.apType > 1) {
			this.apType = 1;
			
			if (settings.showApStatus) {
				for (let judgeLine of sprites.game.judgeLines) {
					judgeLine.tint = 0xB4E1FF;
				}
				
				if (sprites.ui.start.fakeJudgeline) sprites.ui.start.fakeJudgeline.tint = 0xB4E1FF;
			}
		}
		
		// 推送分数到游戏 UI
		sprites.ui.game.head.scoreText.text = this.scoreText;
		
		// 推送连击到游戏 UI
		if (this.combo > 2) {
			sprites.ui.game.head.comboText.alpha = 1;
			sprites.ui.game.head.comboText.children[0].text = this.combo;
			
		} else {
			sprites.ui.game.head.comboText.alpha = 0;
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
	// let notesTotal = [];
	let judgeLines = [];
	let multiNotes = {};
	let notes = {
		hold    : [],
		notHold : [],
		fakeNotes: []
	};
	
	for (let judgeLine of chart.judgeLineList) {
		let noteId = 0;
		let _judgeLine = {
			id: Number(judgeLines.length),
			bpm: judgeLine.bpm,
			speedEvents: [],
			judgeLineMoveEvents: [],
			judgeLineRotateEvents: [],
			judgeLineDisappearEvents: [],
			numOfNotes: judgeLine.numOfNotes,
			numOfNotesAbove: judgeLine.numOfNotesAbove,
			numOfNotesBelow: judgeLine.numOfNotesBelow
		};
		
		// 过滤掉空的判定线
		if (
			judgeLine.notesAbove.length <= 0 &&
			judgeLine.notesBelow.length <= 0 &&
			(!judgeLine.notesFakeAbove || judgeLine.notesFakeAbove.length <= 0) &&
			(!judgeLine.notesFakeBelow || judgeLine.notesFakeBelow.length <= 0) &&
			judgeLine.judgeLineMoveEvents.length <= 1 &&
			judgeLine.judgeLineRotateEvents.length <= 1 &&
			judgeLine.judgeLineDisappearEvents.length <= 1 &&
			judgeLine.speedEvents.length <= 1
		) {
			continue;
		}
		
		// 规范速度事件、转换事件时间
		_judgeLine.speedEvents              = addRealTime(arrangeSpeedEvents(judgeLine.speedEvents), judgeLine.bpm);
		_judgeLine.judgeLineMoveEvents      = addRealTime(arrangeLineEvents(judgeLine.judgeLineMoveEvents), judgeLine.bpm);
		_judgeLine.judgeLineRotateEvents    = addRealTime(arrangeLineEvents(judgeLine.judgeLineRotateEvents), judgeLine.bpm);
		_judgeLine.judgeLineDisappearEvents = addRealTime(arrangeLineEvents(judgeLine.judgeLineDisappearEvents), judgeLine.bpm);
		
		// note 添加 id，设置方向参数、设置正确时间、归类并和总
		for (let x = 0; x < judgeLine.notesAbove.length; x++) {
			addNote(judgeLine.notesAbove[x], _judgeLine, (notes.hold.length + notes.notHold.length), x, noteId, true);
			noteId++;
		}
		for (let y = 0; y < judgeLine.notesBelow.length; y++) {
			addNote(judgeLine.notesBelow[y], _judgeLine, (notes.hold.length + notes.notHold.length), y, noteId, false);
			noteId++;
		}
		// 同样的姿势处理一下 FakeNote
		if (judgeLine.notesFakeAbove) {
			for (let x = 0; x < judgeLine.notesFakeAbove.length; x++) {
				addNote(judgeLine.notesFakeAbove[x], _judgeLine, notes.fakeNotes.length, x, noteId, true);
				noteId++;
			}
		}
		if (judgeLine.notesFakeBelow) {
			for (let y = 0; y < judgeLine.notesFakeBelow.length; y++) {
				addNote(judgeLine.notesFakeBelow[y], _judgeLine, notes.fakeNotes.length, y, noteId, false);
				noteId++;
			}
		}
		
		// 推送判定线
		judgeLines.push(_judgeLine);
	}
	
	// 标识多押 note
	for (let name in notes) {
		for (let note of notes[name]) {
			multiNotes[note.realTime.toFixed(6)] = multiNotes[note.realTime.toFixed(6)] ? 2 : 1;
		}
	}
	for (let name in notes) {
		for (let note of notes[name]) {
			note.isMulti = (multiNotes[note.realTime.toFixed(6)] == 2);
		}
	}
	
	// note 重排序
	notes.hold.sort(global.functions.sortNote);
	notes.notHold.sort(global.functions.sortNote);
	notes.fakeNotes.sort(global.functions.sortNote);
	
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
	function addNote(note, judgeLine, id, idToSide, idToLine, isAbove) {
		let noteSpeed                = 1;
		let noteSpeedChangedRealTime = 0;
		let noteSpeedChangedPosition = 0;
		let holdEndRealTime          = 0;
		let holdHeadPosition         = 0;
		let holdEndPosition          = 0;
		
		note.type         = Number(note.type);
		note.realTime     = note.time * (1.875 / judgeLine.bpm);
		note.realHoldTime = note.holdTime * (1.875 / judgeLine.bpm);
		note.offsetY      = note.floorPosition;
		note.holdLength   = note.realHoldTime * note.speed;
		note.lineId       = Number(judgeLine.id);
		note.id           = Number(id);
		note.idToSide     = Number(idToSide); // 相对这个判定线方向的 ID
		note.idToLine     = Number(idToLine); // 相对这个判定线的 ID
		note.isAbove      = isAbove;
		note.isFake       = note.isFake;
		note.score        = 0;
		note.isScored     = false;
		note.isProcessed  = false;
		note.isPressing   = false;
		note.pressTime    = 0;
		note.accType      = 0;
		
		// 兼容 PEC 谱面
		/**
		if (!note.isFake) {
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
		**/

		if (note.isFake) {
			notes.fakeNotes.push(note);
		} else {
			if (note.type === 3) notes.hold.push(note);
			else notes.notHold.push(note);
		}

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
		newEvents2 = [ newEvents.shift() ];
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
 * @param stage {object} 将精灵自动添加进这个容器内
 * @return {object} 返回一个存放背景图、Judgeline 精灵数组、Notes 精灵数组的对象
***/
function CreateChartSprites(chart, pixi, stage) {
	/***
	 * 之前的渲染思路废掉了，因为怀疑有性能问题
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
		judgeLines: [],
		notes: [],
		fakeNotes: []
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
		backgroundCover.alpha = 0.5;
		background.addChild(backgroundCover);
		
		// background.alpha = settings.backgroundDim;
		background.anchor.set(0.5);
		background.scale.set(bgScale);
		background.position.set(fixedWidth / 2, realHeight / 2);
		
		output.background = background;
		stage.addChild(background);
	}
	
	if (settings.spectrumSettings.enabled) {
		output.spectrumGraphics = new PIXI.Graphics();
		output.spectrumGraphics.position.y = realHeight;
		
		stage.addChild(output.spectrumGraphics);
	}
	
	// 绘制判定线
	for (let _judgeLine of chart.judgeLines) {
		let judgeLine = new PIXI.Sprite(textures.judgeLine);
		
		judgeLine.raw = _judgeLine;
		
		// 设置判定线中心点和宽高
		judgeLine.anchor.set(0.5);
		judgeLine.height = lineScale * 18.75 * 0.008;
		judgeLine.width = judgeLine.height * judgeLine.texture.width / judgeLine.texture.height * 1.042;
		
		// 调整判定线位置
		judgeLine.position.set(0, 0);
		judgeLine.zIndex = output.judgeLines.length + 1;
		
		if (settings.showApStatus) {
			judgeLine.tint = 0xFFECA0;
		}
		
		if (settings.developMode) {
			let judgeLineName = new PIXI.Text(_judgeLine.id, { fill: 'rgb(255,100,100)' });
			judgeLineName.anchor.set(0.5, 1);
			judgeLineName.position.set(0);
			judgeLine.addChild(judgeLineName);
		}
		
		judgeLine.position.x = fixedWidth / 2;
		judgeLine.position.y = realHeight / 2;
		
		output.judgeLines.push(judgeLine);
		stage.addChild(judgeLine);
	}
	
	for (let _note of chart.notes.fakeNotes) { // fakeNotes 应该在所有 note 的最下面
		output.fakeNotes.push(CreateNoteSprite(_note, stage, 100 + output.notes.length + 1));
	}
	for (let _note of chart.notes.hold) { // 先渲染 Hold，这样 Hold 就会在其他 Note 的下面
		output.notes.push(CreateNoteSprite(_note, stage, 100 + output.notes.length + 1));
	}
	for (let _note of chart.notes.notHold) {
		output.notes.push(CreateNoteSprite(_note, stage, 100 + output.notes.length + 1));
	}
	
	output.notes.sort(global.functions.sortNote);
	output.fakeNotes.sort(global.functions.sortNote);
	
	return output;

	function CreateNoteSprite(_note, stage = null, zIndex = null) {
		let note = null;

		if (_note.type === 3) {
			note = new PIXI.Container();

			let holdHead = new PIXI.Sprite(textures['holdHead' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')]);
			let holdBody = new PIXI.Sprite(textures['holdBody' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')]);
			let holdEnd = new PIXI.Sprite(textures['holdEnd' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')]);
			
			holdHead.anchor.set(0.5);
			holdBody.anchor.set(0.5, 1);
			holdEnd.anchor.set(0.5, 1);
			
			holdBody.height = _note.holdLength * pixi.renderer.noteSpeed / noteScale;
			
			holdHead.position.set(0, holdHead.height / 2);
			holdBody.position.set(0, 0);
			holdEnd.position.set(0, -holdBody.height);
			
			note.addChild(holdHead);
			note.addChild(holdBody);
			note.addChild(holdEnd);

		} else {
			note = new PIXI.Sprite(textures.tap);
			
			note.anchor.set(0.5);
			
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
		
		note.raw = _note;
		
		note.scale.set(noteScale);
		note.position.x = (_note.positionX.toFixed(6) * 0.109) * (fixedWidth / 2) + (fixedWidth / 2);
		note.position.y = _note.offsetY * (realHeight * 0.6) * (_note.isAbove ? -1 : 1);

		if (!isNaN(Number(zIndex))) note.zIndex = zIndex;
		if (!_note.isAbove) note.angle = 180;
		if (stage) stage.addChild(note);

		return note;
	}
}

/***
 * @function 创建谱面开始动画精灵，这个函数亦可用于重调整相关精灵的大小和位置
 * @param chartInfo {object} 存放谱面信息的对象
 * @param sprite {object} 当此对象内的精灵有效时，不再创建新的精灵
 * @param pixi {object} PixiJs 的舞台对象
 * @return {object} 返回创建好/重新定位好的精灵对象
***/
function CreateGameStartSprites(chartInfo, sprite, pixi, stage) {
	let realWidth = pixi.renderer.realWidth;
	let realHeight = pixi.renderer.realHeight;
	let fixedWidth = pixi.renderer.fixedWidth;
	let lineScale = pixi.renderer.lineScale;
	
	let output = sprite;
	if (!output) output = {};
	
	// =====创建精灵=====
	// 大标题 Container
	if (!output.container) {
		output.container = new PIXI.Container();
		stage.addChild(output.container);
	}
	
	// 大标题-歌曲名称
	if (!output.songTitle) {
		let songTitle = new PIXI.Text(chartInfo.name || 'No Title', {
			fontFamily : 'Mina',
			fill : 'white',
			align : 'center'
		});
		
		songTitle.anchor.x = 0.5;
		
		output.container.addChild(songTitle);
		output.songTitle = songTitle;
	}
	
	// 大标题-背景图作者
	if (!output.bgAuthor) {
		let bgAuthor = new PIXI.Text('Illustration designed by ' + (chartInfo.illustrator || 'No name'), {
			fontFamily : 'Mina',
			fill : 'white',
			align : 'center'
		});
		
		bgAuthor.anchor.set(0.5, 1);
		
		output.container.addChild(bgAuthor);
		output.bgAuthor = bgAuthor;
	}
	
	// 大标题-谱面作者
	if (!output.chartAuthor) {
		let chartAuthor = new PIXI.Text('Level designed by ' + (_chart.info.designer || 'No name'), {
			fontFamily : 'Mina',
			fill : 'white',
			align : 'center'
		});
		
		chartAuthor.anchor.set(0.5, 1);
		
		output.container.addChild(chartAuthor);
		output.chartAuthor = chartAuthor;
	}
	
	// 动画专用的假判定线
	if (!output.fakeJudgeline) {
		output.fakeJudgeline = new PIXI.Sprite(textures.judgeLine);
		output.fakeJudgeline.anchor.set(0.5);
		
		stage.addChild(output.fakeJudgeline);
	}
	
	// =====调整各项目大小=====
	output.songTitle.style.fontSize   = lineScale * 1.1 + 'px';
	output.bgAuthor.style.fontSize    = lineScale * 0.55 + 'px';
	output.chartAuthor.style.fontSize = lineScale * 0.55 + 'px';
	
	output.fakeJudgeline.height = pixi.renderer.lineScale * 18.75 * 0.008;
	output.fakeJudgeline.offsetWidth = pixi.renderer.fixedWidth;
	
	// =====调整各项目位置=====
	output.songTitle.position.x = fixedWidth / 2;
	output.songTitle.position.y = realHeight / 2 * 0.75;
	
	output.bgAuthor.position.x = fixedWidth / 2;
	output.bgAuthor.position.y = realHeight / 2 * 1.25 + lineScale * 0.15;
	
	output.chartAuthor.position.x = fixedWidth / 2;
	output.chartAuthor.position.y = realHeight / 2 * 1.25 + lineScale;
	
	output.fakeJudgeline.position.x = pixi.renderer.fixedWidth / 2;
	output.fakeJudgeline.position.y = pixi.renderer.realHeight / 2;
	
	output.container.alpha = 0;
	
	return output;
}

/***
 * @function 创建谱面信息文字，为了避免 CreateChartSprites() 看着很乱于是单独分出来一个函数
 * @param sprites {object} 用来存放所有精灵的对象
 * @param pixi {object} Pixi.js 应用对象
 * @param [requireFPSCounter] {bool} 是否需要创建一个 FPS 指示器，默认为 false
***/
function CreateChartInfoSprites(chartInfo, sprite, pixi, stage, requireFPSCounter = false, noStartAnimate = false) {
	let realWidth = pixi.renderer.realWidth;
	let realHeight = pixi.renderer.realHeight;
	let fixedWidth = pixi.renderer.fixedWidth;
	let fixedWidthOffset = pixi.renderer.fixedWidthOffset;
	let lineScale = pixi.renderer.lineScale;
	
	let output = sprite;
	if (!output) output = {};
	
	// 头部信息合集
	if (!output.head) {
		output.head = {
			container: new PIXI.Container()
		};
		
		output.head.container.zIndex = 99999;
	}
	if (!output.head.container.parent)
		stage.addChild(output.head.container);
	
	// 进度条
	if (!output.head.progressBar) {
		output.head.progressBar = new PIXI.Sprite(textures.progressBar);
		
		output.head.progressBar.anchor.x = 1;
		
		output.head.container.addChild(output.head.progressBar);
	}
	
	// 分数指示
	if (!output.head.scoreText) {
		output.head.scoreText = new PIXI.Text('0000000', {
			fontFamily: 'Mina',
			fill: 'white'
		});
		
		output.head.scoreText.anchor.x = 1;
		output.head.scoreText.anchor.y = 0.5;
		
		output.head.container.addChild(output.head.scoreText);
	}
	
	// Combo 指示
	if (!output.head.comboText) {
		let combo = new PIXI.Container();
		let number = new PIXI.Text('0', {
			fontFamily : 'Mina',
			fill : 'white'
		});
		let text = new PIXI.Text('combo', {
			fontFamily : 'Mina',
			fill : 'white'
		});
		
		if (settings.autoPlay) text.text = 'Autoplay';
		
		number.anchor.set(0.5);
		text.anchor.set(0.5, 1);
		
		combo.addChild(number);
		combo.addChild(text);
		
		output.head.container.addChild(combo);
		output.head.comboText = combo;
	}
	
	// 底部歌曲信息合集
	if (!output.foot) {
		output.foot = {
			container: new PIXI.Container()
		};
		
		output.foot.container.zIndex = 99999;
	}
	if (!output.foot.container.parent)
		stage.addChild(output.foot.container);
	
	// 底部信息-歌曲名称侧边横线
	if (!output.foot.songNameBar) {
		output.foot.songNameBar = new PIXI.Sprite(textures.songNameBar);
		output.foot.container.addChild(output.foot.songNameBar);
	}
	
	// 底部信息-歌曲名称
	if (!output.foot.songTitle) {
		output.foot.songTitle = new PIXI.Text(_chart.info.name || 'No title', {
			fontFamily : 'Mina',
			fill : 'white',
			align : 'center'
		});
		
		output.foot.songTitle.anchor.y = 1;
		
		output.foot.container.addChild(output.foot.songTitle);
	}
	
	// 底部信息-谱面等级
	if (!output.foot.songDiff) {
		output.foot.songDiff = new PIXI.Text(_chart.info.level || 'SP Lv.?', {
			fontFamily : 'Mina',
			fill : 'white',
			align : 'right'
		});
		
		output.foot.songDiff.anchor.set(1);
		
		output.foot.container.addChild(output.foot.songDiff);
	}
	
	// 对于超宽屏所创建的背景图盖板
	if (!output.backgroundCover) {
		let bgImage = new PIXI.Sprite(settings.backgroundBlur ? _chart.imageBlur : _chart.image);
		let bgBright = new PIXI.Graphics();
		let bgCovers = new PIXI.Container();
		
		bgBright.position.set(-bgImage.width / 2, -bgImage.height / 2);
		bgBright.alpha = 0.5;
		bgImage.addChild(bgBright);
		
		bgImage.anchor.set(0.5);
		bgImage.zIndex = 999999;
		
		pixi.stage.addChild(bgImage);
		
		bgCovers.addChild(new PIXI.Graphics(), new PIXI.Graphics());
		
		bgImage.mask = bgCovers;
		
		output.backgroundCover = {
			image: bgImage,
			cover: bgCovers
		}
	}
	
	// FPS 计数器
	if (requireFPSCounter && !output.fps) {
		let fps = new PIXI.Text('00.00', {
			fontFamily : 'Mina',
			fill: 'rgba(255, 255, 255, 0.5)',
			align: 'right'
		});
		
		fps.anchor.set(1, 0);
		fps.zIndex = 1000000;
		
		pixi.stage.addChild(fps);
		output.fps = fps;
		output.fpsInterval = setInterval(() => { fps.text = (pixi.ticker.FPS).toFixed(2) }, 200);
	}
	
	// 创建水印
	if (!output.watermark) {
		let watermark = new PIXI.Text('Ph1gr0s Emulator v0.1.11 Alpha By MisaLiu Origin By lchzh3473', {
			fontFamily : 'Mina',
			fill: 'rgba(255, 255, 255, 0.5)',
			align: 'right'
		});
		
		watermark.anchor.set(1);
		watermark.zIndex = 1000000;
		
		pixi.stage.addChild(watermark);
		output.watermark = watermark;
	}
	
	// =====调整大小=====
	output.head.progressBar.scale.set(fixedWidth / (textures.progressBar.width / pixi.renderer.resolution));
	output.head.progressBar.height = 3;
	
	output.head.scoreText.style.fontSize = lineScale * 0.95 + 'px';
	output.head.comboText.children[0].style.fontSize = lineScale * 1.32 + 'px';
	output.head.comboText.children[1].style.fontSize = lineScale * 0.66 + 'px';
	
	output.foot.songNameBar.width  = lineScale * 0.119;
	output.foot.songNameBar.height = lineScale * 0.612;
	output.foot.songTitle.style.fontSize = lineScale * 0.63 + 'px';
	output.foot.songDiff.style.fontSize = lineScale * 0.63 + 'px';
	
	{
		let bgScaleWidth = realWidth / _chart.image.width;
		let bgScaleHeight = realHeight / _chart.image.height;
		let bgScale = bgScaleWidth > bgScaleHeight ? bgScaleWidth : bgScaleHeight;
		
		output.backgroundCover.image.scale.set(bgScale);
	}
	
	if (output.fps) output.fps.style.fontSize = lineScale * 0.8 + 'px';
	output.watermark.style.fontSize = lineScale * 0.6 + 'px';
	
	// =====重绘 Graphics=====
	if (fixedWidth < realWidth) {
		output.backgroundCover.image.visible = true;
	} else {
		output.backgroundCover.image.visible = false;
	}
	
	output.backgroundCover.image.children[0].clear();
	output.backgroundCover.image.children[0].beginFill(0x000000)
		.drawRect(
			0,
			0,
			output.backgroundCover.image.texture.baseTexture.width,
			output.backgroundCover.image.texture.baseTexture.height
		)
		.endFill();
	
	output.backgroundCover.cover.children[0].clear();
	output.backgroundCover.cover.children[1].clear();
	
	output.backgroundCover.cover.children[0].beginFill(0xFFFFFF)
		.drawRect(0, 0, fixedWidthOffset, realHeight)
		.endFill();
	
	output.backgroundCover.cover.children[1].beginFill(0xFFFFFF)
		.drawRect(realWidth - fixedWidthOffset, 0, fixedWidthOffset, realHeight)
		.endFill();
	
	// =====统一调整位置和透明度=====
	if (!noStartAnimate) {
		output.head.comboText.alpha = 0;
		output.head.container.alpha = 0;
		output.foot.container.alpha = 0;
	}
	
	output.head.scoreText.position.set(fixedWidth - lineScale * 0.65, lineScale * 1.375);
	
	output.head.comboText.position.x = fixedWidth / 2;
	output.head.comboText.children[0].position.y = lineScale * 1.375;
	output.head.comboText.children[1].position.y = lineScale * 1.375 + output.head.comboText.children[0].height;
	
	output.foot.songNameBar.position.x = lineScale * 0.53;
	output.foot.songNameBar.position.y = realHeight - lineScale * 1.22;
	
	output.foot.songTitle.position.x = lineScale * 0.85;
	output.foot.songTitle.position.y = realHeight - lineScale * 0.525;
	
	output.foot.songDiff.position.x = fixedWidth - lineScale * 0.75;
	output.foot.songDiff.position.y = realHeight - lineScale * 0.525;
	
	output.backgroundCover.image.position.set(realWidth / 2, realHeight / 2);
	
	output.fps.position.set(realWidth - 1, 1);
	
	output.watermark.position.set(realWidth - 2, realHeight - 2);
	
	if (!noStartAnimate) {
		output.head.container.position.y = -output.head.container.height;
		output.foot.container.position.y = output.head.container.height;
	} else {
		output.head.container.position.y = 0;
		output.foot.container.position.y = 0;
	}
	
	return output;
}

/***
 * @function 游戏结束时绘制结算画面
***/
function CreateGameEndSprites(sprite, pixi, stage, noAnimate = false) {
	let realWidth = pixi.renderer.realWidth;
	let realHeight = pixi.renderer.realHeight;
	let fixedWidth = pixi.renderer.fixedWidth;
	let fixedWidthOffset = pixi.renderer.fixedWidthOffset;
	let lineScale = pixi.renderer.lineScale;
	
	let panelWidth = lineScale * 27.621528;
	let panelHeight = lineScale * 14.461806;
	let paddingWidth = lineScale * 1.111111;
	
	let bgWidth = lineScale * 13.680556;
	let marginWidth = lineScale * 0.399306;
	
	let bgScaleWidth = bgWidth / _chart.image.width;
	let bgScaleHeight = bgWidth / _chart.image.height;
	let bgScale = bgScaleWidth > bgScaleHeight ? bgScaleWidth : bgScaleHeight;
	
	let output = sprite;
	
	if (!output) { // 创建组件与组件推送
		output = {};
		
		output.container = new PIXI.Container();
		
		output.bgRect = new PIXI.Graphics();
		
		output.image = {
			image    : new PIXI.Sprite(),
			gradient : new PIXI.Graphics(),
			cover    : new PIXI.Graphics(),
			songName : new PIXI.Text('', {
				fontFamily : 'Mina',
				fill       : 'white'
			}),
			songDiff : new PIXI.Text('', {
				fontFamily : 'Mina',
				fill       : 'white'
			}),
			retryBtn : new PIXI.Graphics()
		};
		
		output.judgeIcon = new PIXI.Sprite();
		output.newScore  = new PIXI.Text('', {
			fontFamily : 'Mina',
			fill       : 'white'
		});
		output.score     = new PIXI.Text('', {
			fontFamily : 'Mina',
			fill       : 'white'
		});
		
		output.judge = {
			container : new PIXI.Container(),
			perfect   : new PIXI.Text('', {
				fontFamily: 'Mina',
				fill: 'white'
			}),
			good      : new PIXI.Text('', {
				fontFamily: 'Mina',
				fill: 'white'
			}),
			bad       : new PIXI.Text('', {
				fontFamily: 'Mina',
				fill: 'white'
			}),
			miss      : new PIXI.Text('', {
				fontFamily: 'Mina',
				fill: 'white'
			})
		}
		output.acc   = {
			container : new PIXI.Container(),
			percent   : new PIXI.Text('', {
				fontFamily: 'Mina',
				fill:'white'
			}),
			apType    : new PIXI.Text('', {
				fontFamily: 'Mina',
				fill:'white'
			})
		}
		
		output.container.addChild(output.bgRect);
		
		output.image.image.addChild(output.image.gradient);
		output.container.addChild(output.image.image, output.image.cover, output.image.songName, output.image.songDiff, output.image.retryBtn);
		
		output.container.addChild(output.judgeIcon);
		output.container.addChild(output.newScore);
		output.container.addChild(output.score);
		
		output.judge.container.addChild(output.judge.perfect, output.judge.good, output.judge.bad, output.judge.miss);
		output.container.addChild(output.judge.container);
		
		output.acc.container.addChild(output.acc.percent, output.acc.apType);
		output.container.addChild(output.acc.container);
		
		stage.addChild(output.container);
	}
	
	// =====设置贴图=====
	output.image.image.texture = _chart.image;
	switch (score.judge) {
		case 0: { output.judgeIcon.texture = textures.judgeIcon.false;
			break;
		}
		case 1: { output.judgeIcon.texture = textures.judgeIcon.c;
			break;
		}
		case 2: { output.judgeIcon.texture = textures.judgeIcon.b;
			break;
		}
		case 3: { output.judgeIcon.texture = textures.judgeIcon.a;
			break;
		}
		case 4: { output.judgeIcon.texture = textures.judgeIcon.s;
			break;
		}
		case 5: { output.judgeIcon.texture = textures.judgeIcon.v;
			break;
		}
		case 6: { output.judgeIcon.texture = textures.judgeIcon.phi;
			break;
		}
	}
	
	// =====绘制 Graphics =====
	// 绘制矩形打底
	output.bgRect.clear();
	output.bgRect.beginFill(0xFFFFFF, 0.11)
			.drawRoundedRect(0, 0, panelWidth, panelHeight, lineScale * 0.78125)
			.endFill();
	
	// 创建背景图渐变遮罩
	output.image.gradient.clear();
	output.image.gradient.beginFill(0x000000)
		.drawRect(-output.image.image.width / 2, -55 / 2, output.image.image.width, 50)
		.endFill();
	
	// 创建背景图遮罩（用于制作背景图圆角）
	output.image.cover.clear();
	output.image.cover.beginFill(0xFFFFFF)
		.drawRoundedRect(0, 0, bgWidth, bgWidth, lineScale * 0.520833)
		.endFill();
	
	// 创建重试按钮
	output.image.retryBtn.clear();
	output.image.retryBtn.beginFill(0x000000, 0.6)
		.drawRoundedRect(0, 0, lineScale * 3.802083, lineScale * 1.336806, lineScale * 0.347222)
		.endFill();
	
	if (!output.image.retryBtn.children[0]) {
		output.image.retryBtn.addChild(new PIXI.Text('重试', {
			fontFamily : 'Mina',
			fill       : 'white'
		}));
		
		// 监听重试按钮按下动作
		output.image.retryBtn.interactive = true;
		output.image.retryBtn.buttonMode = true;
		
		output.image.retryBtn.on('pointerdown', () => {
			gameRestart();
		});
	}
	
	// =====文本内容与大小=====
	output.image.songName.text = _chart.info.name || 'No name';
	output.image.songDiff.text = _chart.info.level || 'SP Lv.?';
	
	output.newScore.text = 'Max combo: ' + score.maxCombo;
	output.score.text = score.scoreText;
	
	output.judge.perfect.text = 'Perfect ' + score.perfect;
	output.judge.good.text = 'Good ' + score.good;
	output.judge.bad.text = 'Bad ' + score.bad;
	output.judge.miss.text = 'Miss ' + score.miss;
	
	output.acc.apType.text = (score.apType == 2 ? 'All Perfect' : (score.apType == 1 ? 'Full Combo' : ''));
	output.acc.percent.text = score.acc + '%';
	
	output.image.songName.style.fontSize = lineScale * 0.868056 + 'px';
	output.image.songDiff.style.fontSize = lineScale * 0.347222 + 'px';
	output.image.retryBtn.children[0].style.fontSize = lineScale * 0.520833 + 'px';
	
	output.newScore.style.fontSize = lineScale * 0.520833 + 'px';
	output.score.style.fontSize = lineScale * 1.736111 + 'px';
	
	output.judge.perfect.style.fontSize = lineScale * 0.347222 + 'px';
	output.judge.good.style.fontSize = lineScale * 0.347222 + 'px';
	output.judge.bad.style.fontSize = lineScale * 0.347222 + 'px';
	output.judge.miss.style.fontSize = lineScale * 0.347222 + 'px';
	
	output.acc.percent.style.fontSize = lineScale * 0.347222 + 'px';
	output.acc.apType.style.fontSize = lineScale * 0.520833 + 'px';
	
	output.acc.apType.visible = (score.apType > 0 ? true : false);
	
	// =====定位与缩放=====
	// 设置背景图缩放和位置
	output.image.image.anchor.set(0.5);
	output.image.image.scale.set(bgScale);
	output.image.image.position.x = (panelWidth - bgWidth) + bgWidth / 2;
	output.image.image.position.y = panelHeight / 2;
	
	// 背景图渐变遮罩设置效果和位置
	if (!output.image.gradient.filters) {
		output.image.gradient.filters = [ new PIXI.filters.BlurFilter(14, 4, PIXI.settings.FILTER_RESOLUTION, 9) ]; // 灵魂！
	}
	
	output.image.gradient.scale.set(1 / bgScale);
	output.image.gradient.position.y = output.image.image.texture.baseTexture.height / 2;
	
	// 背景图圆角遮罩位置
	output.image.cover.position.set(panelWidth - bgWidth - marginWidth, marginWidth);
	output.image.image.mask = output.image.cover;
	
	// 歌曲名称
	output.image.songName.position.x = lineScale * 14.21875;
	output.image.songName.position.y = lineScale * 11.701389;
	
	// 歌曲名称压扁
	if (output.image.songName.width > bgWidth - (lineScale * 14.21875 - (panelWidth - bgWidth - marginWidth)) * 2) {
		output.image.songName.width = bgWidth - (lineScale * 14.21875 - (panelWidth - bgWidth - marginWidth)) * 2;
	}
	
	// 歌曲难度
	output.image.songDiff.position.x = lineScale * 14.21875;
	output.image.songDiff.position.y = lineScale * 12.829861;
	
	// 重试按钮位置
	output.image.retryBtn.position.x = panelWidth - lineScale * 3.802083 - lineScale * 1.128472;
	output.image.retryBtn.position.y = panelHeight - lineScale * 1.336806 - lineScale * 0.711806;
	
	// 重试按钮字体位置
	output.image.retryBtn.children[0].anchor.set(0.5);
	output.image.retryBtn.children[0].position.x = lineScale * 3.802083 / 2;
	output.image.retryBtn.children[0].position.y = lineScale * 1.336806 / 2;
	
	// 歌曲判定等级图标
	output.judgeIcon.scale.set(lineScale * 4.930556 / output.judgeIcon.texture.baseTexture.width);
	output.judgeIcon.position.x = lineScale * 0.295139;
	output.judgeIcon.position.y = lineScale * 1.979167;
	
	// 新分数
	output.newScore.position.x = paddingWidth;
	output.newScore.position.y = lineScale * 8.211806;
	
	// 本局分数
	output.score.position.x = paddingWidth;
	output.score.position.y = lineScale * 8.854167;
	
	// 判定详情
	output.judge.good.position.x = output.judge.perfect.width + lineScale * 0.78125;
	output.judge.bad.position.x = output.judge.good.position.x + output.judge.good.width + lineScale * 0.78125;
	output.judge.miss.position.x = output.judge.bad.position.x + output.judge.bad.width + lineScale * 0.78125;
	
	output.judge.container.position.x = paddingWidth;
	output.judge.container.position.y = lineScale * 11.041667;
	
	// 准度和准度等级
	output.acc.percent.anchor.y = output.acc.apType.visible ? 1 : 0;
	
	output.acc.percent.position.x = output.acc.apType.visible ? output.acc.apType.width + lineScale * 0.416667 : 0;
	output.acc.percent.position.y = output.acc.apType.visible ? output.acc.apType.height : lineScale * 0.138889;
	
	output.acc.container.position.x = paddingWidth;
	output.acc.container.position.y = output.judge.container.position.y + output.judge.container.height + lineScale * 1.163194;
	
	output.container.position.x = (fixedWidth - output.container.width) / 2;
	output.container.position.y = (realHeight - output.container.height) / 2;
	
	// 透明度相关
	if (!noAnimate) {
		output.container.position.x = fixedWidth;
		
		output.judgeIcon.alpha = 0;
		output.newScore.alpha = 0;
		output.score.alpha = 0;
		output.judge.container.alpha = 0;
		output.acc.container.alpha = 0;
	}
	
	return output;
}

/***
 * @function 创建游戏结束动画 Ticker
***/
function CreateGameEndAnimation(pixi, sprites) {
	let audioTexture = null;
	let endAnimateTimer = new Timer();
	let endAnimateBezier = new Cubic(.19, .36, .48, 1.01);
	let endAnimateTicker = function() {
		let endUi = sprites.ui.end,
			gameHeadUi = sprites.ui.game.head,
			gameFootUi = sprites.ui.game.foot;
		
		let paddingWidth = pixi.renderer.lineScale * 1.111111;
		
		if (endAnimateTimer.time >= 5.4) { // 结束动画
			endAnimateTimer.stop();
			pixi.ticker.remove(endAnimateTicker);
			stat.isTransitionEnd = true;
			
		} else if (endAnimateTimer.time >= 4.8) { // 分数等级判定图标入场
			endUi.judgeIcon.alpha = (endAnimateTimer.time - 4.8) / 0.6;
			
		} else if (endAnimateTimer.time >= 3.6) { // 结算界面子元素的入场动画
			if (endAnimateTimer.time >= 4.6) { // 准度信息入场
				endUi.acc.container.alpha = ((endAnimateTimer.time - 4.6) / 0.2);
				endUi.acc.container.position.x = paddingWidth + (paddingWidth * (1 - endAnimateBezier.solve((endAnimateTimer.time - 4.6) / 0.2)));
				
			} else if (endAnimateTimer.time >= 4.4) { // 判定详细信息入场
				endUi.judge.container.alpha = ((endAnimateTimer.time - 4.4) / 0.2);
				endUi.judge.container.position.x = paddingWidth + (paddingWidth * (1 - endAnimateBezier.solve((endAnimateTimer.time - 4.4) / 0.2)));
				
			} else if (endAnimateTimer.time >= 4.2) { // newScore 入场
				endUi.newScore.alpha = ((endAnimateTimer.time - 4.2) / 0.2);
				endUi.newScore.position.x = paddingWidth + (paddingWidth * (1 - endAnimateBezier.solve((endAnimateTimer.time - 4.2) / 0.2)));
			}
			
			if (endAnimateTimer.time < 4.2) { // 分数入场动画
				if (endAnimateTimer.time < 3.8) {
					endUi.score.alpha = (endAnimateTimer.time - 3.6) / 0.2;
					endUi.score.position.x = paddingWidth + (paddingWidth * (1 - endAnimateBezier.solve((endAnimateTimer.time - 3.6) / 0.2)));
				}
				
				endUi.score.text = (Number(score.score) * ((endAnimateTimer.time - 3.6) / 0.6)).toFixed(0) + '';
				while (endUi.score.text.length < 7) {
					endUi.score.text = '0' + endUi.score.text;
				}
			} else {
				endUi.score.alpha = 1;
				endUi.score.text = score.scoreText;
				endUi.score.position.x = paddingWidth;
			}
			
		} else if (endAnimateTimer.time >= 3) { // 播放结算音乐和入场动画
			if (!global.levelOverAudio) {
				global.levelOverAudio = audioTexture.play({ volume:settings.musicVolume });
			}
			endUi.container.position.x = pixi.renderer.fixedWidth - (pixi.renderer.fixedWidth + endUi.container.width) / 2 * endAnimateBezier.solve((endAnimateTimer.time - 3) / 0.6);
			
		} else if (endAnimateTimer.time >= 0.67) { // 随意等待一会
			if (sprites.ui.start.fakeJudgeline.visible === true) {
				sprites.ui.start.fakeJudgeline.visible = false;
			}
			
			if (!sprites.ui.end) {
				sprites.ui.end = CreateGameEndSprites(sprites.ui.end, pixi, sprites.mainContainer);
			}
			
			gameHeadUi.container.position.y = -gameHeadUi.container.height;
			gameFootUi.container.position.y = gameHeadUi.container.height;
			
			gameHeadUi.container.alpha = 0;
			gameFootUi.container.alpha = 0;
			
		} else { // 收起游戏界面的头尾信息区
			gameHeadUi.container.position.y = -gameHeadUi.container.height * endAnimateBezier.solve(endAnimateTimer.time / 0.67);
			gameFootUi.container.position.y = gameHeadUi.container.height * endAnimateBezier.solve(endAnimateTimer.time / 0.67);
			
			gameHeadUi.container.alpha = 1 - (endAnimateTimer.time / 0.67);
			gameFootUi.container.alpha = 1 - (endAnimateTimer.time / 0.67);
			
			sprites.ui.start.fakeJudgeline.width = sprites.ui.start.fakeJudgeline.offsetWidth * (1 - endAnimateBezier.solve(endAnimateTimer.time / 0.67));
			sprites.game.background.children[0].alpha = 0.5 + ((1 - settings.backgroundDim) - 0.5) * (1 - (endAnimateTimer.time / 0.67));
		}
	}
	
	stat.isEnd = true;
	
	sprites.ui.start.fakeJudgeline.visible = true;
	
	for (let judgeLine of sprites.game.judgeLines) {
		judgeLine.visible = false;
	}
	for (let note of sprites.game.notes) {
		note.visible = false;
	}
	for (let note of sprites.game.fakeNotes) {
		note.visible = false;
	}
	
	{
		let pattern = /^([a-zA-Z]+)\sLv\.(\d+|\?)$/;
		let levelDiffType = pattern.exec(_chart.info.level);
		
		if (!levelDiffType || levelDiffType.length < 3 || !levelDiffType[1]) {
			levelDiffType = 'in';
		} else {
			levelDiffType = levelDiffType[1].toLowerCase();
		}
		
		switch (levelDiffType) {
			case 'ez': { audioTexture = textures.sound.levelOver.ez;
				break;
			}
			case 'hd': { audioTexture = textures.sound.levelOver.hd;
				break;
			}
			case 'in': { audioTexture = textures.sound.levelOver.in;
				break;
			}
			case 'at': { audioTexture = textures.sound.levelOver.at;
				break;
			}
			case 'sp': { audioTexture = textures.sound.levelOver.sp;
				break;
			}
			default: { audioTexture = textures.sound.levelOver.in; }
		}
	}
	
	stat.isTransitionEnd = false;
	endAnimateTimer.start();
	pixi.ticker.add(endAnimateTicker);
}

/***
 * @function 实时计算当前时间下的精灵数据。该方法应在 PIXI.Ticker 中循环调用
***/
function CalculateChartActualTime() {
	if (sprites.performanceIndicator) sprites.performanceIndicator.begin();
	
	let currentTime = (global.audio ? _chart.audio.duration * global.audio.progress : 0) - _chart.data.offset - _chart.audio.baseLatency - settings.chartDelay,
		fixedWidth = pixi.renderer.fixedWidth,
		realHeight = pixi.renderer.realHeight,
		fixedWidthHalf = fixedWidth / 2,
		realHeightHalf = realHeight / 2,
		fixedWidthPercent = pixi.renderer.fixedWidthPercent,
		fixedWidthOffset = pixi.renderer.fixedWidthOffset,
		noteSpeed = pixi.renderer.noteSpeed,
		noteScale = pixi.renderer.noteScale,
		rendererResolution = pixi.renderer.resolution;
	
	let gameUi = sprites.ui.game,
		gameHeadUi = gameUi.head,
		gameFootUi = gameUi.foot,
		gameSprites = sprites.game;
	
	// 进度条
	gameHeadUi.progressBar.position.x = fixedWidth * (global.audio ? global.audio.progress : 0);
	
	for (let judgeLine of gameSprites.judgeLines) { // 处理所有的 Note Container
		if (!settings.disableJudgeLineAlpha) { // 判定线透明度
			for (let i of judgeLine.raw.judgeLineDisappearEvents) {
				if (currentTime < i.startRealTime) break;
				if (currentTime > i.endRealTime) continue;
				
				let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
				let time1 = 1 - time2;
				
				judgeLine.alpha = i.start * time1 + i.end * time2;
			}
		}
		
		for (let i of judgeLine.raw.judgeLineMoveEvents) { // 判定线移动
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
			let time1 = 1 - time2;
			
			judgeLine.position.x = fixedWidth * (i.start * time1 + i.end * time2);
			judgeLine.position.y = realHeight * (1 - i.start2 * time1 - i.end2 * time2);
		}
		
		for (const i of judgeLine.raw.judgeLineRotateEvents) { // 判定线旋转
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
			let time1 = 1 - time2;
			
			judgeLine.rotation = i.startDeg * time1 + i.endDeg * time2;
			
			judgeLine.cosr = Math.cos(judgeLine.rotation);
			judgeLine.sinr = Math.sin(judgeLine.rotation);
		}
		
		for (const i of judgeLine.raw.speedEvents) { // 判定线流速
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			judgeLine.currentOffsetY = (currentTime - i.startRealTime) * i.value + i.floorPosition;
		}
	}
	
	judgements.addJudgement(gameSprites.notes, currentTime);
	
	for (let note of gameSprites.notes) {
		judgements.judgeSingleNote(note.raw, getNotePosition(note, false), currentTime, fixedWidth * 0.117775);
		
		if (note.isProcessed === true) continue;
		if (note.raw.isScored === true && note.isProcessed === false && note.raw.type !== 3) {
			note.visible = false;
			note.isProcessed = true;
			continue;
		}
		
		let timeBetween = currentTime - note.raw.realTime;
		let judgeLine = gameSprites.judgeLines[note.raw.lineId];
		let noteRaw = note.raw;
		let judgeLineRaw = judgeLine.raw;
		
		let noteX = noteRaw.positionX.toFixed(6) * fixedWidthPercent,
			noteY = 0,
			realNoteX = 0,
			realNoteY = 0;
		
		if (noteRaw.type != 3 || noteRaw.forceChangeSpeed) {
			noteY = (noteRaw.offsetY - judgeLine.currentOffsetY) * noteRaw.speed;
		} else if (noteRaw.realTime < currentTime) {
			noteY = (noteRaw.realTime - currentTime) * noteRaw.speed;
		} else {
			noteY = noteRaw.offsetY - judgeLine.currentOffsetY;
		}
		
		if (noteRaw.offsetY < judgeLine.currentOffsetY) {
			if (noteRaw.type === 3) { // 处理 Hold 的长度
				let currentHoldLength = (noteRaw.holdLength + noteRaw.offsetY) - judgeLine.currentOffsetY;
				if (currentHoldLength > 0) {
					if (note.visible === false) note.visible = true;
					if (note.children[0].visible === true) note.children[0].visible = false;
					
					note.children[1].height = currentHoldLength * noteSpeed / noteScale;
					note.children[2].position.y = -note.children[1].height;
					
					noteY = 0;
					
				} else {
					if (note.visible === true) {
						if (noteRaw.isScored === true) note.isProcessed = true;
						note.visible = false;
					}
				}
			} else if (timeBetween < 0 && note.visible === true) { // 处理已经到了另一边但未到时间的 Note 的可视属性
				note.visible = false;
			}
		} else {
			if (noteRaw.type === 3 && note.children[0].visible === false) {
				note.children[0].visible = true;
				
				note.children[1].height = noteRaw.holdLength * noteSpeed / noteScale;
				note.children[2].position.y = -note.children[1].height;
				
			} else if (timeBetween < 0 && note.visible === false) {
				note.visible = true;
			}
		}
		
		noteY = noteY * (noteRaw.isAbove ? -1 : 1) * noteSpeed;
		
		realNoteX = noteX * judgeLine.cosr - noteY * judgeLine.sinr;
		realNoteY = noteY * judgeLine.cosr + noteX * judgeLine.sinr;
		
		note.position.x = realNoteX + judgeLine.position.x;
		note.position.y = realNoteY + judgeLine.position.y;
		note.angle = judgeLine.angle + (noteRaw.isAbove ? 0 : 180);
		
		if (timeBetween > 0) { // 处理超时的 Note
			if (noteRaw.type != 3) {
				note.alpha = 1 - (timeBetween / global.judgeTimes.bad);
				if (timeBetween > global.judgeTimes.bad) {
					note.visible = false;
					note.isProcessed = true;
				}
			} else {
				if (noteRaw.score === 1 && note.alpha !== 0.5) {
					note.alpha = 0.5;
				}
				/**
				if (timeBetween - noteRaw.realHoldTime > 0) {
					note.visible = false;
					note.isProcessed = true;
				}
				**/
			}
		}
	}

	for (let note of gameSprites.fakeNotes) { // 处理 FakeNote
		if (note.isProcessed === true) continue;
		
		let timeBetween = currentTime - note.raw.realTime;
		let judgeLine = gameSprites.judgeLines[note.raw.lineId];
		let noteRaw = note.raw;
		let judgeLineRaw = judgeLine.raw;
		
		let noteX = noteRaw.positionX.toFixed(6) * fixedWidthPercent,
			noteY = 0,
			realNoteX = 0,
			realNoteY = 0;
		
		if (noteRaw.type != 3 || noteRaw.forceChangeSpeed) {
			noteY = (noteRaw.offsetY - judgeLine.currentOffsetY) * noteRaw.speed;
		} else if (noteRaw.realTime < currentTime) {
			noteY = (noteRaw.realTime - currentTime) * noteRaw.speed;
		} else {
			noteY = noteRaw.offsetY - judgeLine.currentOffsetY;
		}
		
		if (noteRaw.offsetY < judgeLine.currentOffsetY) {
			if (noteRaw.type === 3) { // 处理 Hold 的长度
				let currentHoldLength = (noteRaw.holdLength + noteRaw.offsetY) - judgeLine.currentOffsetY;
				if (currentHoldLength > 0) {
					if (note.visible === false) note.visible = true;
					if (note.children[0].visible === true) note.children[0].visible = false;
					
					note.children[1].height = currentHoldLength * noteSpeed / noteScale;
					note.children[2].position.y = -note.children[1].height;
					
					noteY = 0;
					
				} else {
					if (note.visible === true) note.visible = false;
				}
			} else if (timeBetween < 0 && note.visible === true) { // 处理已经到了另一边但未到时间的 Note 的可视属性
				note.visible = false;
			}
		} else {
			if (noteRaw.type === 3 && note.children[0].visible === false) {
				note.children[0].visible = true;
				
				note.children[1].height = (noteRaw.holdLength + noteRaw.offsetY) * noteSpeed / noteScale;
				note.children[2].position.y = -note.children[1].height;
				
			} else if (timeBetween < 0 && note.visible === false) {
				note.visible = true;
			}
		}
		
		noteY = noteY * (noteRaw.isAbove ? -1 : 1) * noteSpeed;
		
		realNoteX = noteX * judgeLine.cosr - noteY * judgeLine.sinr;
		realNoteY = noteY * judgeLine.cosr + noteX * judgeLine.sinr;
		
		note.position.x = realNoteX + judgeLine.position.x;
		note.position.y = realNoteY + judgeLine.position.y;
		note.angle = judgeLine.angle + (noteRaw.isAbove ? 0 : 180);
		
		if (timeBetween > 0) { // 处理超时的 Note
			if (noteRaw.type != 3) {
				note.alpha = 1 - (timeBetween / global.judgeTimes.bad);
				if (timeBetween > global.judgeTimes.bad) {
					note.visible = false;
				}
			} else {
				if (noteRaw.score === 1 && note.alpha !== 0.5) {
					note.alpha = 0.5;
				}
			}
		}
	}
	
	if (settings.spectrumSettings.enabled && global.audioAnalyser) {
		gameSprites.spectrumGraphics.clear();
		
		global.audioAnalyser.getByteFrequencyData(global.audioAnalyser.dataArray);
		
		let barBetween = fixedWidth * .002;
		let barWidth = fixedWidth / global.audioAnalyser.bufferLength - barBetween;
		let currentX = barBetween / 2;
		let dataArray = global.audioAnalyser.dataArray;
		
		for (let i = 0; i < global.audioAnalyser.bufferLength; i++) {
			const barHeight = dataArray[i] / 255;
			
			gameSprites.spectrumGraphics.beginFill(_chart.image.baseColor, (barHeight * (3 / 4) + (1 / 4)) * settings.spectrumSettings.alphaPercent)
				.drawRect(currentX, 0, barWidth, -barHeight * realHeight * settings.spectrumSettings.heightPercent)
				.endFill();
			
			currentX += barWidth + barBetween;
		}
	} else if (settings.spectrumSettings.enabled) {
		gameSprites.spectrumGraphics.clear();
	}
	
	// judgements.addJudgement(gameSprites.notes, currentTime);
	// judgements.judgeNote(gameSprites.notes, currentTime, fixedWidth * 0.117775);
	
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
		CreateGameEndAnimation(pixi, sprites);
	}
	
	if (sprites.performanceIndicator) sprites.performanceIndicator.end();
}

/***
 * @function 实时处理打击动画
***/
function CalculateClickAnimateActualTime() {
	if (stat.isPaused) return;
	
	for (let i in sprites.clickAnimate) {
		let obj = sprites.clickAnimate[i];
		
		if (obj.type > 2) {
			obj = obj.children[0];
			
			let currentFrameProgress = obj.currentFrame / obj.totalFrames;
			
			for (let i = 1; i < obj.parent.children.length; i++) {
				let block = obj.parent.children[i];
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
			
			obj.alpha = 1 - currentFrameProgress;
			
			if (!obj.playing) {
				sprites.clickAnimate.splice(i, 1);
				obj.parent.destroy();
			};
		} else {
			obj.alpha = 1 - ((Date.now() - obj.time) / 500);
			
			if (Date.now() >= obj.time + 500) {
				obj.destroy();
				sprites.clickAnimate.splice(i, 1);
			}
		}
	}
}

/***
 * @function 创建打击动画
***/
function CreateClickAnimation(offsetX, offsetY, angle, score, performance = false) {
	let obj = undefined;
	let fixedWidth = pixi.renderer.fixedWidth;
	let noteScale = pixi.renderer.noteScale;
	
	if (!pixi || !settings.clickAnimate) return;
	if (score <= 1) return;
	
	if (score >= 3) {
		let animate = new PIXI.AnimatedSprite(textures.clickRaw);
		let blockWidth = 30 * 0.4988;
		let blocks = [ null, null, null, null ];
		
		obj = new PIXI.Container();
		obj.scale.set(noteScale * 5.6);
		
		// 定义动画精灵
		animate.tint = score == 4 ? 0xFFECA0 : 0xB4E1FF;
		animate.anchor.set(0.5);
		animate.scale.set(256 / animate.texture.baseTexture.width);
		animate.loop = false;
		
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
	} else {
		obj = new PIXI.Sprite(textures.tap2);
		
		obj.anchor.set(0.5);
		obj.scale.set(noteScale);
		obj.angle = angle;
		
		obj.tint = 0x6c4343;
	}
	
	obj.zIndex = 9999;
	obj.position.set(offsetX, offsetY);
		
	obj.type = score;
	obj.time = Date.now();
	
	sprites.clickAnimate.push(obj);
	sprites.mainContainer.addChild(obj);
	
	if (score >= 3) obj.children[0].play();
}

/***
 * @function 播放打击音
***/
function PlayHitsound(note, volume) {
	let hitsoundTexture = null;
	
	if (note.hitsound) {
		hitsoundTexture = note.hitsound;
		
	} else if (!hitsoundTexture && note.score > 2) {
		switch(note.type) {
			case 1: { hitsoundTexture = textures.sound.tap;
				break;
			}
			case 2: { hitsoundTexture = textures.sound.drag;
				break;
			}
			case 3: { hitsoundTexture = textures.sound.tap;
				break;
			}
			case 4: { hitsoundTexture = textures.sound.flick;
				break;
			}
			default: { hitsoundTexture = textures.sound.tap; }
		}
	}
	
	if (hitsoundTexture) return hitsoundTexture.play({ volume:volume });
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
	let lineScale = fixedWidth > height * 0.75 ? height / 18.75 : fixedWidth / 14.0625;
	let noteScale = fixedWidth / _noteScale;
	let noteSpeed = height * 0.6;
	
	// 处理总 Container 的位置
	sprites.mainContainer.position.x = fixedWidthOffset;
	
	// 处理背景图
	if (sprites.game.background) {
		let bgScaleWidth = fixedWidth / _chart.image.width;
		let bgScaleHeight = pixi.renderer.realHeight / _chart.image.height;
		let bgScale = bgScaleWidth > bgScaleHeight ? bgScaleWidth : bgScaleHeight;
		
		sprites.game.background.scale.set(bgScale);
		sprites.game.background.position.set(fixedWidth / 2, height / 2);
	}
	
	// 处理 UI 缩放
	sprites.ui.start = CreateGameStartSprites(_chart.info, sprites.ui.start, pixi, sprites.mainContainer);
	sprites.ui.game = CreateChartInfoSprites(_chart.info, sprites.ui.game, pixi, sprites.mainContainer, true, true);
	
	// 处理准度指示器
	if (sprites.ui.game.head.accIndicator) {
		sprites.ui.game.head.accIndicator.container.position.x = fixedWidth / 2;
		sprites.ui.game.head.accIndicator.container.scale.set(fixedWidth / sprites.ui.game.head.accIndicator.scale);
	}
	
	if (sprites.game.spectrumGraphics) {
		sprites.game.spectrumGraphics.position.y = height;
	}
	
	// 不处理没有判定线和 Note 的精灵对象
	if (!sprites.game.judgeLines || !sprites.game.notes) {
		return;
	}
	if (sprites.game.judgeLines.length <= 0 || sprites.game.notes.length <= 0) {
		return;
	}
	
	// 处理判定线
	for (let judgeLine of sprites.game.judgeLines) {
		judgeLine.height = lineScale * 18.75 * 0.008;
		judgeLine.width = judgeLine.height * judgeLine.texture.width / judgeLine.texture.height * 1.042;
	}
	
	// 处理 Note
	for (let note of sprites.game.notes) {
		// 处理 Hold
		if (note.raw.type == 3 && note.children.length === 3) {
			note.children[1].height = note.raw.holdLength * noteSpeed / noteScale;
			note.children[2].position.y = -note.children[1].height;
		}
		
		note.scale.set(noteScale);
	}

	// 处理 FakeNote
	for (let note of sprites.game.fakeNotes) {
		// 处理 Hold
		if (note.raw.type == 3 && note.children.length === 3) {
			note.children[1].height = note.raw.holdLength * noteSpeed / noteScale;
			note.children[2].position.y = -note.children[1].height;
		}
		
		note.scale.set(noteScale);
	}
	
	// 处理结算页面
	if (sprites.ui.end) {
		sprites.ui.end = CreateGameEndSprites(sprites.ui.end, pixi, sprites.mainContainer, stat.isTransitionEnd);
	}
}

/***
 * @function 创建一个 osu! 风格的准度指示器
***/
function CreateAccurateIndicator(pixi, stage, scale = 500, challengeMode = false) {
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
	
	stage.addChild(container);
	
	// 指示器刻度淡出
	pixi.ticker.add(() => {
		if (container.children.length > 1) {
			for (let i = 1, length = container.children.length; i < length; i++) {
				let accurate = container.children[i];
				if (!accurate) continue;
				
				accurate.alpha = 1 - ((Date.now() - accurate.time) / 2000);
				if (Date.now() >= accurate.time + 2000) {
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
		accGraphic.time = Date.now();
		
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
	let noteRaw = note.raw,
		judgeLine = sprites.game.judgeLines[noteRaw.lineId];
	
	if (!noteRaw || !judgeLine) return { x: NaN, y: NaN, angle: NaN, sinr: NaN, cosr: NaN };
	
	let cosr = judgeLine.cosr,
		sinr = judgeLine.sinr,
		parentX = judgeLine.position.x,
		parentY = judgeLine.position.y,
		realX = (noteRaw.positionX.toFixed(6) * pixi.renderer.fixedWidthPercent) * cosr + parentX + pixi.renderer.fixedWidthOffset,
		realY = (noteRaw.positionX.toFixed(6) * pixi.renderer.fixedWidthPercent) * sinr + parentY;
	
	return { x: realX, y: realY, angle: judgeLine.angle, sinr: sinr, cosr: cosr };
}

/** 留着万一以后还要做测试用
function TestGetGlobalPosition() {
	for (let x = 0; x < 10; x++) {
		let startTime = Date.now();
		
		for (let i = 0; i < 10000; i++) {
			let note = sprites.game.notes[0];
			
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