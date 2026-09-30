(() => {
    'use strict';

    // Keep compatibility with the original installation when the helper API is unavailable.
    const INPUT_HELPER_ID = 'script_container_24ebddd6-7558-4f60-b473-a6a872c14040';
    const MOVED_CLASS = 'ihb-moved';
    const MOBILE_QUERY = '(max-width: 768px)';

    let observer;
    let timer = 0;
    let initialized = false;
    let currentContainer = null;
    let anchor = null;

    const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

    const schedule = () => {
        if (timer) return;
        timer = window.setTimeout(() => {
            timer = 0;
            sync();
        }, 0);
    };

    function findContainer() {
        const original = document.getElementById(INPUT_HELPER_ID);
        if (original) return original;

        const helper = window.TavernHelper;
        if (typeof helper?.getScriptTrees !== 'function') return null;
        const matches = new Set();
        function visit(scripts) {
            for (const script of scripts) {
                if (!script.enabled) continue;
                if (script.type === 'folder') {
                    visit(script.scripts || []);
                } else if (script.type === 'script' && script.name?.trim() === '\u8f93\u5165\u52a9\u624b') {
                    const container = document.getElementById(`script_container_${script.id}`);
                    if (container) matches.add(container);
                }
            }
        }
        for (const type of ['global', 'preset', 'character']) {
            try {
                visit(helper.getScriptTrees({ type }));
            } catch {
                // A character or preset scope may not be ready during startup.
            }
        }
        return matches.size === 1 ? [...matches][0] : null;
    }

    function ensureAnchor(container) {
        const sendForm = document.getElementById('send_form');
        const anchorTracksCurrentParent = anchor?.parentNode
            && (container.parentNode === anchor.parentNode || container.parentNode === sendForm);
        if (currentContainer === container && anchorTracksCurrentParent) return;

        anchor?.remove();
        currentContainer = container;
        anchor = document.createComment('input-helper-bottom-anchor');
        container.parentNode?.insertBefore(anchor, container);
    }

    function moveToBottom(container, sendForm) {
        ensureAnchor(container);
        if (container.parentNode !== sendForm) {
            sendForm.appendChild(container);
        }
        container.classList.add(MOVED_CLASS);
    }

    function restoreToToolbar(container) {
        if (!anchor?.parentNode) return;
        if (container.parentNode !== anchor.parentNode || container.previousSibling !== anchor) {
            anchor.parentNode.insertBefore(container, anchor.nextSibling);
        }
        container.classList.remove(MOVED_CLASS);
    }

    function sync() {
        const container = findContainer();
        const sendForm = document.getElementById('send_form');
        if (currentContainer && currentContainer !== container) {
            if (currentContainer.isConnected) restoreToToolbar(currentContainer);
            else currentContainer.classList.remove(MOVED_CLASS);
            anchor?.remove();
            anchor = null;
            currentContainer = null;
        }
        if (!container || !sendForm) return;

        if (isMobile()) {
            moveToBottom(container, sendForm);
        } else {
            restoreToToolbar(container);
        }
    }

    function isRelevantMutation(mutation) {
        if (mutation.type !== 'childList') return false;

        const target = mutation.target;
        if (target instanceof Element && (target.id === 'send_form' || target.closest('#send_form'))) {
            return true;
        }

        return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
            if (!(node instanceof Element)) return false;
            return node.id === 'send_form'
                || node.id.startsWith('script_container_')
                || node.querySelector?.('[id^="script_container_"]')
                || node.querySelector?.('#send_form');
        });
    }

    function init() {
        if (initialized || !document.body) return;
        initialized = true;

        observer = new MutationObserver((mutations) => {
            if (mutations.some(isRelevantMutation)) schedule();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('resize', schedule, { passive: true });
        const media = window.matchMedia(MOBILE_QUERY);
        if (media.addEventListener) media.addEventListener('change', schedule);
        else media.addListener?.(schedule);

        schedule();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
