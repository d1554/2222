// ==UserScript==
// @name         Bilibili 首页换一换悬浮球 (宽屏修正版)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  将“换一换”按钮强制提取为屏幕最前端的悬浮球，针对宽屏进行位置修正。
// @author       Gemini
// @match        https://www.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        /* 1. 强制固定定位 */
        .feed-roll-btn {
            position: fixed !important;

            /* ---【核心调试区：位置不对改这里】--- */

            /* 垂直位置：距离屏幕顶部的高度 */
            /* 之前可能太高了，稍微降一点点，或者根据您的浏览器书签栏高度微调 */
            top: 195px !important;

            /* 水平位置：从屏幕正中间往右推多少距离 */
            left: 50% !important;
            /* 之前是320px，现在大幅增加到 620px，确保它往右飞 */
            margin-left: 620px !important;

            /* --------------------------------- */

            z-index: 99999 !important;

            /* 尺寸设置 (60px) */
            width: 60px !important;
            height: 60px !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
        }

        /* 2. 按钮样式 - 玻璃质感圆球 */
        .feed-roll-btn .primary-btn.roll-btn {
            border-radius: 50% !important;
            width: 100% !important;
            height: 100% !important;
            min-width: unset !important;
            padding: 0 !important;

            display: flex !important;
            align-items: center;
            justify-content: center;

            background: rgba(255, 255, 255, 0.85) !important;
            backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(0, 0, 0, 0.05) !important;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15) !important;
        }

        /* 3. 隐藏文字 */
        .feed-roll-btn .primary-btn.roll-btn span {
            display: none !important;
        }

        /* 4. 图标优化 */
        .feed-roll-btn .primary-btn.roll-btn svg {
            width: 32px !important;
            height: 32px !important;
            color: #333 !important;
            transition: transform 0.6s ease;
        }

        /* 5. 交互动画 */
        .feed-roll-btn .primary-btn.roll-btn:hover {
            transform: scale(1.1);
            background: #fff !important;
            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.25) !important;
        }

        .feed-roll-btn .primary-btn.roll-btn:hover svg {
            transform: rotate(180deg);
        }
    `);
})();
