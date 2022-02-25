'use strict';
// 定义一个三阶贝塞尔公式，来自 https://codepen.io/delbertbeta/pen/VRxxgM
// 精度相对不错的一个类
class Cubic {
	constructor (a, b, c, d, epsilon = 1e-6) {
		this.px3 = 3 * a;
		this.px2 = 3 * (c - a) - this.px3;
		this.px1 = 1 - this.px3 - this.px2;
		this.py3 = 3 * b;
		this.py2 = 3 * (d - b) - this.py3;
		this.py1 = 1 - this.py3 - this.py2;
		this.epsilon = epsilon; // 目标精度
	}
	
	getX(t) {
		return ((this.px1 * t + this.px2) * t + this.px3) * t;
	}
	
	getY(t) {
		return ((this.py1 * t + this.py2) * t + this.py3) * t;
	}
	
	solve(x) {
		if (x === 0 || x === 1) { // 特殊值跳过精度验证
			return this.getY(x);
		}
		
		if (x < 0) { // 本程序不包含 x < 0 或 x > 1 时的应用场景，故过滤相关值
			return 0;
		}
		if (x > 1) {
			return 1;
		}
		
		let t = x;
		for (let i = 0; i < 8; i++) {
			let g = this.getX(t) - x;
			if (Math.abs(g) < this.epsilon) {
				return this.getY(t);
			}
			
			let d = (3 * this.px1 * t + 2 * this.px2) * t + this.px3;
			if (Math.abs(d) < 1e-6) {
				break;
			}
			t = t - g / d;
		}
		
		return this.getY(t);
	}
}

// 定义计时器类
class Timer {
	constructor() {
		this.startTime = 0;
		this.isPaused = false;
		this.isStoped = true;
	}
	
	static create() {
		let timer = new Timer();
		timer.start();
		return timer;
	}
	
	start() {
		this.startTime = Date.now();
		this.isPaused = false;
		this.isStoped = false;
	}
	
	pause() {
		if (this.isPaused || this.isStoped) return this._lastDuration / 1000;
		
		this._lastDuration = Date.now() - this.startTime;
		this.startTime = Date.now();
		
		this.isPaused = true;
		
		return this._lastDuration / 1000;
	}
	
	stop() {
		if (this.isStoped) return this._lastDuration / 1000;
		
		this._lastDuration = Date.now() - this.startTime;
		this.startTime = Date.now();
		
		this.isPaused = false;
		this.isStoped = true;
		
		return this._lastDuration / 1000;
	}
	
	toggle() {
		if (!this.isPaused) {
			return this.pause();
		} else {
			this.startTime = Date.now() - this._lastDuration;
			this._lastDuration = undefined;
			
			this.isPaused = false;
			
			return (Date.now() - this.startTime) / 1000;
		}
	}
	
	get time() {
		if (this.isPaused || this.isStoped) {
			this.startTime = Date.now();
			return this._lastDuration / 1000;
		} else {
			return (Date.now() - this.startTime) / 1000;
		}
	}
}

/***
 * 该类为游戏时的点击事件服务。
 *
 * 该类在初始化时会传入两个参数：offsetX、offsetY。
 *     offsetX: 该点击事件发生的横向位置
 *     offsetY: 该点击事件发生的纵向位置
 * 
 * 在初始化后，该类将包含 4 个成员：offsetX、offsetY、isMoving、time。
 *     offsetX: 该点击事件发生的横向位置
 *     offsetY: 该点击事件发生的纵向位置
 *     isMoving: 推测该成员用于判断该点击是否正在移动
 *     time: 推测是按下的持续时长
***/
class Click {
	constructor(offsetX, offsetY, type = null, inputId = null) {
		this.offsetX = Number(offsetX);
		this.offsetY = Number(offsetY);
		this.isMoving = false;
		this.time = 0;
		this.type = type;
		this.inputId = Number(inputId);
	}
	
