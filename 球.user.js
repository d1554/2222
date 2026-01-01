// ==UserScript==
// @name         Bilibili 首页“换一换”按钮美化 (移至Banner区+圆形大号版)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  将B站首页的“换一换”按钮移动到Banner右下角，改为圆形，并显著增大尺寸。
// @author       Gemini
// @match        https://www.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 注入 CSS 样式
    GM_addStyle(`
        /* 1. 容器定位与尺寸调整 */
        .feed-roll-btn {
            position: absolute !important;
            /* 因为按钮变大了，需要往上提更多才能看起来在原来的位置区域 */
            top: -80px !important;
            right: 40px !important;
            z-index: 100 !important;
            margin: 0 !important;
            /* 【核心改动】这里控制整体大小，从40改成了64 */
            height: 64px !important;
            width: 64px !important;
        }

        /* 2. 按钮主体变形：变圆 */
        .feed-roll-btn .primary-btn.roll-btn {
            border-radius: 50% !important;
            /* 【核心改动】按钮实体大小跟随容器 */
            width: 100% !important;
            height: 100% !important;
            min-width: unset !important;
            padding: 0 !important;

            /* 居中图标 */
            display: flex !important;
            align-items: center;
            justify-content: center;

            /* 玻璃拟态背景 - 稍微加强了一点背景不透明度，大按钮更易读 */
            background-color: rgba(255, 255, 255, 0.8) !important;
            backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(255, 255, 255, 0.5) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            color: #333 !important;
        }

        /* 3. 隐藏文字“换一换” */
        .feed-roll-btn .primary-btn.roll-btn span {
            display: none !important;
        }

        /* 4. 图标样式调整 */
        .feed-roll-btn .primary-btn.roll-btn svg {
            /* 【核心改动】图标也相应放大，从20改成了32 */
            width: 32px !important;
            height: 32px !important;
            margin: 0 !important;
            transition: transform 0.5s ease;
        }

        /* 5. 鼠标悬停交互效果 */
        .feed-roll-btn .primary-btn.roll-btn:hover {
            background-color: #fff !important;
            transform: scale(1.05); /* 稍微调小了缩放比例，因为本体已经很大了 */
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25) !important;
        }

        /* 悬停时图标旋转一圈 */
        .feed-roll-btn .primary-btn.roll-btn:hover svg {
            transform: rotate(180deg);
        }
    `);
})();
