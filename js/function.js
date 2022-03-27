'use strict';

function startAnimate (func) {
	return requestAnimationFrame(func) || 
		webkitRequestAnimationFrame(func) ||
		mozRequestAnimationFrame(func) ||
		msRequestAnimationFrame(func) ||
		setTimeout(func, 1000 / 60);
};

function endAnimate (funcId) {
	return cancelAnimationFrame(funcId) ||
		webkitCancelAnimationFrame(funcId) ||
		mozCancelAnimationFrame(funcId) ||
		msCancelAnimationFrame(funcId) ||
		clearTimeout(funcId);
};


// ==声明 global.functions==
// 重修改舞台尺寸
global.functions = {};
// Note 排序
global.functions.sortNote = (a, b) => {
	try {
		return a.raw.realTime - b.raw.realTime || a.raw.lineId - b.raw.lineId || a.raw.id - b.raw.id;
	} catch (e) {
		return a.realTime - b.realTime || a.lineId - b.lineId || a.id - b.id;
	}
};

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
function CreateChartSprites(chart, stage) {
	let output = {
		judgeLines: [],
		notes: [],
		fakeNotes: []
	};

	stage.style.backgroundImage = 'url(' + chart.image.src + ')';

	for (let _judgeLine of chart.chart.judgeLines) {
		let judgeLine = document.createElement('div');

		judgeLine.className = 'judgeline';
		judgeLine.style.top = '50%';
		judgeLine.style.left = '50%';

		judgeLine.raw = _judgeLine;
		
		judgeLine.currentOffsetY = 0;
		judgeLine.rotation = 0;
		judgeLine.sinr = 0;
		judgeLine.cosr = 1;

		output.judgeLines.push(judgeLine);
		stage.appendChild(judgeLine);
	}

	for (let _note of chart.chart.notes.hold) {
		let note = CreateNote(_note);
		output.notes.push(note);
		stage.appendChild(note);
	}
	for (let _note of chart.chart.notes.notHold) {
		let note = CreateNote(_note);
		output.notes.push(note);
		stage.appendChild(note);
	}
	for (let _note of chart.chart.notes.fakeNotes) {
		let note = CreateNote(_note);
		output.fakeNotes.push(note);
		stage.appendChild(note);
	}

	output.notes.sort(global.functions.sortNote);

	return output;

	function CreateNote(_note) {
		let note = document.createElement('div');

		if (_note.type === 1) note.className = 'note tap';
		else if (_note.type === 2) note.className = 'note drag';
		else if (_note.type === 3) note.className = 'note hold';
		else if (_note.type === 4) note.className = 'note flick';

		if (_note.isMulti) note.className += ' hl';

		if (_note.type === 3) {
			note.style.setProperty('--hold-length', _note.holdLength);
		}

		note.raw = _note;

		return note;
	}
}

