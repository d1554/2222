// ==UserScript==
// @name         安卓霸权键 (松手触发稳定版)
// @namespace    http://tampermonkey.net/
// @version      47.0
// @description  按住2秒提示就绪，松手瞬间触发H(彻底解决黑屏/误触)；2.5秒宽松双击S
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
            // 触发时的提示
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

    // --- 3. 全局长按 H (松手触发机制) ---
    let holdTimer = null;
    let holdInterval = null;
    let startX = 0;
    let startY = 0;
    
    // 状态标记
    let hTriggerReady = false; // 标记：是否已经按满时间，准备好触发了
    let sBlocker = false;      // S键屏蔽盾
    
    const HOLD_TIME = 2000; 
    const DRAG_THRESHOLD = 30; 

    function resetHold() {
        if (holdTimer) clearTimeout(holdTimer);
        if (holdInterval) clearInterval(holdInterval);
        holdTimer = null;
        holdInterval = null;
        hTriggerReady = false; // 重置就绪状态
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
            // 还没满时间时，显示点点
            if (!hTriggerReady) {
                showCounter("·".repeat(count), "rgba(255, 255, 255, 0.6)", 1.0);
            }
        }, 600);

        // 计时结束：只标记状态，不立即触发
        holdTimer = setTimeout(() => {
            hTriggerReady = true; 
            // 视觉提示用户：可以松手了
            showCounter("H Ready", "#55ff55", 1.2); 
            // 此时不发送按键，等待 touchend
        }, HOLD_TIME);
        
    }, { passive: true, capture: true });

    // 监听移动
    window.addEventListener('touchmove', function(e) {
        // 如果移动距离过大，取消这次长按
        if (startX === 0 && startY === 0) return;
        if(e.touches.length > 0){
            const dist = Math.sqrt(Math.pow(e.touches[0].clientX - startX, 2) + Math.pow(e.touches[0].clientY - startY, 2));
            if (dist > DRAG_THRESHOLD) {
                resetHold();
            }
        }
    }, { passive: true, capture: true });

    // 【关键】触摸结束：在此处触发逻辑
    window.addEventListener('touchend', function(e) {
        
        // 如果状态是“已就绪”，说明用户按满了2秒并松开了手指
        if (hTriggerReady) {
            // 1. 阻止浏览器默认的点击行为 (防止误触上一集)
            if (e.cancelable) {
                e.preventDefault(); 
                e.stopPropagation();
            }

            // 2. 开启 S 键屏蔽盾 (防止松手引发的播放暂停被计入S)
            sBlocker = true;
            setTimeout(() => { sBlocker = false; }, 2000);

            // 3. 发射 H 键
            triggerKey('h');
        }
        
        resetHold();
    }, { capture: true }); // capture 确保优先拦截

    window.addEventListener('touchcancel', resetHold, { capture: true });
    
    // 拦截右键
    window.addEventListener('contextmenu', function(e) {
        if (hTriggerReady || sBlocker) {
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
