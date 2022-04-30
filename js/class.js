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

class Chart {
	constructor(songFile, bgImageFile, offset, songName, songArtist, designer, bgDesigner, songLevel) {
		this.bpms       = [];
		this.judgelines = [];
		this.notes      = []; // 留给判定用
		this.song       = songFile;
		this.background = bgImageFile;
		this.offset     = Number(offset || 0) / 1000; // 输入的时候是以毫秒为单位
		this.meta       = {
			name       : songName || 'No name',
			artist     : songArtist || 'Unknown',
			designer   : designer || 'Unknown',
			bgDesigner : bgDesigner || 'Unknown',
			level      : songLevel || 'SP Lv.?'
		}

		this._bpm                 = -1;
		this._beatValue           = 0;
		this._beatPerTime         = -1;
		this._lastBPMChangedTime  = 0;
		this._lastBPMChangedValue = -1;

		if (isNaN(this.offset)) {
			throw new Error('Invaild offset value.');
		}
	}

	addBPM (bpm) {
		if (!(bpm instanceof BPM)) return -1;
		this.bpms.push(bpm);
		this.bpms.sort(sortBPM);

		function sortBPM (a, b) {
			return a.startTime - b.startTime;
		}
	}

	addNote (note) {
		if (!(note instanceof Note)) return -1;
		this.notes.push(note);
		this.notes.sort(sortNote);

		function sortNote (a, b) {
			return a.startTime - b.startTime;
		}
	}

	// 取整个谱面的真 Note 数量
	get totalNotes () {
		let notesCount = 0;
		for (let note of this.notes) {
			if (!note.isFake) notesCount++;
		}
		return notesCount;
	}

	// 使用当前音乐时间（秒）计算现在的 BPM
	calcCurrentBPM (currentTime) {
		if (this._bpm < 0) this._bpm = this.bpms[0].bpm;
		if (this._beatPerTime < 0) this._beatPerTime = Number((60 / this._bpm).toFixed(6));
		if (this._lastBPMChangedValue < 0) this._lastBPMChangedValue = this.bpms[0].startTime;

		for (let bpm of this.bpms) {
			if (this._beatValue >= bpm.startTime && !bpm.isSet) {
				this._lastBPMChangedTime += (bpm.startTime - this._lastBPMChangedValue) * this._beatPerTime;
				this._lastBPMChangedValue = bpm.startTime;

				this._bpm = bpm.bpm;
				this._beatPerTime = Number((60 / this._bpm).toFixed(6));

				bpm.isSet = true;
			}
		}

		this._beatValue = this._lastBPMChangedValue + (currentTime - this._lastBPMChangedTime) / this._beatPerTime;
	}

	// 使用当前音乐时间（秒）来计算此时谱面的各种数据
	calcTime (currentTime, windwoWidth = 1, windowHeight = 1) {
		this.calcCurrentBPM(currentTime);
		for (let judgeline of this.judgelines) {
			judgeline.calcTime(this._beatValue, windwoWidth, windowHeight);
		}
	}

	async start (pixi) {
		if (!this.music) return;
		this._music = await this.music.play();

		pixi.ticker.add(() => {
			// 临时函数
			changeTime(this._music.progress * this.music.duration - this.offset);
		});
	}
}






class Judgeline {
	constructor(texture = 'line.png', coverType = 1, sprite = null) {
		this.events = [];
		this.notes  = [];
		this.coverType = Number(coverType);
		this.currentFloorPosition = 0;
		this.texture = texture;
		this.sprite = sprite;

		this._posX = 0.5;
		this._posY = 0.5;
		this._angle = 0;
		this._alpha = 255;
		this._speed = 1;
	}

	get totalNotes () {
		let notesCount = 0;
		for (let note of this.notes) {
			if (!note.isFake) notesCount++;
		}
		return notesCount;
	}

	addEvents (events) {
		if (!(events instanceof JudgelineEvents)) return -1;
		return this.events.push(events);
	}

	addNote (note) {
		if (!(note instanceof Note)) return -1;
		this.notes.push(note);
		this.notes.sort(sortNote);

		function sortNote (a, b) {
			return a.startTime - b.startTime;
		}
	}

	calcTime (currentTime, windowWidth = 1, windowHeight = 1) {
		this._posX = 0;
		this._posY = 0;
		this._angle = 0;
		this._alpha = 0;
		this._speed = 0;

		for (let eventLayer of this.events) {
			eventLayer.calcTime(currentTime);
			this._posX += eventLayer._posX;
			this._posY += eventLayer._posY;
			this._alpha += eventLayer._alpha;
			this._angle += eventLayer._angle;
			this._speed += eventLayer._speed;
		}

		if (this.sprite) {
			this.sprite.position.x = (this._posX / 1340 + 0.5) * windowWidth; // 原版中并非绝对位置而是相对位置
			this.sprite.position.y = (0.5 - this._posY / 900) * windowHeight; // 原版中并非绝对位置而是相对位置
			this.sprite.alpha = this._alpha / 255; // 原版中值为百分比
			this.sprite.angle = this._angle; // 原版中非角度
		}
	}
}

