// 游戏分数相关
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
		
		this.scorePerNote = (isChallenge ? 1000000 : 900000) / totalNotes;
		
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

// 全屏相关。代码来自 lchzh3473
const full = {
	// 切换全屏状态
	toggle(elem) {
		if (!this.enabled) return false;
		if (this.element) {
			if (document.exitFullscreen) return document.exitFullscreen();
			if (document.cancelFullScreen) return document.cancelFullScreen();
			if (document.webkitCancelFullScreen) return document.webkitCancelFullScreen();
			if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
			if (document.msExitFullscreen) return document.msExitFullscreen();
		} else {
			if (!(elem instanceof HTMLElement)) elem = document.body;
			if (elem.requestFullscreen) return elem.requestFullscreen();
			if (elem.webkitRequestFullscreen) return elem.webkitRequestFullscreen();
			if (elem.mozRequestFullScreen) return elem.mozRequestFullScreen();
			if (elem.msRequestFullscreen) return elem.msRequestFullscreen();
		}
	},
	
	// 检查当前全屏的元素是否一致
	check(elem) {
		if (!(elem instanceof HTMLElement)) elem = document.body;
		return this.element == elem;
	},
	
	// 返回当前浏览器可用的全屏方法。
	get element() {
		return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
	},
	
	// 返回当前浏览器的全屏支持状态检测方法。
	get enabled() {
		return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled);
	}
};

