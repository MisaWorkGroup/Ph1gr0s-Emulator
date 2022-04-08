'use strict';
/***
 * 此文件用于存放各类转换器
***/
const tween = [null, null,
	pos => Math.sin(pos * Math.PI / 2), //2
	pos => 1 - Math.cos(pos * Math.PI / 2), //3
	pos => 1 - (pos - 1) ** 2, //4
	pos => pos ** 2, //5
	pos => (1 - Math.cos(pos * Math.PI)) / 2, //6
	pos => ((pos *= 2) < 1 ? pos ** 2 : -((pos - 2) ** 2 - 2)) / 2, //7
	pos => 1 + (pos - 1) ** 3, //8
	pos => pos ** 3, //9
	pos => 1 - (pos - 1) ** 4, //10
	pos => pos ** 4, //11
	pos => ((pos *= 2) < 1 ? pos ** 3 : ((pos - 2) ** 3 + 2)) / 2, //12
	pos => ((pos *= 2) < 1 ? pos ** 4 : -((pos - 2) ** 4 - 2)) / 2, //13
	pos => 1 + (pos - 1) ** 5, //14
	pos => pos ** 5, //15
	pos => 1 - 2 ** (-10 * pos), //16
	pos => 2 ** (10 * (pos - 1)), //17
	pos => Math.sqrt(1 - (pos - 1) ** 2), //18
	pos => 1 - Math.sqrt(1 - pos ** 2), //19
	pos => (2.70158 * pos - 1) * (pos - 1) ** 2 + 1, //20
	pos => (2.70158 * pos - 1.70158) * pos ** 2, //21
	pos => ((pos *= 2) < 1 ? (1 - Math.sqrt(1 - pos ** 2)) : (Math.sqrt(1 - (pos - 2) ** 2) + 1)) / 2, //22
	pos => pos < 0.5 ? (14.379638 * pos - 5.189819) * pos ** 2 : (14.379638 * pos - 9.189819) * (pos - 1) ** 2 + 1, //23
	pos => 1 - 2 ** (-10 * pos) * Math.cos(pos * Math.PI / .15), //24
	pos => 2 ** (10 * (pos - 1)) * Math.cos((pos - 1) * Math.PI / .15), //25
	pos => ((pos *= 11) < 4 ? pos ** 2 : pos < 8 ? (pos - 6) ** 2 + 12 : pos < 10 ? (pos - 9) ** 2 + 15 : (pos - 10.5) ** 2 + 15.75) / 16, //26
	pos => 1 - tween[26](1 - pos), //27
	pos => (pos *= 2) < 1 ? tween[26](pos) / 2 : tween[27](pos - 1) / 2 + .5, //28
	pos => pos < 0.5 ? 2 ** (20 * pos - 11) * Math.sin((160 * pos + 1) * Math.PI / 18) : 1 - 2 ** (9 - 20 * pos) * Math.sin((160 * pos + 1) * Math.PI / 18) //29
];

