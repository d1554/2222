// ==UserScript==
// @name             MissAV Enhanced Assistant
// @name:zh-CN       MissAV 增强小助手
// @description      去除广告|后台播放|自动播放|自定义快进时间|完整标题|更多功能...
// @run-at           document-start
// @grant            unsafeWindow
// @grant            GM_addStyle
// @match            https://missav123.com/*
// @match            https://missav.ws/*
// @match            https://missav.live/*
// @match            https://missav.ai/*
// @match            https://missav.com/*
// @match            https://thisav.com/*
// @author           DonkeyBear,track no,mrhydra,iSwfe,人民的勤务员 <china.qinwuyuan@gmail.com>
// @license          MIT
// @version          2025.12.04.SoundFirst
// ==/UserScript==

const url = window.location.href
if (/^https:\/\/(missav|thisav)\.com/.test(url)) {
    window.location.href = url.replace('missav.com', 'missav.live').replace('thisav.com', 'missav.live')
}

(() => {
    'use strict'

    const videoSettings = {
        viewportFitCover: false,
        playCtrlEnable: true,
        autoPauseDisable: 1,
        defaultVolume: 0.90, // 设置为你想要的90%音量
    };

    // 🟢【CSS 核心修复】核弹级常显
    GM_addStyle(`
        /* 1. 隐藏多余的绿色按钮栏 */
        div.flex.-mx-4.sm\\:m-0.mt-1.bg-black.justify-center { display: none !important; }

        /* 2. 【非全屏】底部挤出 40px 空间 */
        .plyr:not(.plyr--fullscreen-active) {
            padding-bottom: 40px !important;
            background-color: #000 !important;
        }

        /* 3. 【非全屏】控件钉死在底部 */
        .plyr:not(.plyr--fullscreen-active) .plyr__controls {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 40px !important;
            padding: 0 10px !important;
            background: #090811 !important;
            z-index: 99999 !important;
        }

        /* 4. 暴力禁止隐藏的核心代码 */
        .plyr__controls,
        .plyr--hide-controls .plyr__controls,
        .plyr--video.plyr--hide-controls .plyr__controls,
        .plyr--fullscreen-active .plyr__controls {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            transform: none !important;
            display: flex !important;
            transition: none !important;
        }

        /* 5. 调整视频高度 */
        .plyr:not(.plyr--fullscreen-active) .plyr__video-wrapper {
            height: 100% !important;
            padding-bottom: 0 !important;
        }

        /* 6. 去除广告 */
        div[class*="lg:hidden"], div.ts-outstream-video, iframe { display: none !important; }
        div.my-2.text-sm.text-nord4.truncate { white-space: normal !important; }
    `);

    (() => {
        var meta = document.createElement('meta')
        meta.name = 'theme-color'
        meta.content = '#090811'
        document.querySelector('head').appendChild(meta)
        if (videoSettings.viewportFitCover) {
            var viewport = document.querySelector('head > meta[name=viewport]')
            viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
        }
    })()

    var handle = () => {
        console.log('【MissAV助手】初始化...')

        var content = document.querySelector('body > div:nth-child(3) > div.sm\\:container > div > div.flex-1.order-first > div:first-child')
        var videoDiv = content.querySelector('div:first-child')
        videoDiv.id = 'video'
        videoDiv.classList.value = 'relative -mx-4 sm:m-0 mt-1'
        videoDiv.style.cursor = 'pointer';

        // 🔥🔥🔥 全新的自动播放逻辑 (优先有声) 🔥🔥🔥
        let autoPlayTimer = setInterval(() => {
            const player = document.querySelector('video.player');
            if (player) {
                // 1. 设定音量
                if (videoSettings.defaultVolume !== null) {
                    player.volume = videoSettings.defaultVolume;
                }

                // 2. 尝试有声播放
                player.muted = false;
                var promise = player.play();

                if (promise !== undefined) {
                    promise.then(_ => {
                        console.log("🔊 有声自动播放成功！(说明你设置了浏览器权限)");
                        clearInterval(autoPlayTimer);
                    }).catch(error => {
                        console.warn("🔇 有声播放被浏览器拦截，切换为静音自动播放。请在浏览器设置中允许此网站播放声音。");
                        // 3. 失败则切换回静音播放
                        player.muted = true;
                        player.play();

                        // 添加点击解除静音监听
                        const unmute = () => {
                            player.muted = false;
                            player.volume = videoSettings.defaultVolume || 1.0;
                            ['click', 'touchstart', 'keydown'].forEach(evt =>
                                document.removeEventListener(evt, unmute, { capture: true })
                            );
                        };
                        ['click', 'touchstart', 'keydown'].forEach(evt =>
                            document.addEventListener(evt, unmute, { capture: true })
                        );
                        clearInterval(autoPlayTimer);
                    });
                }
            }
        }, 500);
        setTimeout(() => clearInterval(autoPlayTimer), 10000);


        // 交互逻辑
        const player = document.querySelector('video.player');
        if (player) {
            player.addEventListener('seeked', () => {
                 if (player.paused) player.play().catch(() => {});
            });

            let isScrolling = false;
            videoDiv.addEventListener('touchmove', () => { isScrolling = true; }, {passive: true});
            videoDiv.addEventListener('touchstart', () => { isScrolling = false; }, {passive: true});

            const togglePlay = (e) => {
                if (isScrolling) return;
                if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.plyr__controls') || e.target.closest('input')) {
                    return;
                }
                e.stopPropagation();
                if (player.paused) player.play(); else player.pause();
            };

            videoDiv.addEventListener('touchend', togglePlay, { capture: true, passive: false });
            videoDiv.addEventListener('click', togglePlay, { capture: true });

            let windowIsBlurred
            window.onblur = () => { windowIsBlurred = true }
            window.onfocus = () => { windowIsBlurred = false }
            player.onpause = () => {
                if (windowIsBlurred && videoSettings.autoPauseDisable === 1) {
                    player.play();
                }
            }
        }

        loadActressInfo();
    }

    function loadActressInfo() {
        const links = document.querySelectorAll('.space-y-2 > div:nth-child(4) a')
        links.forEach(link => {
            const actressesLink = link.href
            fetch(actressesLink).then(res => res.text()).then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html')
                const imgElement = doc.querySelector('.bg-norddark img')
                const profile = doc.querySelector('.font-medium.text-lg.leading-6')
                if (profile) {
                    const saveBtn = profile.querySelector('div.hero-pattern button')
                    if (saveBtn) saveBtn.remove()

                    const profileDiv = document.createElement('div')
                    profileDiv.className = 'ChinaGodMan-preview'
                    Object.assign(profileDiv.style, {
                        display: 'none', position: 'absolute', backgroundColor: 'rgba(0,0,0,0.8)',
                        color: '#fff', padding: '10px', borderRadius: '5px', zIndex: '1000', whiteSpace: 'nowrap'
                    });

                    if (imgElement) {
                        profileDiv.innerHTML = `<img src="${imgElement.src.replace('-t', '')}" style="max-height: 200px; max-width: 200px; display: block; margin-bottom: 5px;">`
                        link.innerHTML = `<img src="${imgElement.src}" width="20" height="20" style="vertical-align: middle; margin-right: 4px;">` + link.innerText
                    }
                    profileDiv.appendChild(profile)
                    link.parentElement.appendChild(profileDiv)

                    link.addEventListener('mouseenter', () => {
                        profileDiv.style.display = 'block'
                        const rect = link.getBoundingClientRect()
                        profileDiv.style.top = `${rect.bottom + window.scrollY}px`
                        profileDiv.style.left = `${rect.left + window.scrollX}px`
                    })
                    link.addEventListener('mouseleave', () => { profileDiv.style.display = 'none' })
                }
            }).catch(() => {})
        })
    }

    var trigger = () => {
        return !!document.querySelector('body > div:nth-child(3) > div.sm\\:container > div > div.flex-1.order-first > div:first-child > div.relative')
    }

    var interval = setInterval(() => {
        if (trigger()) {
            clearInterval(interval)
            handle()
        }
    }, 200)

    setTimeout(() => clearInterval(interval), 10000)

    function cleanupPage() {
        document.querySelectorAll('iframe, div[class*="lg:hidden"], div.ts-outstream-video').forEach(el => el.remove());
        const origin = window.location.origin
        document.querySelectorAll('div.flex-1.min-w-0 h2').forEach(h2 => {
            if (!h2.querySelector('a') && h2.innerText) {
                const text = h2.innerText
                h2.innerHTML = `<a href="${origin}/genres/${text}">${text}</a>`
            }
        })
    }

    unsafeWindow.open = () => { }

    document.addEventListener('DOMContentLoaded', () => {
        const observer = new MutationObserver(() => cleanupPage())
        observer.observe(document, { childList: true, subtree: true })
    })

    document.addEventListener('ready', () => {
        const showMore = document.querySelector('a.text-nord13.font-medium.flex.items-center')
        if (showMore) showMore.click()
    })
})()

 