	/***
	 * 该静态方法用于判断输入的坐标是否为四个角，如是则触发 specialCick
	 * 无论是否触发 specialClick 该方法都会返回一个新的 Click 并将其 push 到 taps 数组内。
	***/
	static activate(offsetX, offsetY, type = null, inputId = null) {
		inputs.taps.push(new Click(offsetX, offsetY, type, inputId));
		
		// 左上角判断
		if (offsetX < pixi.renderer.lineScale * 1.5 &&
			offsetY < pixi.renderer.lineScale * 1.5)
		{
			specialClick.click(0);
		}
		
		// 右上角判断
		if (offsetX > pixi.renderer.realWidth - pixi.renderer.lineScale * 1.5 &&
			offsetY < pixi.renderer.lineScale * 1.5)
		{
			specialClick.click(1);
		}
		
		// 左下角判断
		if (offsetX < pixi.renderer.lineScale * 1.5 &&
			offsetY > pixi.renderer.realHeight - pixi.renderer.lineScale * 1.5)
		{
			specialClick.click(2);
		}
		
		// 右下角判断
		if (offsetX > pixi.renderer.realWidth - pixi.renderer.lineScale * 1.5 &&
			offsetY > pixi.renderer.realHeight - pixi.renderer.lineScale * 1.5)
		{
			specialClick.click(3);
		}
		
		return new Click(offsetX, offsetY, type, inputId);
	}
	
	// 猜测当手指在移动时会调用此函数。
	// 备忘录：mousemove、touchmove 中调用了该方法
	move(offsetX, offsetY) {
		this.offsetX = Number(offsetX);
		this.offsetY = Number(offsetY);
		this.isMoving = true;
		this.time = 0;
	}
	
	// 该方法用于增加输入点输入持续时间，并在允许的情况下绘制输入点
	animate() {
		if (!this.time++) { // 先判断 time 是否为 0，再自增
			if (this.isMoving) {
				// clickEvents0.push(ClickEvent0.getClickMove(this.offsetX, this.offsetY));
				DrawInputPoint(this.offsetX, this.offsetY, this.type, this.inputId, 1);
			} else {
				// clickEvents0.push(ClickEvent0.getClickTap(this.offsetX, this.offsetY));
				DrawInputPoint(this.offsetX, this.offsetY, this.type, this.inputId, 0);
			}
			
		} else {
			// clickEvents0.push(ClickEvent0.getClickHold(this.offsetX, this.offsetY));
			DrawInputPoint(this.offsetX, this.offsetY, this.type, this.inputId, 2);
		}
	}
}

/***
 * 该类为 Note 的判定服务。
 * 
 * 该类在初始化时会传入三个参数：offsetX，offsetY，type
 *     offsetX: 判定点的水平位置
 *     offsetY: 判定点的垂直位置
 *     type: 判定点的类型，默认为 0。其中：1: Tap, 2: Hold, 3:Move。推测：
 *         Tap: 在该判定点上存在点击事件。此事件应该用于 Tap、Hold 的判定
 *         Hold: 在该判定点上存在按住事件。此事件应该用于 Hold、Drag 的判定。
 *         Move: 在该判定点上存在移动事件。此事件应该用于 Hold、Drag、Flick 的判定。
***/
class Judgement {
	constructor(offsetX, offsetY, type) {
		this.offsetX = Number(offsetX);
		this.offsetY = Number(offsetY);
		this.type = Number(type) || 0; //1-Tap,2-Hold,3-Move
		this.catched = false;
	}
	
	// 猜测该函数用于判定 Note 是否在某个区域内（应该是 Note 的判定区域）
	// hw 是 Note 宽度
	isInArea(x, y, cosr, sinr, hw, keyCode = 0) {
		// let y = -_y;
		// let offsetY = -this.offsetY;
		// let realX = x + (this.offsetX - x) * cosr - (offsetY - y) * sinr;
		let realX = (this.offsetX - x) * cosr + (this.offsetY - y) * sinr;
		// let noteHalfWidth = Math.ceil(hw / 2) + 4;
		
		realX = realX > 0 ? realX : -realX;
		
		return realX <= hw;
		
		// return isNaN(this.offsetX + this.offsetY) ? true : Math.abs((this.offsetX - x) * cosr + (this.offsetY - y) * sinr) <= hw;
	}
}