class JudgelineEvents {
	constructor() {
		this.moveX = [];
		this.moveY = [];
		this.alpha = [];
		this.angle = [];
		this.speed = [];
	}
	
	addEvent (type, event) {
		switch (type) {
			case 'moveX': {
				this.moveX.push(event);
				this.moveX.sort(sortEvent);
				break;
			}
			case 'moveY': {
				this.moveY.push(event);
				this.moveY.sort(sortEvent);
				break;
			}
			case 'alpha': {
				this.alpha.push(event);
				this.alpha.sort(sortEvent);
				break;
			}
			case 'angle': {
				this.angle.push(event);
				this.angle.sort(sortEvent);
			}
			case 'speed': {
				this.speed.push(event);
				this.speed.sort(sortEvent);
				break;
			}
			default: {
				throw new Error('No such event: ' + type);
			}
		}

		function sortEvent (a, b) {
			return a.startTime - b.startTime;
		}
	}

	calcTime (currentTime) {
		for (let event of this.moveX) {
			if (event.isInTime(currentTime)) { this._posX = event.getValue(currentTime);
				break;
			}
		}
		for (let event of this.moveY) {
			if (event.isInTime(currentTime)) { this._posY = event.getValue(currentTime);
				break;
			}
		}
		for (let event of this.alpha) {
			if (event.isInTime(currentTime)) { this._alpha = event.getValue(currentTime);
				break;
			}
		}
		for (let event of this.angle) {
			if (event.isInTime(currentTime)) { this._angle = event.getValue(currentTime);
				break;
			}
		}
		for (let event of this.speed) {
			if (event.isInTime(currentTime)) { this._speed = event.getValue(currentTime);
				break;
			}
		}
	}
}

class JudgelineEvent {
	constructor(startTime, endTime, easeType = 1, start, end) {
		this.startTime = Number(Number(startTime).toFixed(6));
		this.endTime   = Number(Number(endTime).toFixed(6));
		this.easeType  = Number(easeType);
		this.start     = Number(start);
		this.end       = Number(end);

		if (startTime instanceof Array) {
			this.startTime = Number((startTime[0] + startTime[1] / startTime[2]).toFixed(6));
		}
		if (endTime instanceof Array) {
			this.endTime = Number((endTime[0] + endTime[1] / endTime[2]).toFixed(6));
		}

		this.timeBetween = this.endTime - this.startTime;
		
		if (
			isNaN(this.startTime) ||
			isNaN(this.endTime) ||
			isNaN(this.easeType) ||
			isNaN(this.start) ||
			isNaN(this.end)
		) {
			throw new Error('Invaild time value');
		}
		
		if (this.startTime >= this.endTime) {
			this.endTime = startTime;
			this.timeBetween = 0;
			
			console.warn('Event start time is later than end time, ignore it.');
		}
	}
	
	isInTime (currentTime) {
		if (
			this.startTime <= currentTime &&
			this.endTime >= currentTime
		) {
			return true;
		} else {
			return false;
		}
	}

