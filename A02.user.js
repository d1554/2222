// ==UserScript==
// @name         MediaSession 信号侦探
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  专门用于测试车机是否通过 MediaSession 发送了“下一首”指令
// @author       Gemini
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 创建屏幕显示面板 (UI) ---
    const box = document.createElement('div');
    box.style.cssText = `
        position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
        width: 80%; padding: 20px; background: rgba(0, 0, 0, 0.9);
        color: #00ff00; font-size: 24px; font-weight: bold; font-family: monospace;
        z-index: 999999; border: 2px solid #00ff00; border-radius: 10px;
        text-align: center; pointer-events: none;
    `;
    box.innerHTML = '🕵️‍♂️ 侦探已就位<br><span style="font-size:16px;color:#fff">请播放视频/音频，然后按方向盘按键</span>';
    document.body.appendChild(box);

    // 辅助函数：更新屏幕日志
    function log(msg, color = '#00ff00') {
        const time = new Date().toLocaleTimeString();
        box.innerHTML = `<span style="color:#aaa">[${time}]</span> <br> <span style="color:${color}; font-size: 30px">${msg}</span>`;
        console.log(`【MediaSession侦探】${msg}`);
        
        // 闪烁一下边框表示收到信号
        box.style.borderColor = color;
        setTimeout(() => box.style.borderColor = '#00ff00', 300);
    }

    // --- 2. 注册 MediaSession ---
    function setupDetective() {
        if (!('mediaSession' in navigator)) {
            log("❌ 当前浏览器不支持 MediaSession API", "red");
            return;
        }

        try {
            // A. 伪造元数据 (Metadata)
            // 很多车机如果看不到这些信息，会把按键禁用
            navigator.mediaSession.metadata = new MediaMetadata({
                title: '按键测试模式',
                artist: '正在侦听信号...',
                album: 'Debug Tool',
                artwork: [{ src: 'https://via.placeholder.com/128', sizes: '128x128', type: 'image/png' }]
            });

            // B. 监听所有可能的动作
            const actions = ['play', 'pause', 'previoustrack', 'nexttrack', 'stop', 'seekbackward', 'seekforward'];
            
            actions.forEach(action => {
                try {
                    navigator.mediaSession.setActionHandler(action, function(details) {
                        // 收到信号了！
                        if (action === 'nexttrack') {
                            log("✅ 捕获成功：下一首 (Next Track)", "#ffff00"); // 黄色高亮
                        } else if (action === 'previoustrack') {
                            log("✅ 捕获成功：上一首 (Prev Track)", "#00ffff");
                        } else {
                            log(`捕获动作: ${action}`);
                        }
                    });
                } catch (e) {
                    console.warn(`不支持监听 ${action}`);
                }
            });

            // C. 强制状态为播放中
            navigator.mediaSession.playbackState = "playing";
            console.log("【MediaSession侦探】监听器注册完毕");

        } catch (e) {
            log("注册失败: " + e.message, "red");
        }
    }

    // --- 3. 激活机制 ---
    // MediaSession 通常需要页面真的在播放声音时才会生效
    // 我们监听页面的播放事件，一旦用户开始播放，立刻刷新侦探状态
    window.addEventListener('play', () => {
        setupDetective();
        log("🎵 检测到播放，正在抢占音频焦点...");
    }, true);

    // 初始化运行一次
    setupDetective();

})();