// 该类为 Note 的判定服务，是 Judgement 的数组形式。
/***
 * 备忘录
***/
class Judgements extends Array {
	/***
	 * 添加判定点
	 * 
	 * notes: 存档 Note 信息的数组。传入此参数是为了在开启自动演示时可以自动添加判定点。
	 * realTime: 当前游戏播放的时间。传入此参数是为了在开启自动演示时可以自动添加判定点。
	 * 
	 * 该方法会自动遍历当前所有的输入操作并将其转换为 Judgement 对象后 push 到自身。如果
	 * 开启了自动演示则会自行添加 Judgement 对象。
	***/
	addJudgement(notes, realTime) {
		if (stat.isPaused) return;
		
		this.length = 0;
		
		if (!settings.autoPlay) { // 判断是否开启了自动演示
			for (let i in inputs.mouse) { // 遍历鼠标点击事件
				let click = inputs.mouse[i];
				
				if (click instanceof Click) {
					if (click.time) {
						this.push(new Judgement(click.offsetX, click.offsetY, 2));
					} else if (click.isMoving) {
						this.push(new Judgement(click.offsetX, click.offsetY, 3));
					}
					//else this.push(new Judgement(i.offsetX, i.offsetY, 1));
				}
			}
			
			for (let i in inputs.touches) { // 遍历触摸事件
				let touch = inputs.touches[i];
				
				if (touch instanceof Click) {
					if (touch.time) this.push(new Judgement(touch.offsetX, touch.offsetY, 2));
					else if (touch.isMoving) this.push(new Judgement(touch.offsetX, touch.offsetY, 3));
					// else this.push(new Judgement(touch.offsetX, touch.offsetY, 1));
				}
			}
			
			for (let i in inputs.keyboard) { // 遍历键盘事件
				const input = inputs.keyboard[i];
				
				if (input instanceof Click) {
					if (input.time) this.push(new Judgement(input.offsetX, input.offsetY, 2));
					else /*if (i.isMoving)*/ this.push(new Judgement(input.offsetX, input.offsetY, 3));
					//else this.push(new Judgement(i.offsetX, i.offsetY, 1));
				}
			}
			
			
			for (let tap of inputs.taps) { // 遍历单击事件
				if (tap instanceof Click) this.push(new Judgement(tap.offsetX, tap.offsetY, 1));
			}
			
			
		} else { // 如果开启了自动演示，则自动添加判定点
			
			for (const i of notes) {
				if (i.raw.score > 0 && (i.raw.isProcessed || i.raw.isScored)) continue;
				if (i.raw.realTime - realTime > global.judgeTimes.bad) continue;
				
				let offsetX = getNotePosition(i, false).x,
					offsetY = getNotePosition(i, false).y;
				
				if (i.raw.type == 1) {
					if (i.raw.realTime - realTime < 0) this.push(new Judgement(offsetX, offsetY, 1));
				} else if (i.raw.type == 2) {
					if (i.raw.realTime - realTime < global.judgeTimes.bad) this.push(new Judgement(offsetX, offsetY, 2));
				} else if (i.raw.type == 3) {
					if (i.raw.isPressing) this.push(new Judgement(offsetX, offsetY, 2));
					else if (i.raw.realTime - realTime < 0) this.push(new Judgement(offsetX, offsetY, 1));
				} else if (i.raw.type == 4) {
					if (i.raw.realTime - realTime < global.judgeTimes.bad) this.push(new Judgement(offsetX, offsetY, 3));
				}
			}
		}
	};
	
