// ==UserScript==

// @name 视频自动解除静音 (针对播放/暂停操作)

// @namespace http://tampermonkey.net/

// @version 1.0

// @description 无论通过点击还是按键触发播放，都会自动取消静音并恢复音量

// @author Gemini

// @match https://www.douyin.com/*

// @match https://live.douyin.com/*

// @match https://www.bilibili.com/*

// @grant none

// ==/UserScript==



(function() {

'use strict';



console.log("自动解除静音脚本已启动");



/**

* 核心逻辑：尝试解除静音

* @param {HTMLMediaElement} videoElement

*/

function unmuteVideo(videoElement) {

// 1. 解除静音状态

if (videoElement.muted) {

videoElement.muted = false;

console.log("已检测到静音，强制解除静音");

}

// 2. 恢复音量 (如果音量为0，强制设为 50%)

if (videoElement.volume === 0) {

videoElement.volume = 0.5;

console.log("音量为0，强制恢复为 50%");

}

}



// 监听所有媒体元素的 'play' 事件 (使用捕获阶段 true，以支持动态加载的视频)

document.addEventListener('play', (e) => {

if (e.target instanceof HTMLMediaElement) {

unmuteVideo(e.target);

}

}, true);



// 额外监听空格键 (Space) - 防止部分网页按空格播放时不触发标准 play 事件

document.addEventListener('keydown', (e) => {

if (e.code === 'Space') {

const videos = document.querySelectorAll('video');

videos.forEach(video => {

// 仅处理可见或正在播放的视频

if (!video.paused || video.getBoundingClientRect().height > 0) {

unmuteVideo(video);

}

});

}

}, true);



})();
