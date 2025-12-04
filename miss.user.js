// ==UserScript==
// @name         MissAV AutoPlay Only (Sound First)
// @name:zh-CN   MissAV 纯净自动播放 (优先有声)
// @description  仅保留自动播放核心功能：优先有声播放，拦截则静音播放并点击恢复。音量90%。
// @match        https://missav123.com/*
// @match        https://missav.ws/*
// @match        https://missav.live/*
// @match        https://missav.ai/*
// @match        https://missav.com/*
// @match        https://thisav.com/*
// @grant        none
// @run-at       document-end
// @license      MIT
// @version      2025.12.04.PurePlay
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        volume: 0.9,       // 目标音量 90%
        checkInterval: 500 // 检测播放器的频率 (ms)
    };

    // 核心播放逻辑
    function tryAutoPlay(player) {
        if (!player) return;

        console.log(`[AutoPlay] 发现播放器，尝试执行自动播放...`);

        // 1. 设置音量
        player.volume = CONFIG.volume;

        // 2. 尝试：直接有声播放
        player.muted = false;
        const playPromise = player.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("[AutoPlay] ✅ 有声自动播放成功");
            }).catch((error) => {
                console.warn("[AutoPlay] 🔇 有声播放被浏览器拦截，切换为静音播放补救。", error);

                // 3. 失败补救：静音播放 (保证画面先动起来)
                player.muted = true;
                player.play();

                // 4. 交互恢复：监听用户第一次点击/触摸，恢复声音
                const unmuteAction = () => {
                    if (player.muted) {
                        player.muted = false;
                        player.volume = CONFIG.volume;
                        console.log("[AutoPlay] 🔊 用户交互检测，已恢复声音");
                    }
                    // 清理事件监听，避免重复触发
                    ['click', 'touchstart', 'keydown'].forEach(evt =>
                        document.removeEventListener(evt, unmuteAction, { capture: true })
                    );
                };

                // 注册全局一次性监听
                ['click', 'touchstart', 'keydown'].forEach(evt =>
                    document.addEventListener(evt, unmuteAction, { capture: true })
                );
            });
        }
    }

    // 轮询检测播放器是否存在 (因为MissAV是动态加载的)
    const timer = setInterval(() => {
        // MissAV 通常使用 <video class="player"> 或 plyr
        const player = document.querySelector('video') || document.querySelector('video.player');

        if (player) {
            // 找到播放器后，清除定时器并执行逻辑
            clearInterval(timer);
            
            // 确保 metadata 加载后再执行，或者直接执行
            if (player.readyState >= 1) {
                tryAutoPlay(player);
            } else {
                player.addEventListener('loadedmetadata', () => tryAutoPlay(player), { once: true });
            }
        }
    }, CONFIG.checkInterval);

    // 15秒后如果还没找到播放器，停止检测以节省资源
    setTimeout(() => clearInterval(timer), 15000);

})();
