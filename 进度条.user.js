// ==UserScript==
// @name         修复视频进度条 (Firefox/Chrome通用版)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  修复 xgplayer 等播放器在移动端/窄屏下进度条无法拖动的问题 (强制 pointer-events)
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 兼容性更强的 CSS 注入函数
     * Firefox 在 document-start 阶段可能还没有 body，
     * 所以优先插入到 documentElement (HTML标签) 或 head 中
     */
    function addStyle(css) {
        const style = document.createElement('style');
        style.textContent = css;
        style.type = 'text/css';
        
        // 尝试插入到 HTML 节点或 Head 节点，确保最快生效
        const target = document.documentElement || document.head || document.body;
        if (target) {
            target.appendChild(style);
        }
    }

    // 注入样式
    // 关键点：加上 !important 和 display: block
    addStyle(`
        @media screen and (max-width: 600px) and (orientation: portrait),
               screen and (max-height: 600px) and (orientation: landscape) {
            
            xg-outer,
            xg-inners {
                /* 强制覆盖原网站设置 */
                pointer-events: none !important;
                
                /* Firefox 必须项：防止自定义标签被渲染为无宽高的 inline 元素 */
                display: block !important; 
                
                /* 可选：确保层级关系正确，不遮挡 */
                z-index: 0 !important; 
            }
            
            /* 如果需要确保内部某些特定按钮还能点，可以在这里把那个子元素恢复
               例如：xg-inners .play-btn { pointer-events: auto !important; } 
            */
        }
    `);

    console.log("🔥 [CSS修复] 进度条触摸补丁已注入");

})();