/***
 * @function 将 PE 谱面文件（*.pec）转换为官方格式谱面
 * @param {String} pec 谱面文件的内容
 * @param {String} filename 谱面文件的名称
 * @return {Object} 返回官方格式的谱面
***/
function ConvertPEC2Json(pec, filename) {
	// 我偷懒了，下面这三个私有类来自 lchzh3473
	class Chart {
		constructor() {
			this.formatVersion = 3;
			this.offset        = 0;
			this.numOfNotes    = 0;
			this.judgeLineList = [];
		}
		
		pushLine(judgeLine) {
			this.judgeLineList.push(judgeLine);
			this.numOfNotes += judgeLine.numOfNotes;
			return judgeLine;
		}
	}
	
	class JudgeLine {
		numOfNotes      = 0;
		numOfNotesAbove = 0;
		numOfNotesBelow = 0;
		bpm             = 120;
		constructor(bpm) {
			this.bpm = bpm;
			("speedEvents,notesAbove,notesBelow,notesFakeAbove,notesFakeBelow,judgeLineDisappearEvents,judgeLineMoveEvents,judgeLineRotateEvents,judgeLineDisappearEventsPec,judgeLineMoveEventsPec,judgeLineRotateEventsPec").split(",").map(i => this[i] = []);
		}
		
		pushNote(note, pos, isFake) {
			note.isFake = !!isFake;

			switch (pos) {
				case undefined:
				case 1: {
					if (isFake) this.notesFakeAbove.push(note);
					else this.notesAbove.push(note);
					break;
				}
				case 2: {
					if (isFake) this.notesFakeBelow.push(note);
					else this.notesBelow.push(note);
					break;
				}
				default:
					throw 'Note 参数错误：错误的 Note 位置：' + pos;
			}

			if (!isFake) {
				this.numOfNotes++;
				this.numOfNotesAbove++;
			}
		}
		
		pushEvent(type, startTime, endTime, n1, n2, n3, n4) {
			const evt = {
				startTime : startTime,
				endTime   : endTime,
			}
			if (typeof startTime == 'number' && typeof endTime == 'number' && startTime > endTime) {
				console.warn('判定线事件错误：事件起始时间（' + startTime + '）大于结束时间（' + endTime + '）');
				//return;
			}
			switch (type) {
				case 0: // 判定线变速事件
					evt.value = n1;
					this.speedEvents.push(evt);
					break;
				case 1: // 判定线 Alpha 事件
					evt.start  = n1;
					evt.end    = n2;
					evt.start2 = 0;
					evt.end2   = 0;
					this.judgeLineDisappearEvents.push(evt);
					break;
				case 2: // 判定线移动事件
					evt.start  = n1;
					evt.end    = n2;
					evt.start2 = n3;
					evt.end2   = n4;
					this.judgeLineMoveEvents.push(evt);
					break;
				case 3: // 判定线旋转事件
					evt.start  = n1;
					evt.end    = n2;
					evt.start2 = 0;
					evt.end2   = 0;
					this.judgeLineRotateEvents.push(evt);
					break;
				case -1: // 判定线 Alpha 事件（PE 特色）
					evt.value = n1;
					evt.motionType = 1;
					this.judgeLineDisappearEventsPec.push(evt);
					break;
				case -2: // 判定线移动事件（PE 特色）
					evt.value      = n1;
					evt.value2     = n2;
					evt.motionType = n3;
					this.judgeLineMoveEventsPec.push(evt);
					break;
				case -3: // 判定线旋转事件（PE 特色）
					evt.value = n1;
					evt.motionType = n2;
					this.judgeLineRotateEventsPec.push(evt);
					break;
				default:
					throw '判定线事件错误：无效的事件类型：' + type;
			}
		}
	}
	
	class Note {
		constructor(type, time, x, holdTime, speed) {
			this.type = type;
			this.time = time;
			this.positionX = x;
			this.holdTime = type == 3 ? holdTime : 0;
			this.speed = isNaN(speed) ? 1 : speed; //默认值不为0不能改成Number(speed)||1
			//this.floorPosition = time % 1e9 / 104 * 1.2;
		}
	}
	
	let oldChart           = pec.match(/[^\n\r ]+/g).map(i => isNaN(i) ? String(i) : Number(i));
	let newChart           = new Chart();
	let oldChartRaw        = {};
	let rawChartArr        = [];
	let rawChartStr        = '';
	let rawChartCounterArr = [1, 1];
	
	let baseBpm   = 120;
	let bpmEvents = [];
	
	let linesPec = [];
	
	
	// 固定谱面 offset
	if (!isNaN(oldChart[0]))
		newChart.offset = (oldChart.shift() / 1e3 - 0.175);
	
	// 为 oldChartRaw 插入属性名，并给每个属性分配一个空数组
	('bp,n1,n2,n3,n4,cv,cp,cd,ca,cm,cr,cf').split(',').map(i => oldChartRaw[i] = []);
	
	for (let i = 0; i < oldChart.length; i++) {
		let p = oldChart[i];
		
		// 纯数字则推送至数组
		if (!isNaN(p))
			rawChartArr.push(p);
		// 还不清楚
		else if (p == '#' && rawChartStr[0] == 'n') 
			rawChartCounterArr[0] = oldChart[++i];
		// 还不清楚
		else if (p == '&' && rawChartStr[0] == 'n')
			rawChartCounterArr[1] = oldChart[++i];
		// 如果该指令存在，则推送该指令
		else if (oldChartRaw[p])
			pushCommand(p);
		else
			throw '谱面参数错误：未知的指令：' + p;
	}
	
	pushCommand('');
	
	// 处理 BPM 变速事件
	if (!oldChartRaw.bp[0])
		oldChartRaw.bp.push([0, 120]);
	
	baseBpm = oldChartRaw.bp[0][1];
	
	if (oldChartRaw.bp[0][0])
		oldChartRaw.bp.unshift([0, baseBpm]);
	
	let bpmCounter = 0;
	oldChartRaw.bp.sort((a, b) => a[0] - b[0])
		.forEach((i, idx, arr) => {
			// 过滤负数
			if (arr[idx + 1] && arr[idx + 1][0] <= 0) return;
			
			let start = i[0] < 0 ? 0 : i[0];
			let end   = arr[idx + 1] ? arr[idx + 1][0] : 1e9;
			let bpm   = i[1];
			
			bpmEvents.push({
				startTime : start,
				endTime : end,
				bpm : bpm,
				value : bpmCounter
			});
			
			bpmCounter += (end - start) / bpm;
		}
	);
	
	// 处理 Note 和判定线事件
	// 遍历 Tap
	for (let i of oldChartRaw.n1) {
		if (!linesPec[i[0]]) // 如果存放这个 Note 的判定线不存在，则创建一个，下同
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		// 推送 Note 到判定线
		linesPec[i[0]].pushNote(new Note(1, calcTime(i[1]) + (i[4] ? 1e9 : 0), i[2] * 9 / 1024, 0, i[5]), i[3], i[4]);
		
		// 判断是否为 FakeNote
		if (i[4]) {
			console.warn(
				'检测到 FakeNote，该 Note 可能会产生显示异常。\n' +
				'位于："n1 ' + i.slice(0, 5).join(" ") + '"\n' +
				'来自 ' + filename
			);
		}
		if (i[6] != 1) {
			console.warn(
				'检测到异常 Note，该 Note 可能会产生显示异常。\n' +
				'位于："n1 ' + i.slice(0, 5).join(" ") + ' # ' + i[5] + ' & ' + i[6] + '"\n' +
				'来自 ' + filename
			);
		}
	}
	// 遍历 Drag
	for (let i of oldChartRaw.n4) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		linesPec[i[0]].pushNote(new Note(2, calcTime(i[1]) + (i[4] ? 1e9 : 0), i[2] * 9 / 1024, 0, i[5]), i[3], i[4]);
		
		if (i[4]) {
			console.warn(
				'检测到 FakeNote，该 Note 可能会产生显示异常。\n' +
				'位于："n1 ' + i.slice(0, 5).join(" ") + '"\n' +
				'来自 ' + filename
			);
		}
		if (i[6] != 1) {
			console.warn(
				'检测到异常 Note，该 Note 可能会产生显示异常。\n' +
				'位于："n1 ' + i.slice(0, 5).join(" ") + ' # ' + i[5] + ' & ' + i[6] + '"\n' +
				'来自 ' + filename
			);
		}
	}
	// 遍历 Hold
	for (let i of oldChartRaw.n2) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		linesPec[i[0]].pushNote(new Note(3, calcTime(i[1]) + (i[5] ? 1e9 : 0), i[3] * 9 / 1024, calcTime(i[2]) - calcTime(i[1]), i[6]), i[4], i[5]);
		
		if (i[5]) {
			console.warn(
				'检测到 FakeNote，该 Note 可能会产生显示异常。\n' +
				'位于："n2 ' + i.slice(0, 6).join(" ") + '"\n' +
				'来自 ' + filename
			);
		}
		if (i[7] != 1) {
			message.sendWarning(
				'检测到异常 Note，该 Note 可能会产生显示异常。\n' +
				'位于:"n2 ' + i.slice(0, 5).join(" ") + ' # ' + i[6] + ' & ' + i[7] + '"\n' +
				'来自 ' + filename
			);
		}
	}
	// 遍历 Flick
	for (let i of oldChartRaw.n3) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		linesPec[i[0]].pushNote(new Note(4, calcTime(i[1]) + (i[4] ? 1e9 : 0), i[2] * 9 / 1024, 0, i[5]), i[3], i[4]);
		
		if (i[4]) {
			console.warn(
				'检测到 FakeNote，该 Note 可能会产生显示异常。\n' +
				'位于："n1 ' + i.slice(0, 5).join(" ") + '"\n' +
				'来自 ' + filename
			);
		}
		if (i[6] != 1) {
			console.warn(
				'检测到异常 Note，该 Note 可能会产生显示异常。\n' +
				'位于："n1 ' + i.slice(0, 5).join(" ") + ' # ' + i[5] + ' & ' + i[6] + '"\n' +
				'来自 ' + filename
			);
		}
	}
	// 遍历判定线变速事件
	for (let i of oldChartRaw.cv) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		linesPec[i[0]].pushEvent(0, calcTime(i[1]), null, i[2] / 7.0);
	}
	// 遍历判定线 Alpha 事件
	for (let i of oldChartRaw.ca) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		linesPec[i[0]].pushEvent(-1, calcTime(i[1]), calcTime(i[1]), i[2] > 0 ? i[2] / 255 : 0);
		
		if (i[2] < 0) {
			console.warn(
				'检测到负数 Alpha:' + i[2] + '，该值将会被转换为 0。\n' +
				'位于："ca ' + i.join(" ") + '"\n' +
				'来自 ' + filename
			);
		}
	}
	for (let i of oldChartRaw.cf) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		// 过滤时间不正确的事件
		if (i[1] > i[2]) {
			console.warn(
				'检测到事件时间轴不正确，该事件将被禁用。\n' +
				'位于："cf ' + i.join(" ") + '"\n' +
				'来自 ' + filename
			);
			continue;
		}
		
		linesPec[i[0]].pushEvent(-1, calcTime(i[1]), calcTime(i[2]), i[3] > 0 ? i[3] / 255 : 0);
		
		if (i[3] < 0) {
			console.warn(
				'检测到负数 Alpha:' + i[3] + '，该值将会被转换为 0。\n' +
				'位于："cf ' + i.join(" ") + '"\n' +
				'来自 ' + filename
			);
		}
	}
	// 遍历判定线移动事件
	for (let i of oldChartRaw.cp) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		linesPec[i[0]].pushEvent(-2, calcTime(i[1]), calcTime(i[1]), i[2] / 2048, i[3] / 1400, 1);
	}
	for (let i of oldChartRaw.cm) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		if (i[1] > i[2]) {
			console.warn(
				'检测到事件时间轴不正确，该事件将被禁用。\n' +
				'位于："cm ' + i.join(" ") + '"\n' +
				'来自 ' + filename
			);
			continue;
		}
		
		linesPec[i[0]].pushEvent(-2, calcTime(i[1]), calcTime(i[2]), i[3] / 2048, i[4] / 1400, i[5]);
		
		if (i[5] && !tween[i[5]] && i[5] != 1) {
			console.warn(
				'检测到未知的移动类型：' + i[5] + '，该值将会被转换为 1。\n' +
				'位于："cm ' + i.join(" ") + '"\n' +
				'来自 ' + filename
			);
		}
	}
	// 遍历判定线旋转事件
	for (let i of oldChartRaw.cd) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		linesPec[i[0]].pushEvent(-3, calcTime(i[1]), calcTime(i[1]), -i[2], 1); //??
	}
	for (let i of oldChartRaw.cr) {
		if (!linesPec[i[0]])
			linesPec[i[0]] = new JudgeLine(baseBpm);
		
		if (i[1] > i[2]) {
			console.warn(
				'检测到事件时间轴不正确，该事件将被禁用。\n' +
				'位于："cr ' + i.join(" ") + '"\n' +
				'来自 ' + filename
			);
			continue;
		}
		
		linesPec[i[0]].pushEvent(-3, calcTime(i[1]), calcTime(i[2]), -i[3], i[4]);
		
		if (i[4] && !tween[i[4]] && i[4] != 1) {
			console.warn(
				'检测到未知的旋转类型：' + i[4] + '，该值将会被转换为 1。\n' +
				'位于："cr ' + i.join(" ") + '"\n' +
				'来自 ' + filename
			);
		}
	}
	// 转换并合并判定线
	for (let i of linesPec) {
		if (!i) continue;
		
		const sortTime          = (a, b) => (a.startTime - b.startTime) + (a.endTime - b.endTime);
		let speedEvents         = i.speedEvents;
		let lineMoveEvents      = i.judgeLineMoveEventsPec;
		let lineRotateEvents    = i.judgeLineRotateEventsPec;
		let lineDisappearEvents = i.judgeLineDisappearEventsPec;
		
		// 过滤掉空的判定线
		if (i.notesAbove.length <= 0 &&
			i.notesBelow.length <= 0 &&
			speedEvents.length <= 1 &&
			lineMoveEvents.length <= 1 &&
			lineRotateEvents.length <= 1 &&
			lineDisappearEvents.length <= 1
		) {
			continue;
		}
		
		// Note 排序
		i.notesAbove.sort((a, b) => a.time - b.time);
		i.notesBelow.sort((a, b) => a.time - b.time);
		i.notesFakeAbove.sort((a, b) => a.time - b.time);
		i.notesFakeBelow.sort((a, b) => a.time - b.time);

		// 判定线事件排序
		speedEvents.sort(sortTime);
		lineMoveEvents.sort(sortTime);
		lineRotateEvents.sort(sortTime);
		lineDisappearEvents.sort(sortTime);
		
		{ // 同时处理判定线速度事件和 floorPosition
			let floorPosition = 0;
			for (let x = 0; x < speedEvents.length; x++) {
				speedEvents[x].endTime = x < speedEvents.length - 1 ? speedEvents[x + 1].startTime : 1e9;
				
				if (speedEvents[x].startTime < x) speedEvents[x].startTime = 0;
				
				speedEvents[x].floorPosition = floorPosition;
				floorPosition += (speedEvents[x].endTime - speedEvents[x].startTime) * speedEvents[x].value / i.bpm * 1.875;
			}
		}
		
		// 处理上方 Note
		for (let x of i.notesAbove) {
			let noteSpeed = 0,
				noteSpeedChangedPosition = 0,
				noteSpeedChangedTime = 0;
			
			for (let y of i.speedEvents) {
				if (x.time % 1e9 > y.endTime) continue;
				if (x.time % 1e9 < y.startTime) break;
				
				noteSpeed = y.value;
				noteSpeedChangedPosition = y.floorPosition;
				noteSpeedChangedTime = x.time % 1e9 - y.startTime;
			}
			
			x.floorPosition = noteSpeedChangedPosition + noteSpeed * noteSpeedChangedTime / i.bpm * 1.875;
			if (x.type == 3) x.speed *= noteSpeed;
		}
		// 处理下方 Note
		for (let x of i.notesBelow) {
			let noteSpeed = 0,
				noteSpeedChangedPosition = 0,
				noteSpeedChangedTime = 0;
			
			for (let y of i.speedEvents) {
				if (x.time % 1e9 > y.endTime) continue;
				if (x.time % 1e9 < y.startTime) break;
				
				noteSpeed = y.value;
				noteSpeedChangedPosition = y.floorPosition;
				noteSpeedChangedTime = x.time % 1e9 - y.startTime;
			}
			
			x.floorPosition = noteSpeedChangedPosition + noteSpeed * noteSpeedChangedTime / i.bpm * 1.875;
			if (x.type == 3) x.speed *= noteSpeed;
		}
		// 处理 FakeNotes
		for (let x of i.notesFakeAbove) {
			let noteSpeed = 0,
				noteSpeedChangedPosition = 0,
				noteSpeedChangedTime = 0;
			
			for (let y of i.speedEvents) {
				if (x.time % 1e9 > y.endTime) continue;
				if (x.time % 1e9 < y.startTime) break;
				
				noteSpeed = y.value;
				noteSpeedChangedPosition = y.floorPosition;
				noteSpeedChangedTime = x.time % 1e9 - y.startTime;
			}
			
			x.floorPosition = noteSpeedChangedPosition + noteSpeed * noteSpeedChangedTime / i.bpm * 1.875;
			if (x.type == 3) x.speed *= noteSpeed;
		}
		for (let x of i.notesFakeBelow) {
			let noteSpeed = 0,
				noteSpeedChangedPosition = 0,
				noteSpeedChangedTime = 0;
			
			for (let y of i.speedEvents) {
				if (x.time % 1e9 > y.endTime) continue;
				if (x.time % 1e9 < y.startTime) break;
				
				noteSpeed = y.value;
				noteSpeedChangedPosition = y.floorPosition;
				noteSpeedChangedTime = x.time % 1e9 - y.startTime;
			}
			
			x.floorPosition = noteSpeedChangedPosition + noteSpeed * noteSpeedChangedTime / i.bpm * 1.875;
			if (x.type == 3) x.speed *= noteSpeed;
		}
		
		{ // 处理判定线 Alpha 事件
			let disappearTime = 0;
			let disappearValue = 0;
			
			for (let x of lineDisappearEvents) {
				i.pushEvent(1, disappearTime, x.startTime, disappearValue, disappearValue);
				
				if (tween[x.motionType]) {
					for (let y = parseInt(x.startTime); y < parseInt(x.endTime); y++) {
						let ptt1 = (y - x.startTime) / (x.endTime - x.startTime);
						let ptt2 = (y + 1 - x.startTime) / (x.endTime - x.startTime);
						let pt1 = x.value - disappearValue;
						i.pushEvent(1, y, y + 1, disappearValue + tween[x.motionType](ptt1) * pt1, disappearValue + tween[x.motionType](ptt2) * pt1);
					}
				} else if (x.motionType) {
					i.pushEvent(1, x.startTime, x.endTime, disappearValue, x.value);
				}
				
				disappearTime = x.endTime;
				disappearValue = x.value;
			}
			
			i.pushEvent(1, disappearTime, 1e9, disappearValue, disappearValue);
		}
		
		{ // 处理判定线移动事件
			let moveTime = 0;
			let moveValue = 0;
			let moveValue2 = 0;
			
			for (const x of lineMoveEvents) {
				i.pushEvent(2, moveTime, x.startTime, moveValue, moveValue, moveValue2, moveValue2);
				
				if (tween[x.motionType]) {
					for (let y = parseInt(x.startTime); y < parseInt(x.endTime); y++) {
						let ptt1 = (y - x.startTime) / (x.endTime - x.startTime);
						let ptt2 = (y + 1 - x.startTime) / (x.endTime - x.startTime);
						let pt1 = x.value - moveValue;
						let pt2 = x.value2 - moveValue2;
						i.pushEvent(2, y, y + 1, moveValue + tween[x.motionType](ptt1) * pt1, moveValue + tween[x.motionType](ptt2) * pt1, moveValue2 + tween[x.motionType](ptt1) * pt2, moveValue2 + tween[x.motionType](ptt2) * pt2);
					}
				} else if (x.motionType) {
					i.pushEvent(2, x.startTime, x.endTime, moveValue, x.value, moveValue2, x.value2);
				}
				
				moveTime = x.endTime;
				moveValue = x.value;
				moveValue2 = x.value2;
			}
			
			i.pushEvent(2, moveTime, 1e9, moveValue, moveValue, moveValue2, moveValue2);
		}
		
		{ // 处理判定线旋转事件
			let rotateTime = 0;
			let rotateValue = 0;
			
			for (const x of lineRotateEvents) {
				i.pushEvent(3, rotateTime, x.startTime, rotateValue, rotateValue);
				
				if (tween[x.motionType]) {
					for (let y = parseInt(x.startTime); y < parseInt(x.endTime); y++) {
						let ptt1 = (y - x.startTime) / (x.endTime - x.startTime);
						let ptt2 = (y + 1 - x.startTime) / (x.endTime - x.startTime);
						let pt1 = x.value - rotateValue;
						i.pushEvent(3, y, y + 1, rotateValue + tween[x.motionType](ptt1) * pt1, rotateValue + tween[x.motionType](ptt2) * pt1);
					}
				} else if (x.motionType) {
					i.pushEvent(3, x.startTime, x.endTime, rotateValue, x.value);
				}
				
				rotateTime = x.endTime;
				rotateValue = x.value;
			}
			
			i.pushEvent(3, rotateTime, 1e9, rotateValue, rotateValue);
			newChart.pushLine(i);
		}
	}
	
	return JSON.parse(JSON.stringify(newChart));
	
	function pushCommand(next) {
		if (oldChartRaw[rawChartStr]) {
			if (rawChartStr[0] == 'n') {
				rawChartArr.push(...rawChartCounterArr);
				rawChartCounterArr = [1, 1];
			}
			oldChartRaw[rawChartStr].push(JSON.parse(JSON.stringify(rawChartArr)));
		}
		rawChartArr.length = 0;
		rawChartStr = next;
	}
	
	function calcTime(timePec) {
		let timePhi = 0;
		for (const i of bpmEvents) {
			if (timePec < i.startTime) break;
			if (timePec > i.endTime) continue;
			timePhi = Math.round(((timePec - i.startTime) / i.bpm + i.value) * baseBpm * 32);
		}
		return timePhi;
	}
}

