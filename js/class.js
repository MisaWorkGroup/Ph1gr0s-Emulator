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
	constructor(offsetX, offsetY) {
		this.offsetX = Number(offsetX);
		this.offsetY = Number(offsetY);
		this.isMoving = false;
		this.time = 0;
	}
	
	/***
	 * 该静态方法用于判断输入的坐标是否为四个角，如是则触发 specialCick
	 * 无论是否触发 specialClick 该方法都会返回一个新的 Click 并将其 push 到 taps 数组内。
	***/
	static activate(offsetX, offsetY) {
		inputs.push(new Click(offsetX, offsetY));
		/**
		// 左上角判断
		if (offsetX < lineScale * 1.5 &&
			offsetY < lineScale * 1.5)
		{
			specialClick.click(0);
		}
		
		// 右上角判断
		if (offsetX > canvasos.width - lineScale * 1.5 &&
			offsetY < lineScale * 1.5)
		{
			specialClick.click(1);
		}
		
		// 左下角判断
		if (offsetX < lineScale * 1.5 &&
			offsetY > canvasos.height - lineScale * 1.5)
		{
			specialClick.click(2);
		}
		
		// 右下角判断
		if (offsetX > canvasos.width - lineScale * 1.5 &&
			offsetY > canvasos.height - lineScale * 1.5)
		{
			specialClick.click(3);
		}
		**/
		
		return new Click(offsetX, offsetY);
	}
	
	// 猜测当手指在移动时会调用此函数。
	// 备忘录：mousemove、touchmove 中调用了该方法
	move(offsetX, offsetY) {
		this.offsetX = Number(offsetX);
		this.offsetY = Number(offsetY);
		this.isMoving = true;
		this.time = 0;
	}
	
	// 暂时未知。推测该方法用于标明该点击的类型
	// 备忘录：calcqwq() 函数中调用了此方法
	animate() {
		if (!this.time++) { // 先判断 time 是否为 0，再自增
			if (this.isMoving) {
				clickEvents0.push(ClickEvent0.getClickMove(this.offsetX, this.offsetY));
			} else {
				clickEvents0.push(ClickEvent0.getClickTap(this.offsetX, this.offsetY));
			}
			
		} else {
			clickEvents0.push(ClickEvent0.getClickHold(this.offsetX, this.offsetY));
		}
	}
}

