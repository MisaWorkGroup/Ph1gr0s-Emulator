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
 * @param requireFPSCounter {bool} 如果该值为真，则创建一个 FPS 指示器
 * @return {object} 返回一个存放 Containers 精灵数组、Notes 精灵数组和 FPS 精灵的对象
***/
function CreateChartSprites(chart, pixi, requireFPSCounter = false) {
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
		totalNotes: [],
		tapNotes : [],
		clickAnimate: {
			bad: []
		}
	};
	
	// 创建背景图
	if (settings.background) {
		let background = new PIXI.Sprite(_chart.image);
		let blur = new PIXI.filters.BlurFilter();
		
		blur.repeatEdgePixels = true;
		
		if (settings.backgroundBlur)
			background.filters = [blur];
		
		background.alpha = settings.backgroundDim;
		background.position.set(0, 0);
		background.width = pixi.renderer.width / pixi.renderer.resolution;
		background.height = pixi.renderer.height / pixi.renderer.resolution;
		
		output.background = background;
		pixi.stage.addChild(background);
	}
	
	// 进度条
	let progressBar = new PIXI.Sprite(textures.progressBar);
	
	progressBar.anchor.x = 1;
	progressBar.scale.set(pixi.renderer.width / progressBar.texture.width);
	progressBar.alpha = 0.8;
	
	pixi.stage.addChild(progressBar);
	output.progressBar = progressBar;
	
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
				
				note = hold;
				
			} else {
				note = new PIXI.Sprite(textures.tap);
				
				note.anchor.set(0.5);
				
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
			
			note.scale.set(pixi.renderer.width / settings.noteScale / pixi.renderer.resolution);
			note.position.x = (_note.positionX.toFixed(6) * 0.109) * (pixi.renderer.width / 2) / pixi.renderer.resolution;
			
			if (_note.isAbove) note.position.y = -_note.offsetY * (pixi.renderer.height * 0.6) / pixi.renderer.resolution;
			else note.position.y = _note.offsetY * (pixi.renderer.height * 0.6) / pixi.renderer.resolution;
			
			// 为修复吞 Note 问题搭桥
			if (isNaN((_note.positionX.toFixed(6) * 0.109) * (pixi.renderer.width / 2) / pixi.renderer.resolution) ||
				isNaN(_note.offsetY * (pixi.renderer.height * 0.6) / pixi.renderer.resolution == 0))
			{
				console.error('a note get position error: ' + _note.lineId + '+' + _note.id +
					'x:' + _note.positionX.toFixed(6) * 0.109 + 'y:' + _note.offsetY);
			}
			
			
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
			if (_note.type == 1) output.tapNotes.push(note);
		}
		
		container.addChild(judgeLine);
		
		if (notesAbove.children.length > 0) container.addChild(notesAbove);
		if (notesBelow.children.length > 0) container.addChild(notesBelow);
		
		pixi.stage.addChild(container);
		
		container.position.x = pixi.renderer.width / 2 / pixi.renderer.resolution;
		container.position.y = pixi.renderer.height / 2 / pixi.renderer.resolution;
		
		output.containers.push(container);
	}
	
	// 分数指示
	if (!sprites.scoreText) {
		let scoreText = new PIXI.Text('0000000', {
			fontFamily: 'Mina',
			fontSize: lineScale / pixi.renderer.resolution * 0.95 + 'px',
			fill: 'white'
		});
		
		pixi.stage.addChild(scoreText);
		
		scoreText.position.set(pixi.renderer.width / pixi.renderer.resolution - scoreText.width - 4, 10 / pixi.renderer.resolution);
		
		output.scoreText = scoreText;
	}
	
	// Combo 指示
	if (!sprites.comboText) {
		let combo = new PIXI.Container();
		let number = new PIXI.Text('0', {
			fontFamily : 'Mina',
			fontSize : lineScale / pixi.renderer.resolution * 1.32 + 'px',
			fill : 'white'
		});
		let text = new PIXI.Text('combo', {
			fontFamily : 'Mina',
			fontSize : lineScale / pixi.renderer.resolution * 0.66 +'px',
			fill : 'white'
		});
		
		if (settings.autoPlay) text.text = 'Autoplay';
		
		number.anchor.x = 0.5;
		text.anchor.x = 0.5;
		
		combo.addChild(number);
		combo.addChild(text);
		
		combo.alpha = 0;
		
		pixi.stage.addChild(combo);
		
		combo.position.x = pixi.renderer.width / pixi.renderer.resolution / 2;
		combo.position.y = 8 / pixi.renderer.resolution;
		
		text.position.y = number.height / pixi.renderer.resolution + 4;
		
		output.comboText = combo;
		
	} else {
		output.comboText = sprites.comboText;
	}
	
	// FPS 计数器
	if (requireFPSCounter && !sprites.fps) {
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
	
	// 创建水印
	if (!sprites.watermark) {
		let watermark = new PIXI.Text('PhigrosEmulator v1.0.0 Beta By MisaLiu OriginBy lzhch', {
			fontFamily : 'Mina',
			fontSize: lineScale / pixi.renderer.resolution * 0.6 + 'px',
			fill: 'rgba(255, 255, 255, 0.5)',
			align: 'right'
		});
		
		pixi.stage.addChild(watermark);
		watermark.position.set((pixi.renderer.width / pixi.renderer.resolution) - watermark.width - 2, (pixi.renderer.height / pixi.renderer.resolution) - watermark.height - 1);
		
		output.watermark = watermark;
		
	} else {
		output.watermark = sprites.waterpark;
	}
	
	return output;
}

