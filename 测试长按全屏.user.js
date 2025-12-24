// ==UserScript==
// @name         安卓全能键 (S键连击+长按H 增强版)
// @namespace    http://tampermonkey.net/
// @version      38.0
// @description  双击S连击模式(4秒)；长按屏幕或播放键2秒触发H (无视视频状态变化)
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 ---
    let counterBox = null;

    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 30%; left: 50%; transform: translate(-50%, -50%);
                font-size: 80px; font-weight: 900; color: rgba(255, 255, 255, 0.9);
                text-shadow: 0 0 10px #000; z-index: 2147483647; pointer-events: none;
                display: none; font-family: sans-serif; white-space: nowrap;
            `;
            document.body.appendChild(counterBox);
        } else {
            requestAnimationFrame(initUI);
        }
    }
    initUI();

    let counterHideTimer;
    function showCounter(text, color = '#fff', scale = 1.0) {
        if (!counterBox) return;
        counterBox.innerText = text;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        counterBox.style.transform = `translate(-50%, -50%) scale(${scale})`;
        
        clearTimeout(counterHideTimer);
        counterHideTimer = setTimeout(() => {
            counterBox.style.display = 'none';
        }, 800);
    }

    // --- 2. 模拟按键 ---
    function triggerKey(keyName) {
        let keyChar, keyCode;
        
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            showCounter("H", "#00d2ff", 1.3); // 蓝色H提示
        }

        const eventConfig = {
            key: keyChar, 
            code: 'Key' + keyChar.toUpperCase(),
            keyCode: keyCode, 
            which: keyCode,
            bubbles: true, cancelable: true, view: window
        };
        
        const targets = [document.activeElement, document.body, document.documentElement];
        targets.forEach(t => {
            if(t) {
                try {
                    t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            }
        });
    }

    // --- 3. 长按 H 逻辑 (增强版：支持Play/Pause顺势按住) ---
    // 使用 window 级捕获，确保即使点击了控制栏也能尝试捕捉
    let holdTimer = null;
    let holdInterval = null;
    let startX = 0;
    let startY = 0;
    const HOLD_TIME = 2000; // 长按 2 秒
    const DRAG_THRESHOLD = 30; // 容错范围 30px

    function resetHold() {
        if (holdTimer) clearTimeout(holdTimer);
        if (holdInterval) clearInterval(holdInterval);
        holdTimer = null;
        holdInterval = null;
    }

    // 监听触摸开始 (Use Capture = true)
    window.addEventListener('touchstart', function(e) {
        // 简单判定：只有触摸点在视频元素上，或者触摸目标本身就是视频/音频时才触发
        // 如果是点击播放按钮，目标通常是视频本身或其容器
        const target = e.target;
        const isMedia = (target.nodeName === 'VIDEO' || target.nodeName === 'AUDIO');
        
        // 寻找页面上是否有视频（为了防止在没有视频的页面乱触发）
        const hasVideoOnPage = document.querySelector('video, audio');
        if (!isMedia && !hasVideoOnPage) return;

        // 如果触摸的是特定非视频区域（如输入框），则忽略
        if (target.nodeName === 'INPUT' || target.nodeName === 'TEXTAREA') return;

        resetHold();
        
        if(e.touches.length > 0){
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }

        let count = 0;
        // 视觉反馈：H倒计时
        holdInterval = setInterval(() => {
            count++;
            // 只有当手指还在按着的时候才显示
            showCounter("·".repeat(count), "rgba(255, 255, 255, 0.4)", 0.8);
        }, 600);

        // 2秒后触发 H
        holdTimer = setTimeout(() => {
            resetHold();
            triggerKey('h');
            if (navigator.vibrate) navigator.vibrate(50);
        }, HOLD_TIME);
        
    }, { passive: true, capture: true }); 

    // 监听移动 (取消长按)
    window.addEventListener('touchmove', function(e) {
        if (!holdTimer) return;
        if(e.touches.length > 0){
            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;
            // 移动距离过大视为拖拽，取消长按
            if (Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) > DRAG_THRESHOLD) {
                resetHold();
            }
        }
    }, { passive: true, capture: true });

    // 结束或取消
    window.addEventListener('touchend', resetHold, { capture: true });
    window.addEventListener('touchcancel', resetHold, { capture: true });


    // --- 4. S 键连击逻辑 (保留 V37 的优秀逻辑) ---
    let clickCount = 0;
    let lastEventTime = 0;    
    let lastTarget = null;
    let comboMode = false;      
    let comboTimer = null;      

    const WAIT_FOR_NEXT_CLICK = 800; 
    const EVENT_DEBOUNCE = 50;       

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        if (target.ended) return; 
        if (target.seeking) return; 
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;

        // 切换视频重置
        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            comboMode = false;
            if (comboTimer) clearTimeout(comboTimer);
        }
        lastTarget = target;

        // 连击模式 (S+)
        if (comboMode) {
            triggerKey('s'); 
            showCounter("S+", "#55ff55"); 
            clearTimeout(comboTimer);
            comboTimer = setTimeout(() => {
                comboMode = false;
                clickCount = 0;
                showCounter("End", "rgba(255,255,255,0.3)", 0.5); 
            }, 4000); 
            return;
        }

        // 普通模式
        clickCount++;

        if (clickCount === 1) {
            showCounter("1", "rgba(255,255,255,0.6)");
            setTimeout(() => {
                if (clickCount === 1 && !comboMode) clickCount = 0;
            }, WAIT_FOR_NEXT_CLICK);
        }
        else if (clickCount >= 2) {
            triggerKey('s');
            showCounter("S", "#fff");
            comboMode = true;
            clickCount = 0; 
            if (comboTimer) clearTimeout(comboTimer);
            comboTimer = setTimeout(() => {
                comboMode = false;
            }, 4000);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
