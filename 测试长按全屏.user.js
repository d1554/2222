// ==UserScript==
// @name         安卓霸权键 (V52 独立解静音版)
// @namespace    http://tampermonkey.net/
// @version      52.0
// @description  独立强力解静音(参考原版逻辑)；修复死循环；H键绝杀冲突；双击S单次触发
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

    // --- 3. 独立解静音模块 (参考您的脚本逻辑) ---
    // 这个模块独立运行，不受 S/H 键逻辑的干扰
    function unmuteVideo(videoElement) {
        let modified = false;
        
        // 1. 解除静音状态
        if (videoElement.muted) {
            videoElement.muted = false;
            modified = true;
        }
        
        // 2. 恢复音量 (手机上直接恢复到 100%，由系统音量控制最终大小)
        if (videoElement.volume === 0) {
            videoElement.volume = 1.0; 
            modified = true;
        }

        if (modified) {
            showCounter("🔊", "rgba(255,255,255,0.8)", 0.8);
        }
    }

    // 使用捕获阶段 (true)，确保第一时间拦截到播放事件
    document.addEventListener('play', (e) => {
        if (e.target instanceof HTMLMediaElement) {
            unmuteVideo(e.target);
        }
    }, true);


    // --- 4. 全局长按 H (绝杀冲突版) ---
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
    let resetCountTimer = null