/***
 * @function 将旧版的 JSON 官谱文件转换为最新的版本
 * @param {Object} chart 旧版谱面文件对象
 * @return {Object} 转换后的谱面文件对象
***/
function ConvertChartVersion(chart) {
	let newChart = JSON.parse(JSON.stringify(chart));
	
	switch (newChart.formatVersion) {
		case 1: {
			newChart.formatVersion = 3;
			for (const i of newChart.judgeLineList) {
				let floorPosition = 0;
				
				for (const x of i.speedEvents) {
					if (x.startTime < 0) x.startTime = 0;
					x.floorPosition = floorPosition;
					floorPosition += (x.endTime - x.startTime) * x.value / i.bpm * 1.875;
				}
				
				for (const x of i.judgeLineDisappearEvents) {
					x.start2 = 0;
					x.end2   = 0;
				}
				
				for (const x of i.judgeLineMoveEvents) {
					x.start2 = x.start % 1e3 / 520;
					x.end2   = x.end % 1e3 / 520;
					x.start  = parseInt(x.start / 1e3) / 880;
					x.end    = parseInt(x.end / 1e3) / 880;
				}
				
				for (const x of i.judgeLineRotateEvents) {
					x.start2 = 0;
					x.end2   = 0;
				}
			}
		}
		case 3: { }
		case 3473: // Easter Egg!
			break;
		default:
			throw '谱面数据错误：未知的谱面格式版本：' + newChart.formatVersion;
	}
	
	return newChart;
}