	// 全部曲线计算方法
	calcEase (x) {
		/**
			https://easings.net/
			1	linear
			2	out sine
			3	in sine
			4	out quad
			5	in quad
			6	io sine
			7	io quad
			8	out cubic
			9	in cubic
			10	out quart
			11	in quart
			12	io cubic
			13	io quart
			14	out quint
			15	in quint
			16	out expo
			17	in expo
			18	out circ
			19	in circ
			20	out back
			21	in back
			22	io circ
			23	io back
			24	out elastic
			25	in elastic
			26	out bounce
			27	in bounce
			28	io bounce
		**/
		const c1 = 1.70158,
			c2 = c1 * 1.525,
			c3 = c1 + 1,
			c4 = (2 * Math.PI) / 3,
			n1 = 7.5625,
			d1 = 2.75;

		switch (this.easeType) {
			case 1: { return x;
				break;
			}
			case 2: { return Math.sin((x * Math.PI) / 2);
				break;
			}
			case 3: { return 1 - Math.cos((x * Math.PI) / 2);
				break;
			}
			case 4: { return 1 - (1 - x) * (1 - x);
				break;
			}
			case 5: { return x * x;
				break;
			}
			case 6: { return -(Math.cos(Math.PI * x) - 1) / 2;
				break;
			}
			case 7: { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
				break;
			}
			case 8: { return 1 - Math.pow(1 - x, 3);
				break;
			}
			case 9: { return x * x * x;
				break;
			}
			case 10: { return 1 - Math.pow(1 - x, 4);
				break;
			}
			case 11: { return x * x * x * x;
				break;
			}
			case 12: { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
				break;
			}
			case 13: { return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
				break;
			}
			case 14: { return 1 - Math.pow(1 - x, 5);
				break;
			}
			case 15: { return x * x * x * x * x;
				break;
			}
			case 16: { return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
				break;
			}
			case 17: { return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
				break;
			}
			case 18: { return Math.sqrt(1 - Math.pow(x - 1, 2));
				break;
			}
			case 19: { return 1 - Math.sqrt(1 - Math.pow(x, 2));
				break;
			}
			case 20: { return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
				break;
			}
			case 21: { return c3 * x * x * x - c1 * x * x;
				break;
			}
			case 22: {
				return x < 0.5
					? (1 - sqrt(1 - pow(2 * x, 2))) / 2
					: (sqrt(1 - pow(-2 * x + 2, 2)) + 1) / 2;
				break;
			}
			case 23: {
				return x < 0.5
					? (pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
					: (pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
				break;
			}
			case 24: {
				return x === 0
					? 0
					: x === 1
					? 1
					: pow(2, -10 * x) * sin((x * 10 - 0.75) * c4) + 1;
				break;
			}
			case 25: {
				return x === 0
					? 0
					: x === 1
					? 1
					: -pow(2, 10 * x - 10) * sin((x * 10 - 10.75) * c4);
				break;
			}
			case 26: { return easeOutBounce(x);
				break;
			}
			case 27: { return 1 - easeOutBounce(1 - x);
				break;
			}
			case 28: {
				return x < 0.5
					? (1 - easeOutBounce(1 - 2 * x)) / 2
					: (1 + easeOutBounce(2 * x - 1)) / 2;
				break;
			}
			default: { return x }
		}

		function easeOutBounce(x) {
			if (x < 1 / d1) {
				return n1 * x * x;
			} else if (x < 2 / d1) {
				return n1 * (x -= 1.5 / d1) * x + 0.75;
			} else if (x < 2.5 / d1) {
				return n1 * (x -= 2.25 / d1) * x + 0.9375;
			} else {
				return n1 * (x -= 2.625 / d1) * x + 0.984375;
			}
		}
	}
	
	getTimePercent (currentTime) {
		return this.calcEase((currentTime - this.startTime) / this.timeBetween);
	}
	
	// 我觉得应该是通用方法了
	getValue (currentTime) {
		let time2 = this.getTimePercent(currentTime);
		let time1 = 1 - time2;
		return this.start * time1 + this.end * time2;
	}
}


class Note {
	constructor (startTime, type, endTime, positionX, isAbove = true, speed = 1, isFake = false, alpha = 1, visibleTime = 999999, yOffset = 0) {
		this.startTime   = Number(startTime);
		this.type        = Number(type);
		this.endTime     = Number(endTime);
		this.positionX   = Number(positionX);
		this.isAbove     = !!isAbove;
		this.speed       = Number(speed);
		this.isFake      = !!isFake;
		this.alpha       = Number(alpha);
		this.visibleTime = Number(visibleTime);
		this.yOffset     = Number(yOffset);

		if (startTime instanceof Array) {
			this.startTime = Number((startTime[0] + startTime[1] / startTime[2]).toFixed(6));
		}
		if (endTime instanceof Array) {
			this.endTime = Number((endTime[0] + endTime[1] / endTime[2]).toFixed(6));
		}

		this.currentX = 0;
		this.currentY = 0;

		if (
			isNaN(this.startTime) ||
			isNaN(this.type) ||
			isNaN(this.endTime) ||
			isNaN(this.positionX) ||
			isNaN(this.speed) ||
			isNaN(this.alpha) ||
			isNaN(this.visibleTime) ||
			isNaN(this.yOffset)
		) {
			throw new Error('Invaild argument value');
		}

		if (this.type < 1 || this.type > 4) {
			throw new Error('Incorrect note type');
		}
	}
}

class Beat extends Array {
	constructor (bar, beat, beatCount) {
		super(Number(bar), Number(beat), Number(beatCount));

		if (
			isNaN(this[0]) ||
			isNaN(this[1]) ||
			isNaN(this[2])
		) {
			throw new Error('Invaild beat value');
		}
	}
}

class BPM {
	constructor (bpm, startTime) {
		this.bpm = Number(bpm);
		this.startTime = Number(startTime);
		this.isSet = false;

		if (startTime instanceof Array) {
			this.startTime = Number((startTime[0] + startTime[1] / startTime[2]).toFixed(6));
		}

		if (isNaN(this.bpm) || isNaN(this.startTime)) {
			throw new Error('Invaild bpm value');
		}
	}
}