'use strict';
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
 *         Tap: 在该判定点上存在点击事件。此事件应该用于 Tap 的判定
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
	// hw 是 Note 宽度，暂时未知是否也需要旋转
	isInArea(x, _y, cosr, sinr, hw, keyCode = 0) {
		let y = -_y;
		let offsetY = -this.offsetY;
		let realX = x + (this.offsetX - x) * cosr - (offsetY - y) * sinr;
		let noteHalfWidth = Math.ceil(hw / 2) + 4;
		
		return x - noteHalfWidth <= realX && realX <= x + noteHalfWidth;
		
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
				if (i.score > 0 && (i.isProcessed || i.isScored)) continue;
				
				let offsetX = i.getGlobalPosition().x;
				let offsetY = i.getGlobalPosition().y;
				
				if (i.type == 1) {
					if (i.realTime - realTime < 0.0) this.push(new Judgement(offsetX, offsetY, 1));
				} else if (i.type == 2) {
					if (i.realTime - realTime < 0.2) this.push(new Judgement(offsetX, offsetY, 2));
				} else if (i.type == 3) {
					if (i.isPressing) this.push(new Judgement(offsetX, offsetY, 2));
					else if (i.realTime - realTime < 0.0) this.push(new Judgement(offsetX, offsetY, 1));
				} else if (i.type == 4) {
					if (i.realTime - realTime < 0.2) this.push(new Judgement(offsetX, offsetY, 3));
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
			let offsetX = i.getGlobalPosition().x,
				offsetY = i.getGlobalPosition().y,
				cosr = i.parent.parent.cosr,
				sinr = i.parent.parent.sinr;
			
			let timeBetween = i.realTime - realTime,
				timeBetweenReal = timeBetween > 0 ? timeBetween : -timeBetween;
			
			if (i.score > 0 && i.isProcessed) continue; // 如果该 Note 已被打击，则忽略
			
			if (timeBetween < -global.judgeTimes.bad && !(i.isProcessed || i.isPressing) && !i.isScored) { // 是否 Miss
				score.addCombo(1);
				i.score = 1;
				i.isProcessed = true;
				i.isScored = true;
				
				if (i.type == 3) {
					i.alpha = 0.5;
					i.isProcessed = false;
				}
				
			} else if (i.type == 1) { // Note 类型为 Tap。在这个分支中，判定和动画是一起执行的
				for (let x = 0; x < this.length; x++) { // 合理怀疑这个循环是为了遍历当前屏幕上的手指数
					if (
						this[x].type == 1 &&
						this[x].isInArea(offsetX, offsetY, cosr, sinr, i.width) &&
						timeBetweenReal <= global.judgeTimes.bad &&
						!i.isProcessed
					) {
						if (timeBetweenReal <= global.judgeTimes.perfect) { // 判定 Perfect
							i.score = 4;
							i.accType = timeBetween;
							
							CreateClickAnimation(i, settings.performanceMode);
							
						} else if (timeBetweenReal <= global.judgeTimes.good) { // 判定 Good
							i.score = 3;
							i.accType = timeBetween;
							
							CreateClickAnimation(i, settings.performanceMode);
							
						} else if (timeBetweenReal <= global.judgeTimes.bad) { // 判定 Bad
							if (!this[x].catched) {
								i.score = 2;
								i.accType = timeBetween; // 判定是 Early 还是 Late
								
								CreateClickAnimation(i, settings.performanceMode);
							}
						}
						
						// 如果 Note 被成功判定，则停止继续检测
						if (i.score > 0 && !i.isProcessed) {
							score.addCombo(i.score, i.accType);
							i.visible = false;
							
							if (settings.hitsound && i.score > 2) textures.sound.tap.play({volume: settings.hitsoundVolume});
							if (sprites.accIndicator) sprites.accIndicator.pushAccurate(i.realTime, realTime);
							
							i.isProcessed = true;
							
							this.splice(x, 1);
							break;
						}
						
					}
					
				}
				
			} else if (i.type == 2) { // Note 类型为 Drag
				if (i.score > 0 && timeBetween < 0 && !i.isProcessed) { // 为已打击的 Note 播放声音与击打动画
					score.addCombo(i.score);
					i.visible = false;
					
					if (settings.hitsound) textures.sound.drag.play({volume: settings.hitsoundVolume});
					CreateClickAnimation(i, settings.performanceMode);
					if (sprites.accIndicator) sprites.accIndicator.pushAccurate(i.realTime, realTime);
					
					i.isProcessed = true;
					
				} else if (!i.isProcessed) { // 检测 Note 是否被打击
					for (let x = 0; x < this.length; x++) {
						if (
							this[x].isInArea(offsetX, offsetY, cosr, sinr, i.width) &&
							timeBetweenReal <= global.judgeTimes.good
						) { 
							this[x].catched = true;
							i.score = 4;
							break;
						}
					}
				}
				
			} else if (i.type == 3) { // Note 类型为 Hold
				if (i.isPressing && i.pressTime) { // Hold 是否被按下
					// 此处为已被单击的 Hold 持续监听是否一直被按住到 Hold 结束
					if ((Date.now() - i.pressTime) * i.holdTime >= 1.6e4 * i.realHoldTime && !i.isScored) { // Note 被按下且还未结束 //间隔时间与bpm成反比，待实测
						CreateClickAnimation(i, settings.performanceMode);
						i.pressTime = Date.now();
					}
					
					if (i.realTime + i.realHoldTime - global.judgeTimes.bad < realTime && i.isPressing) { // Note 被按下且已结束
						if (i.score > 0 && !i.isScored) {
							score.addCombo(i.score, i.accType);
							i.isScored = true;
						}
						if (i.realTime + i.realHoldTime < realTime) {
							i.visible = false;
							i.isProcessed = true;
						}
						continue;
					}
				}
				
				i.isPressing = false;
				
				for (let x = 0; x < this.length; x++) {
					if (!i.pressTime && !i.isPrecessed && !i.isScored) { // 应该是同上，但是这一块负责的是刚开始打击时的判定
						if (
							this[x].type == 1 &&
							this[x].isInArea(offsetX, offsetY, cosr, sinr, i.width) &&
							timeBetweenReal < global.judgeTimes.good
						) {
							if (timeBetweenReal <= global.judgeTimes.perfect) { // 判定 Perfect
								i.score = 4;
								CreateClickAnimation(i, settings.performanceMode);
								
							} else if (timeBetweenReal <= global.judgeTimes.good) { // 判定 Good，暂时未知如果判定点在 Bad 时是否判定为 Miss
								i.score = 3;
								CreateClickAnimation(i, settings.performanceMode);
							}
							
							i.isPressing = true;
							i.accType = timeBetween;
							i.pressTime = Date.now();
							
							if (settings.hitsound) textures.sound.tap.play({volume: settings.hitsoundVolume});
							if (sprites.accIndicator) sprites.accIndicator.pushAccurate(i.realTime, realTime);
							
							this.splice(x, 1);
							break;
						}
						
					} else if (!i.isScored && !i.isProcessed && this[x].isInArea(offsetX, offsetY, cosr, sinr, i.width)) {
						i.isPressing = true; // 持续判断手指是否在判定区域内
					}
				}
				
				if (!stat.isPaused && i.score > 0 && !i.isPressing && !i.pressTime && !i.isScored) { // 如果在没有暂停的情况下没有任何判定，则视为 Miss
					i.score = 1;
					score.addCombo(1, i.accType);
					i.isScored = true;
					i.alpha = 0.5;
				}
				
			} else if (i.type == 4) { // Note 类型为 Flick
				if (i.score > 0 && timeBetween < 0 && !i.isProcessed) { // 有判定则播放声音和动画
					i.visible = false;
					score.addCombo(i.score);
					
					if (settings.hitsound) textures.sound.flick.play({volume: settings.hitsoundVolume});
					CreateClickAnimation(i, settings.performanceMode);
					if (sprites.accIndicator) sprites.accIndicator.pushAccurate(i.realTime, realTime);
					
					i.isProcessed = true;
					
				} else if (!i.isProcessed) {
					for (let x = 0; x < this.length; x++) {
						if (
							this[x].isInArea(offsetX, offsetY, cosr, sinr, i.width) &&
							timeBetweenReal <= global.judgeTimes.good
						) {
							this[x].catched = true;
							if (this[x].type == 3) {
								i.score = 4;
								break;
							}
						}
					}
				}
			}
			
		}
	}
}