	// 计算 Note 的判定
	/***
	 * 备忘录：
	 * 这一块的代码由于是直接复制自原版，所以有很多东西要改，有的地方甚至要去修改主代码。
	***/
	judgeNote(notes, realTime, width) {
		if (!stat.isTransitionEnd || stat.isPaused) return;
		
		for (const i of notes) { // 遍历所有 Note
			let timeBetween = i.raw.realTime - realTime,
				timeBetweenReal = timeBetween > 0 ? timeBetween : -timeBetween;
			
			if (i.raw.score > 0 && i.raw.isProcessed) continue; // 如果该 Note 已被打击，则忽略
			if (timeBetween > global.judgeTimes.bad) continue;

			if (timeBetween < -global.judgeTimes.bad && !(i.raw.isProcessed || i.raw.isPressing) && !i.raw.isScored) { // 是否 Miss
				score.addCombo(1);
				i.raw.score = 1;
				i.raw.isProcessed = true;
				i.raw.isScored = true;
				
				if (i.type == 3) {
					i.alpha = 0.5;
					i.raw.isProcessed = false;
				}
				
				continue;
			}
			
			let noteRaw = i.raw,
				notePosition = getNotePosition(i, false),
				offsetX = notePosition.x,
				offsetY = notePosition.y,
				cosr = notePosition.cosr,
				sinr = notePosition.sinr;
			
			if (noteRaw.type == 1) { // Note 类型为 Tap。在这个分支中，判定和动画是一起执行的
				for (let x = 0; x < this.length; x++) { // 合理怀疑这个循环是为了遍历当前屏幕上的手指数
					if (
						this[x].type == 1 &&
						this[x].isInArea(offsetX, offsetY, cosr, sinr, width) &&
						timeBetweenReal <= global.judgeTimes.bad &&
						!noteRaw.isProcessed
					) {
						if (timeBetweenReal <= global.judgeTimes.perfect) { // 判定 Perfect
							i.raw.score = 4;
							
						} else if (timeBetweenReal <= global.judgeTimes.good) { // 判定 Good
							i.raw.score = 3;
							
						} else { // 判定 Bad
							i.raw.score = 2;
						}
						
						// 如果 Note 被成功判定，则停止继续检测
						if (i.raw.score > 0) {
							score.addCombo(i.raw.score, timeBetween);
							i.visible = false;
							
							CreateClickAnimation(i, settings.performanceMode);
							if (settings.hitsound && i.score > 2) textures.sound.tap.play({volume: settings.hitsoundVolume});
							if (sprites.accIndicator) sprites.accIndicator.pushAccurate(noteRaw.realTime, realTime);
							
							i.raw.isProcessed = true;
							
							this.splice(x, 1);
							break;
						}
						
					}
					
				}
				
			} else if (noteRaw.type == 2) { // Note 类型为 Drag
				if (noteRaw.score > 0 && timeBetween < 0 && !noteRaw.isProcessed) { // 为已打击的 Note 播放声音与击打动画
					score.addCombo(noteRaw.score);
					note.visible = false;
					
					CreateClickAnimation(i, settings.performanceMode);
					if (settings.hitsound) textures.sound.drag.play({volume: settings.hitsoundVolume});
					if (sprites.accIndicator) sprites.accIndicator.pushAccurate(noteRaw.realTime, realTime);
					
					i.isProcessed = true;
					
				} else if (!noteRaw.isProcessed) { // 检测 Note 是否被打击
					for (let x = 0; x < this.length; x++) {
						if (
							this[x].isInArea(offsetX, offsetY, cosr, sinr, width) &&
							timeBetweenReal <= global.judgeTimes.good
						) { 
							this[x].catched = true;
							i.raw.score = 4;
							break;
						}
					}
				}
				
			} else if (noteRaw.type == 3) { // Note 类型为 Hold
				if (noteRaw.isPressing && noteRaw.pressTime) { // Hold 是否被按下
					// 此处为已被单击的 Hold 持续监听是否一直被按住到 Hold 结束
					if ((Date.now() - noteRaw.pressTime) * noteRaw.holdTime >= 1.6e4 * noteRaw.realHoldTime && !noteRaw.isScored) { // Note 被按下且还未结束 //间隔时间与bpm成反比，待实测
						CreateClickAnimation(i, settings.performanceMode);
						i.raw.pressTime = Date.now();
					}
					
					if (noteRaw.realTime + noteRaw.realHoldTime - global.judgeTimes.bad < realTime && noteRaw.isPressing) { // Note 被按下且已结束
						if (noteRaw.score > 0 && !noteRaw.isScored) {
							score.addCombo(noteRaw.score, noteRaw.accType);
							i.raw.isScored = true;
						}
						if (noteRaw.realTime + noteRaw.realHoldTime < realTime) {
							note.visible = false;
							i.raw.isProcessed = true;
						}
						continue;
					}
				}
				
				i.raw.isPressing = false;
				
				for (let x = 0; x < this.length; x++) {
					if (!noteRaw.pressTime && !noteRaw.isPrecessed && !noteRaw.isScored) { // 应该是同上，但是这一块负责的是刚开始打击时的判定
						if (
							this[x].type == 1 &&
							this[x].isInArea(offsetX, offsetY, cosr, sinr, width) &&
							timeBetweenReal < global.judgeTimes.good
						) {
							if (timeBetweenReal <= global.judgeTimes.perfect) { // 判定 Perfect
								i.raw.score = 4;
								
							} else { // 判定 Good，暂时未知如果判定点在 Bad 时是否判定为 Miss
								i.raw.score = 3;
							}
							
							i.raw.isPressing = true;
							i.raw.accType = timeBetween;
							i.raw.pressTime = Date.now();
							
							CreateClickAnimation(i, settings.performanceMode);
							if (settings.hitsound) textures.sound.tap.play({volume: settings.hitsoundVolume});
							if (sprites.accIndicator) sprites.accIndicator.pushAccurate(noteRaw.realTime, realTime);
							
							this.splice(x, 1);
							break;
						}
						
					} else if (!noteRaw.isScored && !noteRaw.isProcessed && this[x].isInArea(offsetX, offsetY, cosr, sinr, width)) {
						i.raw.isPressing = true; // 持续判断手指是否在判定区域内
					}
				}
				
				if (!stat.isPaused && i.raw.score > 0 && !i.raw.isPressing && !i.raw.pressTime && !i.raw.isScored) { // 如果在没有暂停的情况下没有任何判定，则视为 Miss
					i.raw.score = 1;
					score.addCombo(1);
					i.raw.isScored = true;
					i.alpha = 0.5;
				}
				
			} else if (noteRaw.type == 4) { // Note 类型为 Flick
				if (noteRaw.score > 0 && timeBetween < 0 && !noteRaw.isProcessed) { // 有判定则播放声音和动画
					i.visible = false;
					score.addCombo(noteRaw.score);
					
					CreateClickAnimation(i, settings.performanceMode);
					if (settings.hitsound) textures.sound.flick.play({volume: settings.hitsoundVolume});
					if (sprites.accIndicator) sprites.accIndicator.pushAccurate(noteRaw.realTime, realTime);
					
					i.raw.isProcessed = true;
					
				} else if (!noteRaw.isProcessed) {
					for (let x = 0; x < this.length; x++) {
						if (
							this[x].isInArea(offsetX, offsetY, cosr, sinr, width) &&
							timeBetweenReal <= global.judgeTimes.good
						) {
							this[x].catched = true;
							if (this[x].type == 3) {
								i.raw.score = 4;
								break;
							}
						}
					}
				}
			}
			
		}
	}
	
