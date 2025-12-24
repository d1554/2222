// ==UserScript==
// @name         安卓S键映射 (5秒连击+触屏长按H)
// @namespace    http://tampermonkey.net/
// @version      36.0
// @description  安卓版：双击触发S后，5秒内所有点击均为S；长按屏幕3秒触发H
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 (适配手机屏幕) ---
    let counterBox = null;

    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%);
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
            showCounter("H", "#00d2ff", 1.2); 
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

    // --- 3. 安卓长按 H 逻辑 (Touch事件) ---
    let holdTimer = null;
    let holdInterval = null;
    let startX = 0;
    let startY = 0;
    const HOLD_TIME = 3000; // 3秒
    const DRAG_THRESHOLD = 20; // 手机上容错稍大一点(20px)

    function resetHold() {
        if (holdTimer) clearTimeout(holdTimer);
        if (holdInterval) clearInterval(holdInterval);
        holdTimer = null;
        holdInterval = null;
    }

    // 触摸开始
    window.addEventListener('touchstart', function(e) {
        const target = e.target;
        // 确保触摸的是视频区域
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        resetHold();
        // 记录单指触摸坐标
        if(e.touches.length > 0){
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }

        let count = 0;
        // 视觉倒计时
        holdInterval = setInterval(() => {
            count++;
            let progress = "·".repeat(count);
            showCounter(progress, "rgba(255, 255, 255, 0.5)", 0.8);
        }, 700);

        // 3秒触发
        holdTimer = setTimeout(() => {
            resetHold();
            triggerKey('h');
            // 可选：触发后震动一下手机反馈 (如果浏览器支持)
            if (navigator.vibrate) navigator.vibrate(50);
        }, HOLD_TIME);
    }, { passive: true }); // passive: true 保证滚动流畅

    // 触摸移动 (检测是否在滑动进度条/滚动页面)
    window.addEventListener('touchmove', function(e) {
        if (!holdTimer) return;
        if(e.touches.length > 0){
            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;
            // 计算移动距离
            const dist = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            if (dist > DRAG_THRESHOLD) {
                resetHold();
            }
        }
    }, { passive: true });

    // 触摸结束/取消
    window.addEventListener('touchend', resetHold, true);
    window.addEventListener('touchcancel', resetHold, true);


    // --- 4. 智能连击 S 逻辑 (5秒 Combo 版) ---
    let clickCount = 0;
    let lastEventTime = 0;    
    let lastTarget = null;
    let comboMode = false;      // 是否处于5秒连击模式
    let comboTimer = null;      // 连击模式的倒计时

    const WAIT_FOR_NEXT_CLICK = 600; // 双击判定间隔(手机上给宽裕点)
    const EVENT_DEBOUNCE = 50;       

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // --- 基础过滤 ---
        if (target.ended) return; 
        if (target.seeking) return; 
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;

        // 切换视频时重置所有状态
        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            comboMode = false;
            if (comboTimer) clearTimeout(comboTimer);
        }
        lastTarget = target;

        // === 逻辑分支 ===

        // 状态1: 处于 5秒 Combo 模式中
        // 说明：之前已经触发过双击S，现在处于"狂暴"状态
        if (comboMode) {
            triggerKey('s'); // 直接触发S，无需计数
            showCounter("S+", "#55ff55"); // 绿色提示，表示连击生效
            
            // 刷新 5秒 倒计时
            clearTimeout(comboTimer);
            comboTimer = setTimeout(() => {
                comboMode = false;
                clickCount = 0;
                showCounter("End", "rgba(255,255,255,0.3)", 0.5); // 提示模式结束
            }, 5000); // 5秒后退出模式
            return;
        }

        // 状态2: 普通模式 (正在尝试触发双击)
        clickCount++;

        if (clickCount === 1) {
            showCounter("1", "rgba(255,255,255,0.6)");
            // 开启一个短定时器，如果指定时间内没有第二次点击，重置计数
            setTimeout(() => {
                if (clickCount === 1) clickCount = 0;
            }, WAIT_FOR_NEXT_CLICK);
        }
        else if (clickCount >= 2) {
            // 成功双击
            triggerKey('s');
            showCounter("S", "#fff");
            
            // 激活 5秒 Combo 模式
            comboMode = true;
            clickCount = 0; // 计数归零，转交给Combo逻辑
            
            // 开启退出倒计时
            if (comboTimer) clearTimeout(comboTimer);
            comboTimer = setTimeout(() => {
                comboMode = false;
            }, 5000);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
