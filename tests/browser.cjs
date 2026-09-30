const fs = require('node:fs');
const path = require('node:path');

module.exports = async function ({ page, source, viewport, assert }) {
    const id = 'script_container_24ebddd6-7558-4f60-b473-a6a872c14040';
    await page.setContent(`<!doctype html><html><head><style>
        body { margin: 16px; font: 16px sans-serif; }
        #send_form { display: flex; flex-wrap: wrap; gap: 8px; }
        #toolbar { display: flex; width: 100%; }
        textarea { width: 100%; box-sizing: border-box; height: 100px; }
    </style></head><body><form id="send_form">
        <div id="toolbar"><span id="before">Toolbar</span><span id="after">End</span></div>
        <textarea aria-label="Message"></textarea>
    </form></body></html>`);
    await page.addStyleTag({ content: fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8') });
    await page.addScriptTag({ content: source });

    async function addHelper() {
        await page.evaluate((id) => {
            const helper = document.createElement('div');
            helper.id = id;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'qr--button';
            button.textContent = 'Input helper';
            button.onclick = () => { window.clickCount = (window.clickCount || 0) + 1; };
            helper.append(button);
            document.getElementById('after').before(helper);
        }, id);
    }

    async function expectParent(parent) {
        await page.waitForFunction(({ id, parent }) =>
            document.getElementById(id)?.parentElement?.id === parent, { id, parent });
        assert.equal(await page.locator(`#${id}`).count(), 1);
    }

    await addHelper();
    await expectParent(viewport.width <= 768 ? 'send_form' : 'toolbar');
    await page.setViewportSize({ width: 390, height: 844 });
    await expectParent('send_form');
    assert.equal(await page.locator(`#${id}`).evaluate(el => el.classList.contains('ihb-moved')), true);
    await page.locator(`#${id} button`).click();
    assert.equal(await page.evaluate(() => window.clickCount), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

    await page.setViewportSize({ width: 1366, height: 900 });
    await expectParent('toolbar');
    assert.equal(await page.locator(`#${id}`).evaluate(el => el.previousElementSibling.id), 'before');
    assert.equal(await page.locator(`#${id}`).evaluate(el => el.classList.contains('ihb-moved')), false);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectParent('send_form');
    await page.locator(`#${id}`).evaluate(el => el.remove());
    await addHelper();
    await expectParent('send_form');
    await page.setViewportSize({ width: 1366, height: 900 });
    await expectParent('toolbar');
    assert.equal(await page.locator(`#${id}`).evaluate(el => el.previousElementSibling.id), 'before');
    await page.setViewportSize(viewport);
    await expectParent(viewport.width <= 768 ? 'send_form' : 'toolbar');
    return { delayedMount: true, responsiveRestore: true, clickPreserved: true, replacement: true };
};
