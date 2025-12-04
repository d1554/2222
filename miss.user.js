// ==UserScript==
// @name         MissAV 纯净自动播放 (修复版)
// @name:zh-CN   MissAV 纯净自动播放 (修复版)
// @description  修正自动播放失效问题：采用静音启动+点击恢复声音的稳健策略，并防止网站自动暂停。
// @match        https://missav123.com/*
// @match        https://missav.ws/*
// @match        https://missav.live/*
// @match        https://missav.ai/*
// @match        https://missav.com/*
// @match        https://thisav.com/*
// @grant        none
// @run-at       document-end
// @license      MIT
// @version      2025.12.04.FixPlay
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        targetVolume: 0.9, // 目标音量 90%
        checkInterval: 200 // 检测频率
    };

    let hasInteracted = false;

    // 🟢 核心播放控制
    function forcePlay(video) {
        if (!video) return;

        // 1. 设定目标音量
        if (video.volume !== CONFIG.targetVolume) {
            video.volume = CONFIG.targetVolume;
        }

        // 2. 如果已经播放中，不做处理
        if (!video.paused) return;

        console.log("▶️ 尝试触发播放...");

        // 3. 策略 A: 尝试有声播放 (浏览器通常会拦截这个，但如果用户刚才点击过页面，这步会成功)
        video.muted = false;
        var playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("✅ 有声播放成功");
            }).catch((error) => {
                // 4. 策略 B: 浏览器拦截了，必须静音才能自动播放
                console.warn("⚠️ 浏览器拦截有声播放，切换为静音自动播放以确保画面流畅。");
                video.muted = true;
                video.play().then(() => {
                    console.log("🔇 静音播放已启动，等待点击恢复声音...");
                    addUnmuteListener(video);
                }).catch(e => console.error("❌ 播放彻底失败:", e));
            });
        }
    }

    // 🔊 交互恢复声音 (全页面监听)
    function addUnmuteListener(video) {
        if (hasInteracted) return;

        const unmuteAction = (e) => {
            // 忽略非用户意图的点击（如脚本触发的）
            if (!e.isTrusted) return;

            hasInteracted = true;
            video.muted = false;
            video.volume = CONFIG.targetVolume;
            console.log(`🔊 检测到用户操作 (${e.type}) -> 声音已恢复`);

            // 清理监听器
            ['click', 'touchstart', 'keydown', 'mousedown'].forEach(evt =>
                document.removeEventListener(evt, unmuteAction, { capture: true })
            );
        };

        ['click', 'touchstart', 'keydown', 'mousedown'].forEach(evt =>
            document.addEventListener(evt, unmuteAction, { capture: true })
        );
    }

    // 🛡️ 防暂停守护 (MissAV 喜欢在后台或加载广告时强制暂停视频)
    function startAntiPauseGuard(video) {
        video.addEventListener('pause', () => {
            // 如果不是用户手动暂停（可以通过判断 document.hidden 或者其他逻辑，这里简化为强制续播）
            // 只有当用户真的想暂停时(比如点击了控制条的暂停按钮)，这个逻辑才会有冲突
            // 为了MissAV的体验，通常我们假设用户希望一直播放
            if (!video.ended && video.readyState > 2) {
                console.log("🛡️ 检测到视频被暂停，执行防暂停逻辑 -> 重新播放");
                forcePlay(video);
            }
        });
    }

    // 👁️ 监控视频元素出现
    const observer = new setInterval(() => {
        // MissAV 的视频标签通常带有 player 类，但也可能是普通的 video
        const video = document.querySelector('video') || document.querySelector('.plyr__video-wrapper video');

        if (video) {
            // 找到视频了！
            clearInterval(observer);
            console.log("🔎 发现视频元素，初始化增强逻辑...");

            // 确保 metadata 加载完成再操作
            if (video.readyState >= 1) {
                initVideo(video);
            } else {
                video.addEventListener('loadedmetadata', () => initVideo(video), { once: true });
            }
        }
    }, CONFIG.checkInterval);

    // 初始化流程
    function initVideo(video) {
        // 1. 启动播放
        forcePlay(video);
        
        // 2. 启动防暂停守护
        startAntiPauseGuard(video);

        // 3. 持续检测（双重保险，防止视频源变更后停止）
        setInterval(() => {
            if (video.paused && video.readyState > 2) {
                forcePlay(video);
            }
        }, 1000);
    }

    // 15秒后停止查找，避免消耗资源
    setTimeout(() => clearInterval(observer), 15000);

})();