// 特殊点击事件相关，代码参考 lchzh3473
const specialClick = {
	
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
 * @param [keyName] {string} 数组内对象的指定键名
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
	let fixedWidth = pixi.renderer.realWidth <= pixi.renderer.realHeight / 9 * 16 ? pixi.renderer.realWidth : pixi.renderer.realHeight / 9 * 16;
	let fixedWidthOffset = (pixi.renderer.realWidth - fixedWidth) / 2;
	let lineScale = fixedWidth > pixi.renderer.realHeight * 0.75 ? pixi.renderer.realHeight / 18.75 : fixedWidth / 14.0625;
	
	let output = {
		containers: [],
		totalNotes: [],
		fingers: {},
		clickAnimate: {
			bad: []
		}
	};
	
	// 创建背景图
	if (settings.background) {
		let background = new PIXI.Sprite(_chart.image);
		let bgScaleWidth = pixi.renderer.realWidth / _chart.image.width;
		let bgScaleHeight = pixi.renderer.realHeight / _chart.image.height;
		let bgScale = bgScaleWidth > bgScaleHeight ? bgScaleWidth : bgScaleHeight;
		
		if (settings.backgroundBlur && !settings.forceCanvas) {
			let blur = new PIXI.filters.BlurFilter();
			blur.repeatEdgePixels = true;
			background.filters = [blur];
		}
		
		background.alpha = settings.backgroundDim;
		background.anchor.set(0.5);
		background.scale.set(bgScale);
		background.position.set(pixi.renderer.realWidth / 2, pixi.renderer.realHeight / 2);
		
		output.background = background;
		pixi.stage.addChild(background);
	}
	
	// 绘制判定线与 Note
	for (let _judgeLine of chart.judgeLines) {
		let container = new PIXI.Container();
		let judgeLine = new PIXI.Sprite(textures.judgeLine);
		let notesAbove = new PIXI.Container();
		let notesBelow = new PIXI.Container();
		
		judgeLine.raw = _judgeLine;
		
		// 设置判定线中心点和宽高
		judgeLine.anchor.set(0.5);
		judgeLine.height = lineScale * 18.75 * 0.008;
		judgeLine.width = judgeLine.height * judgeLine.texture.width / judgeLine.texture.height * 1.042;
		
		// 调整判定线位置
		judgeLine.position.set(0, 0);
		
		judgeLine.zIndex = 1;
		
		if (settings.developMode) {
			let judgeLineName = new PIXI.Text(_judgeLine.id, { fill: 'rgb(255,100,100)' });
			judgeLineName.anchor.set(0.5);
			judgeLineName.position.set(0);
			judgeLine.addChild(judgeLineName);
		}
		
		notesAbove.noteDirection = 1;
		notesBelow.noteDirection = -1;
		
		notesAbove.speedNotes = [];
		notesBelow.speedNotes = [];
		
		for (let _note of _judgeLine.notes) {
			let note;
			
			if (_note.type == 3) {
				let hold = new PIXI.Container();
				let holdHead = new PIXI.Sprite(textures['holdHead' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')]);
				let holdBody = new PIXI.Sprite(textures['holdBody' + ((_note.isMulti && settings.multiNotesHighlight) ? 'Hl' : '')]);
				let holdEnd = new PIXI.Sprite(textures.holdEnd);
				let baseLength = (pixi.renderer.height * 0.6);
				let holdLength = (_note.holdLength * baseLength) / (pixi.renderer.width / settings.noteScale);
				
				_note.rawNoteScale = pixi.renderer.width / settings.noteScale;
				
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
				let noteName = new PIXI.Text(_note.lineId + '+' + _note.id, { fill: 'rgb(100,255,100)' });
				noteName.scale.set(1 / (pixi.renderer.width / settings.noteScale));
				noteName.anchor.set(0.5);
				noteName.position.set(0);
				note.addChild(noteName);
			}
			
			note.scale.set(pixi.renderer.realWidth / settings.noteScale);
			note.position.x = (_note.positionX.toFixed(6) * 0.109) * (fixedWidth / 2);
			note.position.y = _note.offsetY * (pixi.renderer.realHeight * 0.6) * (_note.isAbove ? -1 : 1);
			
			note.raw = _note;
			note.id = _note.id;
			note.lineId = _note.lineId;
			
			if (_note.isAbove) notesAbove.addChild(note);
			else note.angle = 180,notesBelow.addChild(note);
			
			// 单独处理速度不为 1 的非长条 Note
			if (_note.speed != 1 && _note.type != 3) {
				if (_note.isAbove) notesAbove.speedNotes.push(note);
				else notesBelow.speedNotes.push(note);
			}
			
			output.totalNotes.push(note);
		}
		
		container.addChild(judgeLine);
		
		if (notesAbove.children.length > 0) container.addChild(notesAbove);
		if (notesBelow.children.length > 0) container.addChild(notesBelow);
		
		pixi.stage.addChild(container);
		
		container.position.x = pixi.renderer.realWidth / 2;
		container.position.y = pixi.renderer.realHeight / 2;
		
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
	let fixedWidth = pixi.renderer.realWidth <= pixi.renderer.realHeight / 9 * 16 ? pixi.renderer.realWidth : pixi.renderer.realHeight / 9 * 16;
	let fixedWidthOffset = (pixi.renderer.realWidth - fixedWidth) / 2;
	let lineScale = fixedWidth > pixi.renderer.realHeight * 0.75 ? pixi.renderer.realHeight / 18.75 : fixedWidth / 14.0625;
	
	// 头部信息合集
	if (!sprites.headInfos) {
		sprites.headInfos = new PIXI.Container();
	}
	
	// 进度条
	if (!sprites.progressBar) {
		let progressBar = new PIXI.Sprite(textures.progressBar);
		
		progressBar.anchor.x = 1;
		progressBar.scale.set(pixi.renderer.width / progressBar.texture.width);
		
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
	
	if (!sprites.headInfos.parent)
		pixi.stage.addChild(sprites.headInfos);
	
	if (!sprites.footInfos.parent)
		pixi.stage.addChild(sprites.footInfos);
	
	// 统一调整位置和透明度
	sprites.progressBar.alpha = 0.8;
	sprites.comboText.alpha = 0;
	sprites.titlesBig.alpha = 0;
	sprites.headInfos.alpha = 0;
	sprites.footInfos.alpha = 0;
	
	sprites.scoreText.position.set(pixi.renderer.realWidth - lineScale * 0.65, lineScale * 1.375);
	
	sprites.comboText.position.x = pixi.renderer.realWidth / 2;
	sprites.comboText.children[0].position.y = lineScale * 1.375;
	sprites.comboText.children[1].position.y = lineScale * 1.375 + sprites.comboText.children[0].height;
	
	sprites.songTitleBig.position.x = pixi.renderer.realWidth / 2;
	sprites.songTitleBig.position.y = pixi.renderer.realHeight / 2 * 0.75;
	
	sprites.bgAuthorBig.position.x = pixi.renderer.realWidth / 2;
	sprites.bgAuthorBig.position.y = pixi.renderer.realHeight / 2 * 1.25 + lineScale * 0.15;
	
	sprites.chartAuthorBig.position.x = pixi.renderer.realWidth / 2;
	sprites.chartAuthorBig.position.y = pixi.renderer.realHeight / 2 * 1.25 + lineScale;
	
	sprites.songNameBar.position.x = lineScale * 0.53;
	sprites.songNameBar.position.y = pixi.renderer.realHeight - lineScale * 1.22;
	
	sprites.songTitle.position.x = lineScale * 0.85;
	sprites.songTitle.position.y = pixi.renderer.realHeight - lineScale * 0.52;
	
	sprites.songDiff.position.x = pixi.renderer.realWidth - lineScale * 0.75;
	sprites.songDiff.position.y = pixi.renderer.realHeight - lineScale * 0.52;
	
	sprites.fps.position.set(pixi.renderer.realWidth - 1, 1);
	
	sprites.watermark.position.set(pixi.renderer.realWidth - 2, pixi.renderer.realHeight - 2);
	
	sprites.headInfos.position.y = -sprites.headInfos.height;
	sprites.footInfos.position.y = sprites.headInfos.height;
}

/***
 * @function 实时计算当前时间下的精灵数据。该方法应在 PIXI.Ticker 中循环调用
***/
function CalculateChartActualTime(delta) {
	let currentTime = (global.audio ? (_chart.audio.duration * global.audio.progress) : 0) - _chart.data.offset - settings.chartDelay;
	let fixedWidth = pixi.renderer.realWidth <= pixi.renderer.realHeight / 9 * 16 ? pixi.renderer.realWidth : pixi.renderer.realHeight / 9 * 16;
	let fixedWidthOffset = (pixi.renderer.realWidth - fixedWidth) / 2;
	let noteSpeed = pixi.renderer.realHeight * 0.6;
	let noteScale = fixedWidth / settings.noteScale;
	
	if (!sprites.containers) return;
	
	// 一些全屏尺寸检测与修改
	// 注释掉了，感觉会影响性能
	/**
	if (full.check(pixi.view) && (pixi.renderer.width != document.body.clientWidth || pixi.renderer.height != document.body.clientHeight)) {
		pixi.renderer.resize(document.body.clientWidth, document.body.clientHeight);
		ResizeChartSprites(sprites, pixi.renderer.width, pixi.renderer.height, settings.noteScale);
	}
	**/
	
	if (sprites.progressBar)
		sprites.progressBar.position.x = fixedWidth * (global.audio ? global.audio.progress : 0) + fixedWidthOffset;
	
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
			
			container.position.x = fixedWidth * (i.start * time1 + i.end * time2);
			container.position.y = pixi.renderer.realHeight * (1 - i.start2 * time1 - i.end2 * time2);
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
			
			for (let x = 1; x < container.children.length; x++) {
				let noteContainer = container.children[x];
				
				noteContainer.position.y = ((currentTime - i.startRealTime) * i.value + i.floorPosition) * noteSpeed * noteContainer.noteDirection;
				
				if (noteContainer.speedNotes && noteContainer.speedNotes.length > 0) {
					for (let note of noteContainer.speedNotes) {
						// 处理自身速度不为 1 的 Note。怀疑如此处理有性能问题，暂时未知其他解法
						note.position.y = (
							noteContainer.position.y + (
								(note.raw.offsetY * noteSpeed) - 
								(noteContainer.position.y > 0 ? noteContainer.position.y : noteContainer.position.y * -1)
							) * note.raw.speed
						) * noteContainer.noteDirection * -1;
					}
				}
			}
		}
	}
	
	for (let i of sprites.totalNotes) {
		// 处理 Hold 的高度。我没想到其他的算法，就先用这么个粗陋的方法顶一下吧。
		if (i.raw.type == 3 && i.raw.realTime <= currentTime && currentTime <= (i.raw.realTime + i.raw.realHoldTime)) {
			let rawNoteOffsetY = i.raw.offsetY * noteSpeed;
			let parentOffsetY = i.parent.position.y;
			parentOffsetY = parentOffsetY < 0 ? -parentOffsetY : parentOffsetY;
			
			let betweenOffsetY = (parentOffsetY - rawNoteOffsetY) * pixi.renderer.resolution;
			let rawHoldLength = (i.raw.holdLength * noteSpeed * pixi.renderer.resolution) / (fixedWidth * pixi.renderer.resolution / settings.noteScale);
			
			i.children[1].height = rawHoldLength - betweenOffsetY / (fixedWidth * pixi.renderer.resolution / settings.noteScale);
			i.children[2].position.y = -(rawHoldLength - betweenOffsetY / (fixedWidth * pixi.renderer.resolution / settings.noteScale));
			
			if (i.raw.isAbove) i.position.y = -(rawNoteOffsetY + betweenOffsetY / pixi.renderer.resolution);
			else i.position.y = rawNoteOffsetY + betweenOffsetY / pixi.renderer.resolution;
		}
		
		
		if (i.raw.score > 0 && i.raw.isProcessed) continue;
		
		if (i.raw.realTime - currentTime <= 0) {
			let timeBetween = i.raw.type != 3 ? i.raw.realTime - currentTime : (i.raw.realTime + i.raw.realHoldTime) - currentTime;
			
			if (timeBetween > -0.2) {
				i.alpha = (0.2 + timeBetween) / 0.2;
			} else {
				i.alpha = 0;
			}
		}
	}
	
	for (let i in sprites.clickAnimate.bad) {
		let obj = sprites.clickAnimate.bad[i];
		
		obj.alpha -= 2 / 60;
		
		if (obj.alpha <= 0) {
			obj.destroy();
			sprites.clickAnimate.bad.splice(i, 1);
		}
	}
	
	judgements.addJudgement(sprites.totalNotes, currentTime);
	judgements.judgeNote(sprites.totalNotes, currentTime);
	inputs.taps.length = 0;
}

/***
 * @function 创建打击动画
***/
function CreateClickAnimation(x, y, type = 4, angle = 0, performance = false) {
	let obj = undefined;
	let fixedWidth = pixi.renderer.realWidth <= pixi.renderer.realHeight / 9 * 16 ? pixi.renderer.realWidth : pixi.renderer.realHeight / 9 * 16;
	
	if (!pixi || !settings.clickAnimate) return;
	
	if (type <= 1) return;
	
	if (type == 4 || type == 3) {
		obj = new PIXI.AnimatedSprite(textures.clickRaw);
		
		obj.anchor.set(0.5);
		obj.scale.set((fixedWidth / settings.noteScale) * (256 / obj.width) * 4 * 1.4);
		obj.position.set(x, y);
		
		obj.tint = type == 4 ? 0xFFECA0 : 0xB4E1FF;
		obj.loop = false;
		
		obj.onComplete = function () {
			this.destroy();
		};
		
	} else {
		obj = new PIXI.Sprite(textures.tap2);
		
		obj.anchor.set(0.5);
		obj.scale.set(fixedWidth / settings.noteScale);
		obj.position.set(x, y);
		obj.angle = angle;
	}
	
	if (obj) {
		pixi.stage.addChild(obj);
		if (type == 3 || type == 4)
			obj.play();
		else
			sprites.clickAnimate.bad.push(obj);
	}
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
		let bgScaleWidth = pixi.renderer.realWidth / _chart.image.width;
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
		if (note.raw.type == 3 && note.children.length == 3) {
			// note.children[1].height = note.raw.holdLength * (height * 0.6) / note.raw.rawNoteScale * ((noteScale * pixi.renderer.resolution) / note.raw.rawNoteScale);
			note.children[1].height = note.raw.holdLength * (height * 0.6) / (width / _noteScale);
			note.children[2].position.y = -(note.raw.holdLength * (height * 0.6) / (width / _noteScale));
		}
		
		note.scale.set(noteScale);
		note.position.x = (note.raw.positionX.toFixed(6) * 0.109) * (fixedWidth / 2);
		note.position.y = note.raw.offsetY * (height * 0.6) * (note.raw.isAbove ? -1 : 1);
	}
	
	// 处理进度条
	if (sprites.progressBar)
		sprites.progressBar.scale.set(width / sprites.progressBar.texture.width);
	
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
		sprites.scoreText.position.set(width - lineScale * 0.65, lineScale * 1.375);
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
		
		sprites.songNameBar.position.x = lineScale * 0.53;
		sprites.songNameBar.position.y = height - lineScale * 1.22;
	}
	
	// 处理歌曲名称
	if (sprites.songTitle) {
		sprites.songTitle.style.fontSize = lineScale * 0.63 + 'px';
		
		sprites.songTitle.position.x = lineScale * 0.85;
		sprites.songTitle.position.y = height - lineScale * 0.52;
	}
	
	// 处理歌曲难度
	if (sprites.songDiff) {
		sprites.songDiff.style.fontSize = lineScale * 0.63 + 'px';
		
		sprites.songDiff.position.x = width - lineScale * 0.75;
		sprites.songDiff.position.y = height - lineScale * 0.52;
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
		let time = (currentTime - noteTime) * 1000;
		let rankColor = time > 0 ? time : -time;
		
		let timeBad = isChallengeMode ? 100 : 200;
		let timeGood = isChallengeMode ? 75 : 160;
		let timePerfect = isChallengeMode ? 40 : 80;
		
		if (rankColor < timePerfect)
			rankColor = 0xFFECA0;
		else if (rankColor < timeGood)
			rankColor = 0xB4E1FF;
		else if (rankColor < timeBad)
			rankColor = 0x8E0000;
		
		accGraphic.beginFill(rankColor);
		accGraphic.drawRect(0, 0, 2, 20);
		accGraphic.endFill();
		
		accGraphic.position.x = time / 2;
		
		container.addChild(accGraphic);
		
		return accGraphic;
	}
}