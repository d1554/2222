// ==UserScript==
// @name         车机下一首映射为S键
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  捕获 MediaSession 的 nexttrack 事件，模拟键盘按键 S (KeyCode 83)
// @author       Gemini
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log("【车机映射脚本】已加载，等待媒体播放...");

    // 核心功能：模拟 S 键按下和抬起
    function triggerSKey() {
        const keyConfig = {
            key: 's',
            code: 'KeyS',
            keyCode: 83,
            which: 83,
            bubbles: true,     // 必须冒泡，否则网页捕获不到
            cancelable: true,
            composed: true
        };

        // 1. 创建事件对象
        const downEvent = new KeyboardEvent('keydown', keyConfig);
        const upEvent = new KeyboardEvent('keyup', keyConfig);

        // 2. 派发事件
        // 优先派发给 body 或 activeElement，确保网页能收到
        const target = document.activeElement || document.body;
        
        console.log("【车机映射脚本】捕获到下一首指令 -> 模拟按键 S");
        target.dispatchEvent(downEvent);
        
        // 稍微延迟抬起按键，更像真实人类操作
        setTimeout(() => {
            target.dispatchEvent(upEvent);
        }, 50);
    }

    // 注册 Media Session API
    function registerMediaSession() {
        if ('mediaSession' in navigator) {
            
            // 必须设置 metadata，否则部分车机认为当前没有媒体在播放，不显示控制按钮
            navigator.mediaSession.metadata = new MediaMetadata({
                title: '车载控制模式',
                artist: '按键映射中',
                album: 'Script Active',
                artwork: [
                    { src: 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/png' }
                ]
            });

            // 监听“下一首”动作
            navigator.mediaSession.setActionHandler('nexttrack', function() {
                triggerSKey();
            });

            // 建议同时也监听“上一首”，防止车机报错
            navigator.mediaSession.setActionHandler('previoustrack', function() {
                console.log("【车机映射脚本】上一首 (未映射)");
            });

            console.log("【车机映射脚本】MediaSession 监听器注册成功！");
        }
    }

    // 某些网页加载较慢，或音频元素是动态创建的
    // 我们通过监听音频播放事件来确保注册成功
    document.addEventListener('play', (e) => {
        // 当网页开始播放声音时，立即刷新注册信息，确保获得焦点
        registerMediaSession();
    }, true);

    // 初始化尝试注册一次
    registerMediaSession();

})();
