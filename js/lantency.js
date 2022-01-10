var Loader = new PIXI.Loader;
var Ticker = new PIXI.Ticker;
var Sound = PIXI.sound.Sound;

const tickerTimeBPM = 80;

var sounds = {}; // 存放声音素材

var playHitsound = false;

var tickerTimeStarted          = false;
var tickerTimeIndex            = 0
var tickerTimeEqualizer        = 0;
var tickerTimes                = [];
var tickerTimesInput           = [];
var tickerTimesAverageLantency = 0;



// ========此处声明事件监听器========
document.getElementById('btn-tap').addEventListener('touchstart', (e) => {
	if (!tickerTimeStarted) return;
	
	e.preventDefault();
	
	// console.log(Date.now() - tickerTimes[tickerTimeIndex]);
	tickerTimesInput.push(Date.now() - tickerTimes[tickerTimeIndex]);
	if (playHitsound) sounds.drag.play();
	
}, { passive: false } );

document.getElementById('btn-tap').addEventListener('mousedown', (e) => {
	if (!tickerTimeStarted) return;
	
	e.preventDefault();
	
	// console.log(Date.now() - tickerTimes[tickerTimeIndex]);
	tickerTimesInput.push(Date.now() - tickerTimes[tickerTimeIndex]);
	if (playHitsound) sounds.drag.play();
	
}, { passive: false } );

document.getElementById('btn-tap').addEventListener('keydown', (e) => {
	if (!tickerTimeStarted) return;
	if (e.key != 'F') return;
	
	e.preventDefault();
	
	// console.log(Date.now() - tickerTimes[tickerTimeIndex]);
	tickerTimesInput.push(Date.now() - tickerTimes[tickerTimeIndex]);
	if (playHitsound) sounds.drag.play();
	
}, { passive: false } );



// ========此处进行初始化========
Loader.add([
		{ name: 'tap',   url: './sound/Hitsound-Tap.ogg' },
		{ name: 'drag',  url: './sound/Hitsound-Drag.ogg' },
		{ name: 'flick', url: './sound/Hitsound-Flick.ogg' }
	])
	.load(function (event) {
		for (let name in event.resources) {
			sounds[name] = event.resources[name].sound;
		}
		
		document.getElementById('btn-lantency-test-start').innerHTML = '开始测试<i class="mdui-icon material-icons">&#xe037;</i>';
		document.getElementById('btn-lantency-test-start').disabled = false;
	}
);



// ========此处声明函数========
function startLantencyTest() {
	if (tickerTimeStarted) return;
	
	if (
		!sounds.tap || !sounds.flick || !sounds.drag ||
		!sounds.tap.isLoaded || !sounds.flick.isLoaded || !sounds.drag.isLoaded
	) {
		mdui.alert('声音资源正在初始化中，请稍等片刻', '前方高能');
		return;
	}
	
	document.getElementById('div-lantency-start').classList.add('mdui-hidden');
	document.getElementById('div-lantency-test').classList.remove('mdui-hidden');
	
	let tickerTimePlayed = false;
	let lastTickerTimesInputLength = 0;
	
	tickerTimes = [
		Date.now() + (60 / tickerTimeBPM) * 1000 * 1,
		Date.now() + (60 / tickerTimeBPM) * 1000 * 2,
		Date.now() + (60 / tickerTimeBPM) * 1000 * 3,
		Date.now() + (60 / tickerTimeBPM) * 1000 * 4
	];
	
	Ticker.add(() => {
		let tickerCurrentTime = Date.now();
		
		// 检测时间，播放声音，并计算程序补偿时间
		if (tickerCurrentTime >= tickerTimes[tickerTimeIndex] && !tickerTimePlayed) {
			tickerTimePlayed = true;
			tickerTimeEqualizer = tickerTimes[tickerTimeIndex] - tickerCurrentTime;
			
			// console.log(tickerTimeIndex, tickerCurrentTime, tickerTimes[tickerTimeIndex], tickerTimeEqualizer);
			
			if (tickerTimeIndex == 0) {
				sounds.flick.play();
			} else {
				sounds.tap.play();
			}
		}
		
		// 计算下一节拍的时间，并应用程序补偿时间
		if (tickerCurrentTime >= tickerTimes[tickerTimeIndex] + ((60 / tickerTimeBPM) * 1000 / 2)) {
			tickerTimes[tickerTimeIndex] += (60 / tickerTimeBPM) * 1000 * 4;
			tickerTimePlayed = false;
			
			if (tickerTimeIndex < 3) {
				tickerTimeIndex += 1;
			} else {
				tickerTimeIndex = 0;
			}
			
			if (tickerTimesInput.length != lastTickerTimesInputLength) {
				for (let i = 0, length = tickerTimesInput.length - lastTickerTimesInputLength; i < length; i++) {
					tickerTimesInput[lastTickerTimesInputLength + i] -= tickerTimeEqualizer;
				}
				
				lastTickerTimesInputLength = tickerTimesInput.length;
			}
			
			if (tickerTimeIndex == 0) {
				tickerTimesAverageLantency = CalculateAverage(tickerTimesInput).toFixed(0);
				document.getElementById('text-average-lantency').innerHTML = tickerTimesAverageLantency;
			}
		}
	});
	
	Ticker.start();
	tickerTimeStarted = true;
}

function CalculateAverage(array) {
	let output = 0;
	
	if (!(array instanceof Array)) return null;
	if (array.length <= 0) return 0;
	
	for (let num of array) {
		output += num;
	}
	
	return output / array.length;
}