/***
 * 猜测该类为 Note 的判定服务。
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
	isInArea(x, y, cosr, sinr, hw) {
		return isNaN(this.offsetX + this.offsetY) ? true : Math.abs((this.offsetX - x) * cosr + (this.offsetY - y) * sinr) <= hw;
	}
}

// 猜测该类为 Note 的判定服务，应该是 Judgement 的数组形式。
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
		
		if (!autoplay.checked) { // 判断是否开启了自动演示
			for (let i in inputs.mouse) { // 遍历鼠标点击事件
				let click = inputs.mouse[i];
				
				if (click instanceof Click) {
					if (click.time) {
						this.push(new Judgement(click.offsetX, click.offsetY, 2));
					} else if (i.isMoving) {
						this.push(new Judgement(i.offsetX, i.offsetY, 3));
					}
					//else this.push(new Judgement(i.offsetX, i.offsetY, 1));
				}
			}
			
			for (let i in inputs.touch) { // 遍历触摸事件
				let touch = inputs.touch[i];
				
				if (touch instanceof Click) {
					if (touch.time) this.push(new Judgement(touch.offsetX, touch.offsetY, 2));
					else if (touch.isMoving) this.push(new Judgement(touch.offsetX, touch.offsetY, 3));
					//else this.push(new Judgement(i.offsetX, i.offsetY, 1));
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
			
			for (let tap of inputs.taps) { // 遍历触摸单击事件
				if (tap instanceof Click) this.push(new Judgement(tap.offsetX, tap.offsetY, 1));
			}
			
		} else { // 如果开启了自动演示，则自动添加判定点
			
			for (const i of notes) {
				if (i.scored) continue;
				
				if (i.type == 1) {
					if (i.realTime - realTime < 0.0) this.push(new Judgement(i.offsetX, i.offsetY, 1));
				} else if (i.type == 2) {
					if (i.realTime - realTime < 0.2) this.push(new Judgement(i.offsetX, i.offsetY, 2));
				} else if (i.type == 3) {
					if (i.status3) this.push(new Judgement(i.offsetX, i.offsetY, 2));
					else if (i.realTime - realTime < 0.0) this.push(new Judgement(i.offsetX, i.offsetY, 1));
				} else if (i.type == 4) {
					if (i.realTime - realTime < 0.2) this.push(new Judgement(i.offsetX, i.offsetY, 3));
				}
			}
		}
	};
	
	// 计算 Note 的判定
	judgeNote(notes, realTime, width) {
		for (const i of notes) { // 遍历所有 Note
			if (i.scored) continue; // 如果该 Note 已被打击，则忽略
			
			if (i.realTime - realTime < -0.16 && !i.status2) { // 是否 Miss
				//console.log("Miss", i.name);
				i.status = 4;
				stat.addCombo(4, i.type);
				i.scored = true;
				
			} else if (i.type == 1) { // Note 类型为 Tap。在这个分支中，判定和动画是一起执行的
				for (let j = 0; j < this.length; j++) { // 合理怀疑这个循环是为了遍历当前屏幕上的手指数
					if (this[j].type == 1 && this[j].isInArea(i.offsetX, i.offsetY, i.cosr, i.sinr, width) && i.realTime - realTime < 0.2 && i.realTime - realTime > -0.16) { // 推测该判定分支是为了当 Note 在画面内时才继续
						if (i.realTime - realTime > 0.16) { // 判定 Bad
							//console.log("Bad", i.name);
							if (!this[j].catched) {
								i.status = 3;
								i.badtime = Date.now();
							}
							
						} else if (i.realTime - realTime > 0.08) { // 判定 Good(Early)
							//console.log("Good(Early)", i.name);
							i.status = 2;
							if (document.getElementById("hitSong").checked) playSound(res["HitSong0"], false, true, 0);
							clickEvents1.push(ClickEvent1.getClickGood(i.projectX, i.projectY));
							
						} else if (i.realTime - realTime > -0.08) { // 判定 Perfect
							//console.log("Perfect", i.name);
							i.status = 1;
							if (document.getElementById("hitSong").checked) playSound(res["HitSong0"], false, true, 0);
							clickEvents1.push(ClickEvent1.getClickPerfect(i.projectX, i.projectY));
							
						} else { // 判定 Good(Late)
							//console.log("Good(Late)", i.name);
							i.status = 2;
							if (document.getElementById("hitSong").checked) playSound(res["HitSong0"], false, true, 0);
							clickEvents1.push(ClickEvent1.getClickGood(i.projectX, i.projectY));
						}
						
						// 如果 Note 被成功判定，则停止继续检测
						if (i.status) {
							stat.addCombo(i.status, 1);
							i.scored = true;
							this.splice(j, 1);
							break;
						}
					}
				}
				
			} else if (i.type == 2) { // Note 类型为 Drag
				if (i.status == 1 && i.realTime - realTime < 0) { // 为已打击的 Note 播放声音与击打动画
					if (document.getElementById("hitSong").checked) playSound(res["HitSong1"], false, true, 0);
					clickEvents1.push(ClickEvent1.getClickPerfect(i.projectX, i.projectY));
					stat.addCombo(1, 2);
					i.scored = true;
					
				} else if (!i.status) { // 检测 Note 是否被打击
					for (let j = 0; j < this.length; j++) {
						if (this[j].isInArea(i.offsetX, i.offsetY, i.cosr, i.sinr, width) && i.realTime - realTime < 0.16 && i.realTime - realTime > -0.16) {
							//console.log("Perfect", i.name);
							this[j].catched = true;
							i.status = 1;
							break;
						}
					}
				}
				
			} else if (i.type == 3) { // Note 类型为 Hold
				if (i.status3) { // Hold 是否被按下
					// 这一块应该是只负责 Body 的打击动画
					if ((Date.now() - i.status3) * i.holdTime >= 1.6e4 * i.realHoldTime) { // Note 被按下且还未结束 //间隔时间与bpm成反比，待实测
						if (i.status2 == 1) clickEvents1.push(ClickEvent1.getClickPerfect(i.projectX, i.projectY));
						else if (i.status2 == 2) clickEvents1.push(ClickEvent1.getClickGood(i.projectX, i.projectY));
						i.status3 = Date.now();
					}
					
					if (i.realTime + i.realHoldTime - 0.2 < realTime) { // Note 被按下且已结束
						if (!i.status) stat.addCombo(i.status = i.status2, 3);
						if (i.realTime + i.realHoldTime < realTime) i.scored = true;
						continue;
					}
				}
				
				i.status4 = true;
				
				for (let j = 0; j < this.length; j++) {
					if (!i.status3) { // 应该是同上，但是这一块负责的是刚开始打击时的判定
						if (this[j].type == 1 && this[j].isInArea(i.offsetX, i.offsetY, i.cosr, i.sinr, width) && i.realTime - realTime < 0.16 && i.realTime - realTime > -0.16) {
							if (document.getElementById("hitSong").checked) playSound(res["HitSong0"], false, true, 0);
							
							if (i.realTime - realTime > 0.08) { // 判定 Good(Early)
								//console.log("Good(Early)", i.name);
								i.status2 = 2;
								clickEvents1.push(ClickEvent1.getClickGood(i.projectX, i.projectY));
								i.status3 = Date.now();
								
							} else if (i.realTime - realTime > -0.08) { // 判定 Perfect
								//console.log("Perfect", i.name);
								i.status2 = 1;
								clickEvents1.push(ClickEvent1.getClickPerfect(i.projectX, i.projectY));
								i.status3 = Date.now();
								
							} else { // 判定 Good(Late)
								//console.log("Good(Late)", i.name);
								i.status2 = 2;
								clickEvents1.push(ClickEvent1.getClickGood(i.projectX, i.projectY));
								i.status3 = Date.now();
							}
							
							this.splice(j, 1);
							i.status4 = false;
							break;
						}
						
					} else if (this[j].isInArea(i.offsetX, i.offsetY, i.cosr, i.sinr, width)) i.status4 = false; // 如果已经被判定了，则忽略
				}
				
				if (!isPaused && i.status3 && i.status4) { // 如果在没有暂停的情况下没有任何判定，则视为 Miss
					//console.log("Miss", i.name);
					i.status = 4;
					stat.addCombo(4, 3);
					i.scored = true;
				}
				
			} else if (i.type == 4) { // Note 类型为 Flick
				if (i.status == 1 && i.realTime - realTime < 0) { // 有判定则播放声音和动画
					if (document.getElementById("hitSong").checked) playSound(res["HitSong2"], false, true, 0);
					clickEvents1.push(ClickEvent1.getClickPerfect(i.projectX, i.projectY));
					stat.addCombo(1, 4);
					i.scored = true;
					
				} else if (!i.status) {
					for (let j = 0; j < this.length; j++) {
						// 这里懒得写了
						if (this[j].isInArea(i.offsetX, i.offsetY, i.cosr, i.sinr, width) && i.realTime - realTime < 0.16 && i.realTime - realTime > -0.16) {
							//console.log("Perfect", i.name);
							this[j].catched = true;
							if (this[j].type == 3) {
								i.status = 1;
								break;
							}
						}
					}
				}
			}
		}
	}
}