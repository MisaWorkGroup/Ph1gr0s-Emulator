/***
 * 本文件将魔改 console.warn() 与 console.error() 方法，使 warn 和 error 可以
 * 以 dom 的形式直接显示在网页上。
***/
console.oldWarn = console.warn;
console.oldError = console.error;

console.msg = [];

console.warn = function(text, raw) {
	let msgBoxDom = document.getElementById('msg-box');
	let msgBoxContent = msgBoxDom.getElementsByClassName('mdui-dialog-content')[0];
	let msgId = -1;
	
	if (console.msg.length <= 0) {
		msgBoxContent.innerHTML = '';
	}
	
	console.oldWarn(text);
	if (raw) console.oldWarn(raw);
	msgId = this.msg.push(text) - 1;
	
	
	msgBoxContent.innerHTML = '<div class="mdui-card mdui-shadow-0 mdui-m-b-1 mdui-color-orange-100" id="msg-id-' + msgId + '">' +
		'<div class="mdui-card-content mdui-p-b-0"><p style="margin-top:0;"><i class="mdui-icon material-icons mdui-m-r-1">&#xe002;</i>' + text + '</p>' +
		(raw ? '<pre style="margin-bottom:0;font-size:14px;overflow;auto;">' + raw.message + '\n' + raw.stack + '</pre>' : '') +
		'</div><div class="mdui-card-actions">' +
		'<button onclick="console.deleteMsg(' + msgId + ')" class="mdui-btn mdui-ripple mdui-float-right">忽略</button>' +
		'</div></div>' + msgBoxContent.innerHTML;
	
	if (mdui.$('#msg-btn').hasClass('mdui-fab-hide'))
		mdui.$('#msg-btn').removeClass('mdui-fab-hide');
}

console.error = function(text, raw) {
	let msgBoxDom = document.getElementById('msg-box');
	let msgBoxContent = msgBoxDom.getElementsByClassName('mdui-dialog-content')[0];
	let msgId = -1;
	
	if (console.msg.length <= 0) {
		msgBoxContent.innerHTML = '';
	}
	
	console.oldError(text);
	if (raw) console.oldError(raw);
	msgId = this.msg.push(text) - 1;
	
	msgBoxContent.innerHTML = '<div class="mdui-card mdui-shadow-0 mdui-m-b-1 mdui-color-deep-orange-a700" id="msg-id-' + msgId + '">' +
		'<div class="mdui-card-content mdui-p-b-0"><p style="margin-top:0;"><i class="mdui-icon material-icons mdui-m-r-1">&#xe000;</i>' + text + '</p>' +
		(raw ? '<pre style="margin-bottom:0;font-size:14px;overflow:auto">' + raw.message + '\n' + raw.stack + '</pre>' : '') +
		'</div><div class="mdui-card-actions">' +
		'<button onclick="console.deleteMsg(' + msgId + ')" class="mdui-btn mdui-ripple mdui-float-right">忽略</button>' +
		'</div></div>' + msgBoxContent.innerHTML;
	
	mdui.confirm(
		text + (raw ? '<pre style="margin-bottom:0;font-size:14px;overflow:auto">' + raw.message + '\n' + raw.stack + '</pre>' : ''),
		'出错啦！',
		() => { console.deleteMsg(msgId) },
		() => {},
		{
			confirmText: '忽略',
			cancelText: '关闭'
		}
	);
	
	if (mdui.$('#msg-btn').hasClass('mdui-fab-hide'))
		mdui.$('#msg-btn').removeClass('mdui-fab-hide');
}

console.openMsgBox = () => {
	let dialogInit = new mdui.Dialog('#msg-box');
	dialogInit.open();
};

console.deleteMsg = (id) => {
	let dialogInst = new mdui.Dialog('#msg-box');
	mdui.$('#msg-id-' + id).remove();
	console.msg.splice(id, 1);
	
	if (console.msg.length <= 0) {
		let msgBoxDom = document.getElementById('msg-box');
		let msgBoxContent = msgBoxDom.getElementsByClassName('mdui-dialog-content')[0];
		
		msgBoxContent.innerHTML = '<div class="mdui-text-center mdui-text-color-theme-disabled">还没有新信息哦</div>';
		
		if (!mdui.$('#msg-btn').hasClass('mdui-fab-hide'))
			mdui.$('#msg-btn').addClass('mdui-fab-hide');
	}
	
	mdui.mutation('#msg-box');
	dialogInst.handleUpdate();
}