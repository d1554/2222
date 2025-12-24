// ==UserScript==
// @name         安卓霸权键 (V48 绝杀冲突版)
// @namespace    http://tampermonkey.net/
// @version      48.0
// @description  最高权限拦截：长按H期间及之后2秒，彻底屏蔽S键逻辑；2.5秒宽松双击S
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

    // --- 3. 全局长按 H (最高权限拦截逻辑) ---
    let holdTimer = null;
    let holdInterval = null;
    let startX = 0;
    let startY = 0;
    
    // 【核心标志位】
    let hTriggerReady = false; // 2秒已满，准备发射
    let superBlocker = false;  // 超级护盾：激活时 S 键逻辑完全失效
    
    const HOLD_TIME = 2000; 
    const DRAG_THRESHOLD = 30; 

    function resetHold() {
        if (holdTimer) clearTimeout(holdTimer);
        if (holdInterval) clearInterval(holdInterval);
        holdTimer = null;
        holdInterval = null;
        hTriggerReady = false;
        // 注意：这里不重置 superBlocker，它由单独的定时器关闭
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
            if (!hTriggerReady) {
                showCounter("·".repeat(count), "rgba(255, 255, 255, 0.6)", 1.0);
            }
        }, 600);

        // 计时器
        holdTimer = setTimeout(() => {
            hTriggerReady = true; 
            
            // 【关键点1】一旦时间满2秒，立即开启超级护盾
            // 此时无论手指是否松开，任何播放暂停都不算数
            superBlocker = true; 
            
            showCounter("H Ready", "#55ff55", 1.2); 
        }, HOLD_TIME);
        
    }, { passive: true, capture: true });

    // 监听移动
    window.addEventListener('touchmove', function(e) {
        if (startX === 0 && startY === 0) return;
        if(e.touches.length > 0){
            const dist = Math.sqrt(Math.pow(e.touches[0].clientX - startX, 2) + Math.pow(e.touches[0].clientY - startY, 2));
            if (dist > DRAG_THRESHOLD) {
                resetHold();
                // 移动了就算失败，关闭护盾
                superBlocker = false; 
            }
        }
    }, { passive: true, capture: true });

    // 触摸结束：发射 H
    window.addEventListener('touchend', function(e) {
        
        if (hTriggerReady) {
            // 物理层拦截：尝试阻止点击
            if (e.cancelable) {
                e.preventDefault(); 
                e.stopPropagation();
            }

            // 发射 H
            triggerKey('h');
            
            // 【关键点2】松手后，延长护盾时间
            // 确保全屏切换造成的任何延迟事件都被过滤掉
            superBlocker = true;
            setTimeout(() => { 
                superBlocker = false; 
            }, 2000); // 护盾持续 2秒
        } else {
            // 如果没满2秒松手，关闭护盾
            superBlocker = false;
        }
        
        resetHold();
    }, { capture: true }); 

    window.addEventListener('touchcancel', resetHold, { capture: true });
    
    // 拦截 Click 事件 (针对幽灵点击)
    window.addEventListener('click', function(e){
        if (superBlocker) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    }, { capture: true });

    // 拦截右键
    window.addEventListener('contextmenu', function(e) {
        if (superBlocker) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { capture: true });


    // --- 4. S 键逻辑 (2.5秒宽松版 + 超级护盾识别) ---
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

        // 【关键点3】 S键逻辑入口处的绝对防御
        // 只要超级护盾开着，直接 Return，不计数，不触发，不执行任何S逻辑
        if (superBlocker) {
            // console.log("S key blocked by SuperShield");
            return;
        }

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