/***
 * @function 将 csv 文件转换为数组或对象
 * @param {String} data 传入的 csv 文本文件
 * @param {Boolean} isObject 是否输出为对象
 * @return {Object | Array}
***/
function Csv2Array(data, isObject) {
	const strarr = data.replace(/\r/g, "").split("\n");
	const col = [];
	for (const i of strarr) {
		let rowstr = "";
		let isQuot = false;
		let beforeQuot = false;
		const row = [];
		for (const j of i) {
			if (j == '"') {
				if (!isQuot) isQuot = true;
				else if (beforeQuot) {
					rowstr += j;
					beforeQuot = false;
				} else beforeQuot = true;
			} else if (j == ',') {
				if (!isQuot) {
					row.push(rowstr);
					rowstr = "";
				} else if (beforeQuot) {
					row.push(rowstr);
					rowstr = "";
					isQuot = false;
					beforeQuot = false;
				} else rowstr += j;
			} else if (!beforeQuot) rowstr += j;
			else throw "Error 1";
		}
		if (!isQuot) {
			row.push(rowstr);
			rowstr = "";
		} else if (beforeQuot) {
			row.push(rowstr);
			rowstr = "";
			isQuot = false;
			beforeQuot = false;
		} else throw "Error 2";
		col.push(row);
	}
	if (!isObject) return col;
	const resultObj = [];
	for (let i = 1; i < col.length; i++) {
		const obj = {};
		for (let j = 0; j < col[0].length; j++) {
			let objName = /([\d\w]+)/.exec(col[0][j])[1].replace(/\"/g, '');
			obj[objName] = col[i][j];
		}
		resultObj.push(obj);
	}
	return resultObj;
}