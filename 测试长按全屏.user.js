// ==UserScript==
// @name         安卓霸权键 (防误触/防幽灵点击)
// @namespace    http://tampermonkey.net/
// @version      46.0
// @description  修复退出全屏误触"上一集"问题；强力拦截幽灵点击；2.5秒宽松双击S；长按2秒H
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 (精致版) ---
    let counterBox = null;

    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%);
                font-size: 45px; font-weight: bold; color: rgba(255, 255, 255, 0.95);
                text-shadow: 0 1px 3px rgba(0,0,0,0.8); 
                z-index: 2147483647; pointer-events: none;
                display: none; font-family: sans-serif; white-space: nowrap;
                background: rgba(0, 0, 0, 0.5); 
                padding: 5px 15px; border-radius: 8px;
                backdrop-filter: blur(2px);
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
        }, 600); 
    }

    // --- 2. 模拟按键 ---
    function triggerKey(keyName) {
        let keyChar, keyCode;
        
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            showCounter("H", "#00d2ff", 1.1);
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

    // --- 3. 全局长按 H (核心修复区) ---
    let holdTimer = null;
    let holdInterval = null;
    let startX = 0;
    let startY = 0;
    
    // 状态标记
    let isHolding = false;   // 正在进行长按逻辑
    let sBlocker = false;    // S键屏蔽盾 (防播放暂停冲突)
    let clickKiller = false; // 【新增】幽灵点击杀手 (防UI误触)
    
    const HOLD_TIME = 2000; 
    const DRAG_THRESHOLD = 30; 

    function resetHold() {
        if (holdTimer) clearTimeout(holdTimer);
        if (holdInterval) clearInterval(holdInterval);
        holdTimer = null;
        holdInterval = null;
        // 延迟关闭 isHolding，确保能覆盖 touchend
        setTimeout(() => { isHolding = false; }, 300);
    }

    // 监听触摸开始
    window.addEventListener('touchstart', function(e) {
        if (!document.querySelector('video, audio')) return;
        if (['INPUT', 'TEXTAREA'].includes(e.target.nodeName)) return;

        resetHold();
        if(e.touches.length > 0){
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }

        let count = 0;
        holdInterval = setInterval(() => {
            count++;
            showCounter("·".repeat(count), "rgba(255, 255, 255, 0.6)", 1.0);
        }, 600);

        // 触发 H
        holdTimer = setTimeout(() => {
            isHolding = true; 
            
            // 1. 开启 S 键屏蔽盾 (延长至 3秒)
            sBlocker = true;
            setTimeout(() => { sBlocker = false; }, 3000);

            // 2. 【核心】开启幽灵点击杀手 (0.5秒)
            // 在这0.5秒内，任何 click 事件都会被强制抹杀
            clickKiller = true;
            setTimeout(() => { clickKiller = false; }, 500);

            resetHold();
            triggerKey('h');
        }, HOLD_TIME);
        
    }, { passive: true, capture: true });

    // 监听移动
    window.addEventListener('touchmove', function(e) {
        if (!holdTimer) return;
        if(e.touches.length > 0){
            const dist = Math.sqrt(Math.pow(e.touches[0].clientX - startX, 2) + Math.pow(e.touches[0].clientY - startY, 2));
            if (dist > DRAG_THRESHOLD) {
                resetHold();
            }
        }
    }, { passive: true, capture: true });

    // 触摸结束 (第一道防线)
    window.addEventListener('touchend', function(e) {
        if (isHolding) {
            if (e.cancelable) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
        resetHold();
    }, { capture: true }); 

    // 【新增】点击事件拦截器 (第二道防线：幽灵点击杀手)
    window.addEventListener('click', function(e) {
        if (clickKiller) {
            // 强行阻止点击事件传播
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log("Ghost click killed by script!"); // 调试信息
            return false;
        }
    }, { capture: true }); // 使用 capture 在最外层拦截

    window.addEventListener('touchcancel', resetHold, { capture: true });
    
    // 拦截右键
    window.addEventListener('contextmenu', function(e) {
        if (isHolding || sBlocker) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { capture: true });


    // --- 4. S 键逻辑 (2.5秒宽松版) ---
    let clickCount = 0;
    let lastEventTime = 0;    
    let lastTarget = null;
    let comboMode = false;      
    let comboTimer = null;      
    let resetCountTimer = null; 

    const DOUBLE_CLICK_WINDOW = 2500; 
    const EVENT_DEBOUNCE = 50;       

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // 如果屏蔽盾生效，直接无视
        if (sBlocker) return;

        if (target.ended) return; 
        if (target.seeking) return; 
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;

        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            comboMode = false;
            if (comboTimer) clearTimeout(comboTimer);
            if (resetCountTimer) clearTimeout(resetCountTimer);
        }
        lastTarget = target;

        // 连击模式
        if (comboMode) {
            triggerKey('s'); 
            showCounter("S+", "#55ff55"); 
            clearTimeout(comboTimer);
            comboTimer = setTimeout(() => {
                comboMode = false;
                clickCount = 0;
                showCounter("End", "rgba(255,255,255,0.5)", 0.8); 
            }, 4000); 
            return;
        }

        // 普通计数
        clickCount++;
        if (resetCountTimer) clearTimeout(resetCountTimer);

        if (clickCount === 1) {
            showCounter("1", "rgba(255,255,255,0.7)");
            resetCountTimer = setTimeout(() => {
                clickCount = 0;
            }, DOUBLE_CLICK_WINDOW);
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