/***
 * @function 实时计算当前时间下的精灵数据。该方法应在 PIXI.Ticker 中循环调用
***/
function CalculateChartActualTime(delta) {
	let currentTime = global.audio ? (_chart.audio.duration * global.audio.progress) - _chart.data.offset : 0;
	let noteSpeed = pixi.renderer.height * 0.6 / pixi.renderer.resolution;
	let noteScale = pixi.renderer.width / settings.noteScale / pixi.renderer.resolution;
	
	if (!sprites.containers) return;
	
	if (sprites.progressBar)
		sprites.progressBar.position.x = pixi.renderer.width * global.audio.progress / pixi.renderer.resolution;
	
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
			let rawNoteOffsetY = i.raw.offsetY * (pixi.renderer.height * 0.6) / pixi.renderer.resolution;
			let parentOffsetY = i.parent.position.y;
			parentOffsetY = parentOffsetY < 0 ? -parentOffsetY : parentOffsetY;
			
			let betweenOffsetY = parentOffsetY - rawNoteOffsetY;
			let rawHoldLength = (i.raw.holdLength * pixi.renderer.height * 0.6) / (pixi.renderer.width / settings.noteScale);
			
			i.children[1].height = rawHoldLength - betweenOffsetY * pixi.renderer.resolution / (pixi.renderer.width / settings.noteScale);
			i.children[2].position.y = -(rawHoldLength - betweenOffsetY * pixi.renderer.resolution / (pixi.renderer.width / settings.noteScale));
			
			if (i.raw.isAbove) i.position.y = -(rawNoteOffsetY + betweenOffsetY);
			else i.position.y = rawNoteOffsetY + betweenOffsetY;
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
	
	if (pixi.ticker.elapsedMS / 1000 < 0.67) {
		judgements.addJudgement(sprites.totalNotes, currentTime);
		judgements.judgeNote(sprites.totalNotes, currentTime);
		inputs.taps.length = 0;
	}
}

/***
 * @function 创建打击动画
***/
function CreateClickAnimation(x, y, type = 4, angle = 0, performance = false) {
	let obj = undefined;
	
	if (!pixi || !settings.clickAnimate) return;
	
	if (type <= 1) return;
	
	if (type == 4 || type == 3) {
		obj = new PIXI.AnimatedSprite(textures.clickRaw);
		
		obj.anchor.set(0.5);
		obj.scale.set((pixi.renderer.width / settings.noteScale) * (256 / obj.width) * pixi.renderer.resolution * 1.4);
		obj.position.set(x, y);
		
		obj.tint = type == 4 ? 0xFFECA0 : 0xB4E1FF;
		obj.loop = false;
		
		obj.onComplete = function () {
			this.destroy();
		};
		
	} else {
		obj = new PIXI.Sprite(textures.tap2);
		
		obj.anchor.set(0.5);
		obj.scale.set(pixi.renderer.width / settings.noteScale / pixi.renderer.resolution);
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
	let windowRatio = width / height;
	let lineScale = (width > height * 0.75 ? height / 18.75 : width / 14.0625) / pixi.renderer.resolution;
	let noteScale = width / _noteScale / pixi.renderer.resolution;
	let noteSpeed = height * 0.6 / pixi.renderer.resolution;
	
	// 处理背景图
	if (sprites.background) {
		sprites.background.width = pixi.renderer.width / pixi.renderer.resolution;
		sprites.background.height = pixi.renderer.height / pixi.renderer.resolution;
	}
	
	// 处理进度条
	if (sprites.progressBar)
		sprites.progressBar.scale.set(pixi.renderer.width / sprites.progressBar.texture.width);
	
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
		note.position.x = (note.raw.positionX.toFixed(6) * 0.109) * (width / 2) / pixi.renderer.resolution;
		note.position.y = -note.raw.offsetY * (height * 0.6) / pixi.renderer.resolution;
	}
	
	// 处理 FPS 指示器
	if (sprites.fps) {
		sprites.fps.fontSize = lineScale * 0.8 + 'px';
		sprites.fps.position.set(width / pixi.renderer.resolution - sprites.fps.width - 2, 1 / pixi.renderer.resolution);
	}
	
	// 处理准度指示器
	if (sprites.accIndicator) {
		sprites.accIndicator.container.position.x = pixi.renderer.width / 2 / pixi.renderer.resolution;
		sprites.accIndicator.container.scale.set(pixi.renderer.width / sprites.accIndicator.scale / pixi.renderer.resolution);
	}
	
	// 处理水印
	if (sprites.watermark) {
		sprites.watermark.fontSize = lineScale * 0.6 + 'px';
		sprites.watermark.position.set((pixi.renderer.width / pixi.renderer.resolution) - sprites.watermark.width - 2, (pixi.renderer.height / pixi.renderer.resolution) - sprites.watermark.height - 1);
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
	container.scale.set(pixi.renderer.width / scale / pixi.renderer.resolution);
	container.position.x = pixi.renderer.width / 2 / pixi.renderer.resolution;
	
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