	judgeSingleNote(note, notePosition, realTime, width) {
		/***
		 * score = 判定分数。1 = Miss, 2 = Bad, 3 = Good, 4 = Perfect
		 * isScored = 判定处理是否完成
		 * isProcessed = 图像处理是否完成
		 * isPressing = Hold 是否一直被按下
		 * pressTime = 上一次检测判定时被按下的时间
		***/
		if (!stat.isTransitionEnd || stat.isPaused) return;
		
		let timeBetween = note.realTime - realTime,
			timeBetweenReal = timeBetween > 0 ? timeBetween : -timeBetween;
			
		if (note.score > 0 && note.isScored) return; // 如果该 Note 已被打击，则忽略
		// if (timeBetween > global.judgeTimes.bad) return;

		if (timeBetween < -global.judgeTimes.bad) { // 是否 Miss
			if (note.type != 3) {
				score.addCombo(1);
				note.score = 1;
				note.isScored = true;
				
				return;
				
			} else if (note.type === 3 && !note.isPressing) {
				score.addCombo(1);
				note.score = 1;
				note.isScored = true;
				
				return;
			}
		}
		
		let offsetX = notePosition.x,
			offsetY = notePosition.y,
			cosr = notePosition.cosr,
			sinr = notePosition.sinr,
			angle = notePosition.angle;
		
		switch (note.type) {
			case 1: { // Note 类型为 Tap。在这个分支中，判定和动画是一起执行的
				for (let x = 0; x < this.length; x++) { // 合理怀疑这个循环是为了遍历当前屏幕上的手指数
					if (
						this[x].type == 1 &&
						this[x].isInArea(offsetX, offsetY, cosr, sinr, width) &&
						timeBetweenReal <= global.judgeTimes.bad
					) {
						if (timeBetweenReal <= global.judgeTimes.perfect) { // 判定 Perfect
							note.score = 4;
							
						} else if (timeBetweenReal <= global.judgeTimes.good) { // 判定 Good
							note.score = 3;
							
						} else { // 判定 Bad
							note.score = 2;
						}
						
						// 如果 Note 被成功判定，则停止继续检测
						if (note.score > 0) {
							score.addCombo(note.score, timeBetween);
							
							CreateClickAnimation(offsetX, offsetY, angle, note.score, settings.performanceMode);
							PlayHitsound(note, settings.hitsoundVolume);
							if (sprites.ui.game.head.accIndicator) sprites.ui.game.head.accIndicator.pushAccurate(note.realTime, realTime);
							
							note.isScored = true;
							
							this.splice(x, 1);
							return;
						}
						
					}
					
				}
				
				break;
			}
			
			case 2: { // Note 类型为 Drag
				if (note.score > 0 && timeBetween < 0) { // 为已打击的 Note 播放声音与击打动画
					score.addCombo(note.score);
					
					CreateClickAnimation(offsetX, offsetY, angle, note.score, settings.performanceMode);
					PlayHitsound(note, settings.hitsoundVolume);
					if (sprites.ui.game.head.accIndicator) sprites.ui.game.head.accIndicator.pushAccurate(note.realTime, realTime);
					
					note.isScored = true;
					
				} else { // 检测 Note 是否被打击
					for (let x = 0; x < this.length; x++) {
						if (
							this[x].isInArea(offsetX, offsetY, cosr, sinr, width) &&
							timeBetweenReal <= global.judgeTimes.good
						) { 
							this[x].catched = true;
							note.score = 4;
							return;
						}
					}
				}
				
				break;
			}
			
			case 3: { // Note 类型为 Hold
				if (note.score > 2 && note.isPressing && note.pressTime) { // Hold 是否被按下
					// 此处为已被单击的 Hold 持续监听是否一直被按住到 Hold 结束
					if ((realTime - note.pressTime) * note.holdTime >= 16 * note.realHoldTime) { // Note 被按下且还未结束 //间隔时间与bpm成反比，待实测
						CreateClickAnimation(offsetX, offsetY, angle, note.score, settings.performanceMode);
						note.pressTime = realTime;
						
						return;
					}
					
					if (note.realTime + note.realHoldTime - global.judgeTimes.bad < realTime && note.isPressing) { // Note 被按下且已结束
						if (note.score > 0) {
							score.addCombo(note.score, note.accType);
							note.isScored = true;
						}
						
						return;
					}
				}
				
				note.isPressing = false;
				
				for (let x = 0; x < this.length; x++) {
					if (!note.pressTime && !note.isPressing) { // 应该是同上，但是这一块负责的是刚开始打击时的判定
						if (
							this[x].type == 1 &&
							this[x].isInArea(offsetX, offsetY, cosr, sinr, width) &&
							timeBetweenReal < global.judgeTimes.good
						) {
							if (timeBetweenReal <= global.judgeTimes.perfect) { // 判定 Perfect
								note.score = 4;
								
							} else { // 判定 Good，暂时未知如果判定点在 Bad 时是否判定为 Miss
								note.score = 3;
							}
							
							note.isPressing = true;
							note.accType = timeBetween;
							note.pressTime = realTime;
							
							CreateClickAnimation(offsetX, offsetY, angle, note.score, settings.performanceMode);
							PlayHitsound(note, settings.hitsoundVolume);
							if (sprites.ui.game.head.accIndicator) sprites.ui.game.head.accIndicator.pushAccurate(note.realTime, realTime);
							
							this.splice(x, 1);
							return;
						}
						
					} else if (note.score > 2 && this[x].isInArea(offsetX, offsetY, cosr, sinr, width)) {
						note.isPressing = true; // 持续判断手指是否在判定区域内
					}
				}
				
				if (!stat.isPaused && note.score > 0 && !note.isPressing && !note.pressTime) { // 如果在没有暂停的情况下没有任何判定，则视为 Miss
					score.addCombo(1);
					note.score = 1;
					note.isScored = true;
					
					return;
				}
				
				break;
			}
			
			case 4: { // Note 类型为 Flick
				if (note.score > 0 && timeBetween < 0) { // 有判定则播放声音和动画
					score.addCombo(note.score);
					
					CreateClickAnimation(offsetX, offsetY, angle, note.score, settings.performanceMode);
					PlayHitsound(note, settings.hitsoundVolume);
					if (sprites.ui.game.head.accIndicator) sprites.ui.game.head.accIndicator.pushAccurate(note.realTime, realTime);
					
					note.isScored = true;
					
					return;
					
				} else {
					for (let x = 0; x < this.length; x++) {
						if (
							this[x].isInArea(offsetX, offsetY, cosr, sinr, width) &&
							timeBetweenReal <= global.judgeTimes.good
						) {
							this[x].catched = true;
							if (this[x].type == 3) {
								note.score = 4;
								return;
							}
						}
					}
				}
				
				break;
			}
			
			default: {
				throw new error('一个不被支持的 Note 类型：' + note.type);
			}
		}
		
	}
}