/***
 * @function 实时计算当前时间下的精灵数据。该方法应在 PIXI.Ticker 中循环调用
***/
function CalculateChartActualTime() {
	Stats.begin();

	let currentTime = (chart.audio.currentTime ? chart.audio.currentTime : 0) - chart.chart.offset;

	for (let judgeLine of sprites.judgeLines) {
		for (let i of judgeLine.raw.judgeLineDisappearEvents) { // 判定线透明度
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
			let time1 = 1 - time2;
			
			judgeLine.style.opacity = i.start * time1 + i.end * time2;
		}

		for (let i of judgeLine.raw.judgeLineMoveEvents) { // 判定线移动
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
			let time1 = 1 - time2;
			
			judgeLine.top = (1 - i.start2 * time1 - i.end2 * time2) * window.realHeight;
			judgeLine.left = (i.start * time1 + i.end * time2) * window.fixedWidth + window.fixedWidthOffset;
			
			judgeLine.style.top = judgeLine.top + 'px';
			judgeLine.style.left = judgeLine.left + 'px';
		}
		
		for (const i of judgeLine.raw.judgeLineRotateEvents) { // 判定线旋转
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			let time2 = (currentTime - i.startRealTime) / (i.endRealTime - i.startRealTime);
			let time1 = 1 - time2;
			let rotation = i.startDeg * time1 + i.endDeg * time2;

			judgeLine.style.setProperty('--angle', rotation + 'rad');
			
			judgeLine.rotation = rotation;
			judgeLine.cosr = Math.cos(rotation);
			judgeLine.sinr = Math.sin(rotation);
		}
		
		for (const i of judgeLine.raw.speedEvents) { // 判定线流速
			if (currentTime < i.startRealTime) break;
			if (currentTime > i.endRealTime) continue;
			
			judgeLine.currentOffsetY = (currentTime - i.startRealTime) * i.value + i.floorPosition;
		}
	}

	for (let note of sprites.notes) {
		CalculateNote(note, currentTime);
	}
	for (let note of sprites.fakeNotes) {
		CalculateNote(note, currentTime);
	}

	Stats.end();

	startAnimate(CalculateChartActualTime);

	function CalculateNote(note, currentTime) {
		let judgeLine = sprites.judgeLines[note.raw.lineId];
		let noteX, noteY, realNoteX, realNoteY;

		noteX = note.raw.positionX.toFixed(6) * window.fixedWidthPercent;
		noteY = 0;

		if (note.raw.type != 3) {
			noteY = (note.raw.offsetY - judgeLine.currentOffsetY) * note.raw.speed;
		} else if (note.raw.realTime < currentTime) {
			noteY = (note.raw.realTime - currentTime) * note.raw.speed;
		} else {
			noteY = note.raw.offsetY - judgeLine.currentOffsetY;
		}

		if (note.raw.type == 3) {
			if (note.raw.offsetY < judgeLine.currentOffsetY && note.raw.offsetY + note.raw.holdLength > judgeLine.currentOffsetY) {
				let holdLengthPercent = 1 - (judgeLine.currentOffsetY - note.raw.offsetY) / note.raw.holdLength;
				noteY = 0;
				note.style.setProperty('--note-progress', holdLengthPercent);
			} else if (note.raw.offsetY > judgeLine.currentOffsetY) {
				note.style.setProperty('--note-progress', 1);
			}
		}
		
		noteY = noteY * (note.raw.isAbove ? -1 : 1) * window.noteSpeed;
		
		realNoteX = noteX * judgeLine.cosr - noteY * judgeLine.sinr;
		realNoteY = noteY * judgeLine.cosr + noteX * judgeLine.sinr;
		
		realNoteX = (realNoteX + judgeLine.left) + 'px';
		realNoteY = (realNoteY + judgeLine.top) + 'px';

		note.style.left = realNoteX;
		note.style.top = realNoteY;
		note.style.setProperty('--angle', 'calc(' + judgeLine.rotation + 'rad' + (note.raw.isAbove ? '' : ' + 180deg') + ')');

		if (/* (currentTime < note.raw.realTime && note.raw.type != 3) || (currentTime < note.raw.realTime + note.raw.realHoldTime && note.raw.type == 3) */ true) {
			if (note.raw.type != 3) {
				if (note.raw.offsetY < judgeLine.currentOffsetY && note.style.display != 'none') {
					note.style.display = 'none';
				} else if (note.raw.offsetY >= judgeLine.currentOffsetY && note.style.display != 'block') {
					note.style.display = 'block';
				}
			} else {
				if ((note.raw.offsetY + note.raw.holdLength) < judgeLine.currentOffsetY && note.style.display != 'none') {
					note.style.display = 'none';
				} else if ((note.raw.offsetY + note.raw.holdLength) >= judgeLine.currentOffsetY && note.style.display != 'block') {
					note.style.display = 'block';
				}
			}
		} else {
			if (note.raw.type !== 3) {
				if (currentTime - 0.2 < note.raw.realTime) {
					note.style.opacity = 1 - (currentTime - note.raw.realTime) / 0.2;
				} else {
					note.style.opacity = 0;
				}
			} else {
				note.style.opacity = 0;
			}
		}
	}
}