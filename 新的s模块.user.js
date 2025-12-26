// ==UserScript==
// @name         安卓霸权键 (V59 左上角粉色版)
// @namespace    http://tampermonkey.net/
// @version      59.0
// @description  H键固定在左上角(80px处)；改为粉色以便区分；S键双击播放/暂停触发
// @author       Gemini Helper
// @match        *://*.douyin.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 全局 UI 系统 ---
    let toastBox = null;
    let hButton = null;

    function initUI() {
        if (!document.body) {
            requestAnimationFrame(initUI);
            return;
        }

        // 1.1 提示框
        toastBox = document.createElement('div');
        toastBox.style.cssText = `
            position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%);
            font-size: 40px; font-weight: bold; color: #fff;
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            z-index: 9999999; pointer-events: none; display: none;
            background: rgba(0, 0, 0, 0.6); padding: 8px 20px; border-radius: 12px;
            backdrop-filter: blur(4px); transition: opacity 0.2s;
        `;
        document.body.appendChild(toastBox);

        // 1.2 H 按钮 (左上角 + 粉色)
        hButton = document.createElement('div');
        hButton.innerText = 'H';
        hButton.style.cssText = `
            position: fixed; 
            left: 0; 
            top: 80px;  /* 绝对的左上角位置，避开状态栏 */
            width: 45px; height: 50px;
            background: rgba(255, 60, 100, 0.5); /* 改为粉色，方便确认更新 */
            color: white; font-size: 20px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            border-top-right-radius: 10px; border-bottom-right-radius: 10px;
            z-index: 9999998; cursor: pointer; user-select: none;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
            backdrop-filter: blur(2px);
        `;
        
        // 点击 H 按钮事件
        hButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerKey('h'); // 触发 H
            
            // 点击反馈 (变深红)
            hButton.style.background = 'rgba(255, 60, 100, 0.9)';
            setTimeout(() => hButton.style.background = 'rgba(255, 60, 100, 0.5)', 200);
        });

        document.body.appendChild(hButton);
    }
    initUI();

    let hideTimer;
    function showToast(text, color = '#fff') {
        if (!toastBox) return;
        toastBox.innerText = text;
        toastBox.style.color = color;
        toastBox.style.display = 'block';
        toastBox.style.opacity = '1';
        
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toastBox.style.opacity = '0';
            setTimeout(() => { toastBox.style.display = 'none'; }, 200);
        }, 800);
    }

    // --- 2. 模拟按键核心 ---
    function triggerKey(keyName) {
        let keyChar, keyCode;
        
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
            showToast("S 🚀", "#ff5555");
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            showToast("H 🔥", "#00d2ff");
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

    // --- 3. S 键逻辑 (双击播放/暂停) ---
    let clickCount = 0;
    let lastEventTime = 0;
    let sResetTimer = null;
    let sCooldown = false; 

    const EVENT_DEBOUNCE = 50;   
    const DOUBLE_CLICK_WINDOW = 2500; 

    function handleMediaEvent(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (sCooldown) return;

        const now = Date.now();
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;

        clickCount++;

        if (sResetTimer) clearTimeout(sResetTimer);

        if (clickCount === 1) {
            showToast("1", "rgba(255,255,255,0.6)");
            sResetTimer = setTimeout(() => {
                clickCount = 0;
            }, DOUBLE_CLICK_WINDOW);
        }
        else if (clickCount >= 2) {
            triggerKey('s');
            clickCount = 0;
            sCooldown = true;
            setTimeout(() => { sCooldown = false; }, 1000);
        }
    }

    window.addEventListener('play', handleMediaEvent, true);
    window.addEventListener('pause', handleMediaEvent, true);

})();
