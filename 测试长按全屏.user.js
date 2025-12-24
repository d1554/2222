// ==UserScript==
// @name         安卓霸权键 (V49 单次双击版)
// @namespace    http://tampermonkey.net/
// @version      49.0
// @description  H键不动(绝杀冲突)；S键移除连击模式(双击仅触发一次S，立即重置)
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 (保持精致版) ---
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

    // --- 3. 全局长按 H (V48完美版代码，未改动) ---
    let holdTimer = null;
    let holdInterval = null;
    let startX = 0;
    let startY = 0;
    
    let hTriggerReady = false; 
    let superBlocker = false;  
    
    const HOLD_TIME = 2000; 
    const DRAG_THRESHOLD = 30; 

    function resetHold() {
        if (holdTimer) clearTimeout(holdTimer);
        if (holdInterval) clearInterval(holdInterval);
        holdTimer = null;
        holdInterval = null;
        hTriggerReady = false;
    }

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
            if (!hTriggerReady) {
                showCounter("·".repeat(count), "rgba(255, 255, 255, 0.6)", 1.0);
            }
        }, 600);

        holdTimer = setTimeout(() => {
            hTriggerReady = true; 
            superBlocker = true; 
            showCounter("H Ready", "#55ff55", 1.2); 
        }, HOLD_TIME);
        
    }, { passive: true, capture: true });

    window.addEventListener('touchmove', function(e) {
        if (startX === 0 && startY === 0) return;
        if(e.touches.length > 0){
            const dist = Math.sqrt(Math.pow(e.touches[0].clientX - startX, 2) + Math.pow(e.touches[0].clientY - startY, 2));
            if (dist > DRAG_THRESHOLD) {
                resetHold();
                superBlocker = false; 
            }
        }
    }, { passive: true, capture: true });

    window.addEventListener('touchend', function(e) {
        if (hTriggerReady) {
            if (e.cancelable) {
                e.preventDefault(); 
                e.stopPropagation();
            }
            triggerKey('h');
            superBlocker = true;
            setTimeout(() => { 
                superBlocker = false; 
            }, 2000); 
        } else {
            superBlocker = false;
        }
        resetHold();
    }, { capture: true }); 

    window.addEventListener('touchcancel', resetHold, { capture: true });
    
    window.addEventListener('click', function(e){
        if (superBlocker) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    }, { capture: true });

    window.addEventListener('contextmenu', function(e) {
        if (superBlocker) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { capture: true });


    // --- 4. S 键逻辑 (V49: 移除连击，触发即重置) ---
    let clickCount = 0;
    let lastEventTime = 0;    
    let lastTarget = null;
    let resetCountTimer = null; 

    // 保持宽松判定
    const DOUBLE_CLICK_WINDOW = 2500; 
    const EVENT_DEBOUNCE = 50;       

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // 超级护盾 (H键保护)
        if (superBlocker) return;

        if (target.ended) return; 
        if (target.seeking) return; 
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;

        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (resetCountTimer) clearTimeout(resetCountTimer);
        }
        lastTarget = target;

        // --- 核心逻辑修改区 ---
        clickCount++;

        // 每次点击都先清除旧的重置定时器
        if (resetCountTimer) clearTimeout(resetCountTimer);

        if (clickCount === 1) {
            showCounter("1", "rgba(255,255,255,0.7)");
            // 2.5秒内没点第二下，就归零
            resetCountTimer = setTimeout(() => {
                clickCount = 0;
            }, DOUBLE_CLICK_WINDOW);
        }
        else if (clickCount >= 2) {
            // 触发 S
            triggerKey('s');
            showCounter("S", "#fff");
            
            // 【改动】立即重置计数器！
            // 这样第3下点击就会变成 "1"，而不是 "S"
            clickCount = 0; 
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
