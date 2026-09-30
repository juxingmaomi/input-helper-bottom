(() => {
    'use strict';

    // The script id is stable for this user's saved Tavern Helper script.
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
        return document.getElementById(INPUT_HELPER_ID);
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
                || node.id === INPUT_HELPER_ID
                || node.querySelector?.(`#${INPUT_HELPER_ID}`)
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
