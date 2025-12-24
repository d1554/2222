// ==UserScript==
// @name         安卓霸权键 (V56 纯净解静音版)
// @namespace    http://tampermonkey.net/
// @version      56.0
// @description  仅在播放时解静音(去掉全局触摸触发)；修复死循环；H键绝杀冲突；S键单次触发
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

    // --- 3. 纯净解静音模块 (仅监听播放事件) ---
    function tryUnmute(target) {
        if (!target || !(target instanceof HTMLMediaElement)) return;
        
        let modified = false;
        // 1. 解静音
        if (target.muted) {
            target.muted = false;
            modified = true;
        }
        // 2. 恢复音量
        if (target.volume === 0) {
            target.volume = 1.0;
            modified = true;
        }

        if (modified) {
            showCounter("🔊", "rgba(255,255,255,0.8)", 0.8);
        }
    }

    // 只使用这一个监听器，不滥用 touchstart
    document.addEventListener('play', (e) => {
        tryUnmute(e.target);
    }, true);


    // --- 4. 全局长按 H (绝杀冲突版 - 保持稳定) ---
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


    // --- 5. S 键逻辑 (防死循环 + 单次双击) ---
    let clickCount = 0;
    let lastEventTime = 0;    
    let lastTarget = null;
    let resetCountTimer = null; 
    let sCooldown = false;

    const DOUBLE_CLICK_WINDOW = 2500; 
    const EVENT_DEBOUNCE = 50;       

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // 1. 如果 H 键护盾生效，退出
        if (superBlocker) return;

        // 2. 如果 S 键冷却中，退出
        if (sCooldown) return;

        // 3. 真实性校验
        if (e.isTrusted === false) return;

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

        // --- 计数逻辑 ---
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

            clickCount = 0; 
            sCooldown = true;
            setTimeout(() => { sCooldown = false; }, 1000);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
