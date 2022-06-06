// Want to use or contribute to this? https://github.com/Glitchii/embedbuilder
// If you find an issue, please report it, make a P.R, or use the discussion page. Thanks

options = window.options || {};
inIframe = window.inIframe || top !== self;
currentURL = () => new URL(inIframe ? /(https?:\/\/(?:[\d\w]+\.)?[\d\w\.]+(?::\d+)?)/g.exec(document.referrer)?.[0] || location.href : location.href);

let params = currentURL().searchParams,
    hasParam = param => params.get(param) !== null,
    dataSpecified = options.dataSpecified || params.get('data'),
    username = params.get('username') || options.username,
    avatar = params.get('avatar') || options.avatar,
    guiTabs = params.get('guitabs') || options.guiTabs,
    useJsonEditor = params.get('editor') === 'json' || options.useJsonEditor,
    verified = hasParam('verified') || options.verified,
    reverseColumns = hasParam('reverse') || options.reverseColumns,
    noUser = localStorage.getItem('noUser') || hasParam('nouser') || options.noUser,
    onlyEmbed = hasParam('embed') || options.onlyEmbed,
    allowPlaceholders = hasParam('placeholders') || options.allowPlaceholders,
    autoUpdateURL = localStorage.getItem('autoUpdateURL') || options.autoUpdateURL,
    multiEmbeds = localStorage.getItem('multiEmbeds') || hasParam('multiembeds') || options.multiEmbeds,
    noMenuMultiEmbeds = localStorage.getItem('noMenuMultiEmbeds') || hasParam('nomenumultiembeds') || options.noMenuMultiEmbeds,
    autoParams = localStorage.getItem('autoParams') || hasParam('autoparams') || options.autoParams,
    hideEditor = localStorage.getItem('hideeditor') || hasParam('hideeditor') || options.hideEditor,
    hidePreview = localStorage.getItem('hidepreview') || hasParam('hidepreview') || options.hidePreview,
    hideMenu = localStorage.getItem('hideMenu') || hasParam('hidemenu') || options.hideMenu,
    validationError, activeFields, lastActiveGuiEmbedIndex = -1, lastGuiJson, unsedEmbeds = [], colNum = 1, num = 0;

const guiEmbedIndex = guiEl => {
    const guiEmbed = guiEl?.closest('.guiEmbed');
    const gui = guiEmbed?.closest('.gui')

    return !gui ? -1 : Array.from(gui.querySelectorAll('.guiEmbed')).indexOf(guiEmbed)
}

const embedIndex = embedEl => {
    const guiEmbed = embedEl?.closest('.guiEmbed');
    const gui = guiEmbed?.closest('.gui')

    return multiEmbeds ? !gui ? -1 : Array.from(gui.querySelectorAll('.guiEmbed')).indexOf(guiEmbed) : 0;
}

const toggleStored = item => {
    const found = localStorage.getItem(item);
    if (!found)
        return localStorage.setItem(item, true);

    localStorage.removeItem(item);
    return found;
};

const createElement = object => {
    for (const tag in object) {
        const element = document.createElement(tag);

        for (const attr in object[tag])
            if (attr !== 'children') element[attr] = object[tag][attr];
            else for (const child of object[tag][attr])
                element.appendChild(createElement(child));

        return element;
    }

}

const jsonToBase64 = (jsonCode, withURL = false, redirect = false) => {
    let data = btoa(escape((JSON.stringify(typeof jsonCode === 'object' ? jsonCode : json))));

    if (withURL) {
        const url = currentURL();
        url.searchParams.set('data', data);
        if (redirect) window.top.location.href = url;
        // Replace %3D ('=' url encoded) with '='
        data = url.href.replace(/data=\w+(?:%3D)+/g, 'data=' + data);
    }

    return data;
};

const base64ToJson = data => {
    const jsonData = unescape(atob(data || dataSpecified));
    return typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
};

const toRGB = (hex, reversed, integer) => {
    if (reversed) return '#' + hex.match(/[\d]+/g).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    if (integer) return parseInt(hex.match(/[\d]+/g).map(x => parseInt(x).toString(16).padStart(2, '0')).join(''), 16);
    if (hex.includes(',')) return hex.match(/[\d]+/g);
    hex = hex.replace('#', '').match(/.{1,2}/g)
    return [parseInt(hex[0], 16), parseInt(hex[1], 16), parseInt(hex[2], 16), 1];
};

const reverse = (reversed, callback) => {
    const side = document.querySelector(reversed ? '.side2' : '.side1');
    if (side.nextElementSibling) side.parentElement.insertBefore(side.nextElementSibling, side);
    else side.parentElement.insertBefore(side, side.parentElement.firstElementChild);

    const isReversed = document.body.classList.toggle('reversed');
    if (autoParams) isReversed ? urlOptions({ set: ['reverse', ''] }) : urlOptions({ remove: 'reverse' });
};

const urlOptions = ({ remove, set }) => {
    const url = currentURL();
    if (remove) url.searchParams.delete(remove);
    if (set) url.searchParams.set(set[0], set[1]);
    try {
        history.replaceState(null, null, url.href.replace(/=&|=$/g, x => x === '=' ? '' : '&'));
    } catch (e) {
        // Most likely embeded in iframe
        console.message(`${e.name}: ${e.message}`, e);
        // if (e.name === 'SecurityError')
        //     window.top.location.href = href;
    }
};

const animateGuiEmbedNameAt = (i, text) => {
    const guiEmbedName = document.querySelectorAll('.gui .guiEmbedName')?.[i];
    text && (guiEmbedName.style.setProperty('--text', `"${text}"`));

    guiEmbedName?.scrollIntoView({ behavior: "smooth", block: "center" });
    guiEmbedName?.classList.add('empty');

    setTimeout(() => {
        guiEmbedName?.classList.remove('empty');
        guiEmbedName.style.removeProperty('--text');
    }, 3000);
}

const indexOfEmptyGuiEmbed = text => {
    for (const [i, element] of document.querySelectorAll('.msgEmbed>.container .embed').entries())
        if (element.classList.contains('emptyEmbed')) {
            text !== false && animateGuiEmbedNameAt(i, text);
            return i;
        }

    for (const [i, embedObj] of (json.embeds || []).entries())
        if (!(0 in Object.keys(embedObj))) {
            text !== false && animateGuiEmbedNameAt(i, text);
            return i;
        }

    return -1;
}

const changeLastActiveGuiEmbed = index => {
    const pickerEmbedText = document.querySelector('.colors .cTop .embedText>span');

    if (index === -1) {
        lastActiveGuiEmbedIndex = -1;
        return pickerEmbedText.textContent = '';
    }

    lastActiveGuiEmbedIndex = index;

    if (pickerEmbedText) {
        pickerEmbedText.textContent = index + 1;

        const guiEmbedNames = document.querySelectorAll('.gui .item.guiEmbedName');
        pickerEmbedText.onclick = () => {
            const newIndex = parseInt(prompt('Enter an embed number' + (guiEmbedNames.length > 1 ? `, 1 - ${guiEmbedNames.length}` : ''), index + 1));
            if (isNaN(newIndex)) return;
            if (newIndex < 1 || newIndex > guiEmbedNames.length)
                return error(guiEmbedNames.length === 1 ? `'${newIndex}' is not a valid embed number` : `'${newIndex}' doesn't seem like a number between 1 and ${guiEmbedNames.length}`, 3000);

            changeLastActiveGuiEmbed(newIndex - 1);
        }
    }
}

let mainKeys = ["author", "footer", "color", "thumbnail", "image", "fields", "title", "description", "url", "timestamp"],
    jsonKeys = ["embed", "content", ...mainKeys],
    jsonObject = window.json || {
        content: "You can~~not~~ do `this`.```py\nAnd this.\nprint('Hi')```\n*italics* or _italics_     __*underline italics*__\n**bold**     __**underline bold**__\n***bold italics***  __***underline bold italics***__\n__underline__     ~~Strikethrough~~",
        embed: {
            title: "Hello ~~people~~ world :wave:",
            description: "You can use [links](https://discord.com) or emojis :smile: 😎\n```\nAnd also code blocks\n```",
            color: 0x41f097,
            timestamp: new Date().toISOString(),
            url: "https://discord.com",
            author: {
                name: "Author name",
                url: "https://discord.com",
                icon_url: "https://unsplash.it/100"
            },
            thumbnail: {
                url: "https://unsplash.it/200"
            },
            image: {
                url: "https://unsplash.it/380/200"
            },
            footer: {
                text: "Footer text",
                icon_url: "https://unsplash.it/100"
            },
            fields: [
                {
                    name: "Field 1, *lorem* **ipsum**, ~~dolor~~",
                    value: "Field value"
                },
                {
                    name: "Field 2",
                    value: "You can use custom emojis <:Kekwlaugh:722088222766923847>. <:GangstaBlob:742256196295065661>",
                    inline: false
                },
                {
                    name: "Inline field",
                    value: "Fields can be inline",
                    inline: true
                },
                {
                    name: "Inline field",
                    value: "*Lorem ipsum*",
                    inline: true
                },
                {
                    name: "Inline field",
                    value: "value",
                    inline: true
                },
                {
                    name: "Another field",
                    value: "> Nope, didn't forget about this",
                    inline: false
                }
            ]
        }
    }

let multi = () => !!multiEmbeds && json?.embeds;

if (dataSpecified)
    jsonObject = base64ToJson();

if (allowPlaceholders)
    allowPlaceholders = params.get('placeholders') === 'errors' ? 1 : 2;

// Even if not in multi-embed mode, 'jsonObject' should always have an array 'embeds'
// To get the right json object that includes either 'embeds' or 'embed' if not in multi-embed mode,
// print 'json' (global variable) instead of 'jsonObject', jsonObject is used internally, you shouldn't modify it.
if (multiEmbeds && !jsonObject.embeds?.length)
    jsonObject.embeds = jsonObject.embed ? [jsonObject.embed] : [];
else if (!multiEmbeds)
    jsonObject.embeds = jsonObject.embeds?.[0] ? [jsonObject.embeds[0]] : jsonObject.embed ? [jsonObject.embed] : [];

delete jsonObject.embed;

addEventListener('DOMContentLoaded', () => {
    if (reverseColumns || localStorage.getItem('reverseColumns'))
        reverse();
    if (autoUpdateURL)
        document.body.classList.add('autoUpdateURL');
    if (autoParams)
        document.querySelector('.auto-params > input').checked = true;
    if (hideMenu)
        document.querySelector('.top-btn.menu').classList.add('hidden');
    if (multiEmbeds)
        document.body.classList.add('multiEmbeds');
    if (noMenuMultiEmbeds)
        document.querySelector('.box .item.multi')?.remove();
    if (inIframe)
        // Remove menu options that don't work in iframe.
        for (const e of document.querySelectorAll('.no-frame'))
            e.remove();

    if (hideEditor) {
        document.body.classList.add('no-editor');
        document.querySelector('.toggle .toggles .editor input').checked = false;
    }

    if (hidePreview) {
        document.body.classList.add('no-preview');
        document.querySelector('.toggle .toggles .preview input').checked = false;
    }

    if (onlyEmbed) document.body.classList.add('only-embed');
    else {
        document.querySelector('.side1.noDisplay')?.classList.remove('noDisplay');
        if (useJsonEditor)
            document.body.classList.remove('gui');
    }

    if (noUser) document.body.classList.add('no-user');
    else {
        if (username) document.querySelector('.username').textContent = username;
        if (avatar) document.querySelector('.avatar').src = avatar;
        if (verified) document.querySelector('.msgEmbed > .contents').classList.add('verified');
    }

    for (const e of document.querySelectorAll('.clickable > img'))
        e.parentElement.addEventListener('mouseup', el => window.open(el.target.src));

    const editorHolder = document.querySelector('.editorHolder'),
        guiParent = document.querySelector('.top'),
        embedContent = document.querySelector('.messageContent'),
        embedCont = document.querySelector('.msgEmbed>.container'),
        gui = guiParent.querySelector('.gui:first-of-type');

    editor = CodeMirror(elt => editorHolder.parentNode.replaceChild(elt, editorHolder), {
        value: JSON.stringify(json, null, 4),
        gutters: ["CodeMirror-foldgutter", "CodeMirror-lint-markers"],
        scrollbarStyle: "overlay",
        mode: "application/json",
        theme: 'material-darker',
        matchBrackets: true,
        foldGutter: true,
        lint: true,
        extraKeys: {
            // Make tabs four spaces long instead of the default two.
            Tab: cm => cm.replaceSelection("    ", "end"),
            // Fill in indent spaces on a new line when enter (return) key is pressed.
            Enter: _ => {
                let cur = editor.getCursor(), end = editor.getLine(cur.line),
                    leadingSpaces = end.replace(/\S($|.)+/g, '') || '    \n', nextLine = editor.getLine(cur.line + 1);
                if ((nextLine === undefined || !nextLine.trim()) && !end.substr(cur.ch).trim())
                    editor.replaceRange('\n', { line: cur.line, ch: cur.ch });
                else
                    editor.replaceRange(`\n${end.endsWith('{') ? leadingSpaces + '    ' : leadingSpaces}`, {
                        line: cur.line,
                        ch: cur.ch
                    });
            },
        }
    });

    editor.focus();

    const notif = document.querySelector('.notification');

    error = (msg, time) => {
        if (msg === false)
            // Hide error element
            return notif.animate({ opacity: '0', bottom: '-50px', offset: 1 }, { easing: 'ease', duration: 500 }).onfinish = () => notif.style.removeProperty('display');
        notif.innerHTML = msg;
        notif.style.display = 'block';
        time && setTimeout(() => notif.animate({ opacity: '0', bottom: '-50px', offset: 1 }, { easing: 'ease', duration: 500 })
            .onfinish = () => notif.style.removeProperty('display'), time);
        return false;
    };

    const url = (url) => /^(https?:)?\/\//g.exec(url) ? url : '//' + url;

    const makeShort = (txt, length, mediaWidth) => {
        if (mediaWidth && matchMedia(`(max-width:${mediaWidth}px)`).matches)
            return txt.length > (length - 3) ? txt.substring(0, length - 3) + '...' : txt;
        return txt;
    }

    const allGood = embedObj => {
        let invalid, err, unimportant = true;
        let str = JSON.stringify(embedObj, null, 4)
        let re = /("(?:icon_)?url": *")((?!\w+?:\/\/).+)"/g.exec(str);

        if (embedObj.timestamp && new Date(embedObj.timestamp).toString() === "Invalid Date") {
            if (allowPlaceholders === 2) return true;
            if (!allowPlaceholders) unimportant = false, invalid = true, err = 'Timestamp is invalid';
        } else if (re) { // If a URL is found without a protocol
            if (!/\w+:|\/\/|^\//g.exec(re[2]) && re[2].includes('.')) {
                let activeInput = document.querySelector('input[class$="link" i]:focus')
                if (activeInput && !allowPlaceholders) {
                    lastPos = activeInput.selectionStart + 7;
                    activeInput.value = `http://${re[2]}`;
                    activeInput.setSelectionRange(lastPos, lastPos)
                    return true;
                }
            }
            if (allowPlaceholders !== 2)
                invalid = true, err = (`URL should have a protocol. Did you mean <span class="inline full short">http://${makeShort(re[2], 30, 600).replace(' ', '')}</span>?`);
        }

        if (invalid) {
            validationError = true;
            // return error(err, 5000) || unimportant;
            return multiEmbeds ? error(err, 5000) : error(err);
        }

        return true;
    }

    const innerHTML = (element, html) => {
        // console.log(element, html);
        element.innerHTML = html;
        return element;
    }

    const markup = (txt, opts) => {
        if (opts.replaceEmojis)
            txt = txt.replace(/(?<!code(?: \w+=".+")?>[^>]+)(?<!\/[^\s"]+?):((?!\/)\w+):/g, (match, p) => p && emojis[p] ? emojis[p] : match);

        txt = txt
            /** Markdown */
            .replace(/&#60;:\w+:(\d{18})&#62;/g, '<img class="emoji" src="https://cdn.discordapp.com/emojis/$1.png"/>')
            .replace(/&#60;a:\w+:(\d{18})&#62;/g, '<img class="emoji" src="https://cdn.discordapp.com/emojis/$1.gif"/>')
            .replace(/~~(.+?)~~/g, '<s>$1</s>')
            .replace(/\*\*\*(.+?)\*\*\*/g, '<em><strong>$1</strong></em>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.+?)__/g, '<u>$1</u>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/_(.+?)_/g, '<em>$1</em>')
            // Replace >>> and > with block-quotes. &#62; is HTML code for >
            .replace(/^(?: *&#62;&#62;&#62; ([\s\S]*))|(?:^ *&#62;(?!&#62;&#62;) +.+\n)+(?:^ *&#62;(?!&#62;&#62;) .+\n?)+|^(?: *&#62;(?!&#62;&#62;) ([^\n]*))(\n?)/mg, (all, match1, match2, newLine) => {
                return `<div class="blockquote"><div class="blockquoteDivider"></div><blockquote>${match1 || match2 || newLine ? match1 || match2 : all.replace(/^ *&#62; /gm, '')}</blockquote></div>`;
            })

            /** Mentions */
            .replace(/&#60;#\d+&#62;/g, () => `<span class="mention channel interactive">channel</span>`)
            .replace(/&#60;@(?:&#38;|!)?\d+&#62;|@(?:everyone|here)/g, match => {
                if (match.startsWith('@')) return `<span class="mention">${match}</span>`
                else return `<span class="mention interactive">@${match.includes('&#38;') ? 'role' : 'user'}</span>`
            })

        if (opts.inlineBlock)
            // Treat both inline code and code blocks as inline code
            txt = txt.replace(/`([^`]+?)`|``([^`]+?)``|```((?:\n|.)+?)```/g, (m, x, y, z) => x ? `<code class="inline">${x}</code>` : y ? `<code class="inline">${y}</code>` : z ? `<code class="inline">${z}</code>` : m);
        else {
            // Code block
            txt = txt.replace(/```(?:([a-z0-9_+\-.]+?)\n)?\n*([^\n][^]*?)\n*```/ig, (m, w, x) => {
                if (w) return `<pre><code class="${w}">${x.trim()}</code></pre>`
                else return `<pre><code class="hljs nohighlight">${x.trim()}</code></pre>`
            });
            // Inline code
            txt = txt.replace(/`([^`]+?)`|``([^`]+?)``/g, (m, x, y, z) => x ? `<code class="inline">${x}</code>` : y ? `<code class="inline">${y}</code>` : z ? `<code class="inline">${z}</code>` : m)
        }

        if (opts.inEmbed)
            txt = txt.replace(/\[([^\[\]]+)\]\((.+?)\)/g, `<a title="$1" target="_blank" class="anchor" href="$2">$1</a>`);

        return txt;
    }

    // embedGrid = document.querySelector('.embedGrid'),
    // msgEmbed = document.querySelector('.msgEmbed'),
    // embedTitle = document.querySelector('.embedTitle'),
    // embedDescription = document.querySelector('.embedDescription'),
    // embedAuthor = document.querySelector('.embedAuthor'),
    // embedFooter = document.querySelector('.embedFooter'),
    // embedImage = document.querySelector('.embedImage > img'),
    // embedThumbnail = document.querySelector('.embedThumbnail > img'),
    // embedFields = embedGrid.querySelector('.embedFields'),

    const smallerScreen = matchMedia('(max-width: 1015px)');

    const encodeHTML = str => str.replace(/[\u00A0-\u9999<>\&]/g, i => '&#' + i.charCodeAt(0) + ';');

    const timestamp = stringISO => {
        let date = stringISO ? new Date(stringISO) : new Date(),
            dateArray = date.toLocaleString('en-US', { hour: 'numeric', hour12: false, minute: 'numeric' }),
            today = new Date(),
            yesterday = new Date(new Date().setDate(today.getDate() - 1));
        return today.toDateString() === date.toDateString() ? `Today at ${dateArray}` :
            yesterday.toDateString() === date.toDateString() ? `Yesterday at ${dateArray}` :
                `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
    }

    const display = (el, data, displayType) => {
        if (data) innerHTML(el, data);
        el.style.display = displayType || "unset";
    }

    const hide = el => el.style.removeProperty('display'),
        imgSrc = (elm, src, remove) => remove ? elm.style.removeProperty('content') : elm.style.content = `url(${src})`;

    const [guiFragment, fieldFragment, embedFragment, guiEmbedAddFragment] = Array.from({ length: 4 }, () => document.createDocumentFragment());
    embedFragment.appendChild(document.querySelector('.embed.markup').cloneNode(true));
    guiEmbedAddFragment.appendChild(document.querySelector('.guiEmbedAdd').cloneNode(true));
    fieldFragment.appendChild(document.querySelector('.edit>.fields>.field').cloneNode(true));

    document.querySelector('.embed.markup').remove();
    gui.querySelector('.edit>.fields>.field').remove();

    for (const child of gui.childNodes)
        guiFragment.appendChild(child.cloneNode(true));

    buildGui = (object = jsonObject, opts) => {
        gui.innerHTML = '';
        gui.appendChild(guiEmbedAddFragment.firstChild.cloneNode(true))
            .addEventListener('click', () => {
                if (indexOfEmptyGuiEmbed('(empty embed)') !== -1) return;
                // unsedEmbeds.push({});
                jsonObject.embeds.push({});
                buildGui();
            });

        for (const child of Array.from(guiFragment.childNodes)) {
            if (child.classList?.[1] === 'content')
                gui.insertBefore(gui.appendChild(child.cloneNode(true)), gui.appendChild(child.nextElementSibling.cloneNode(true))).nextElementSibling.firstElementChild.value = object.content || '';
            else if (child.classList?.[1] === 'guiEmbedName')
                // for (const [i, embed] of [...object.embeds, ...unsedEmbeds].entries()) {
                for (const [i, embed] of object.embeds.entries()) {
                    const guiEmbedName = gui.appendChild(child.cloneNode(true))

                    guiEmbedName.querySelector('.text').innerHTML = `Embed ${i + 1}${embed.title ? `: <span>${embed.title}</span>` : ''}`;
                    guiEmbedName.querySelector('.icon').addEventListener('click', () => {
                        object.embeds.splice(i, 1);
                        buildGui();
                        buildEmbed();
                    });

                    const guiEmbed = gui.appendChild(createElement({ 'div': { className: 'guiEmbed' } }));
                    const guiEmbedTemplate = child.nextElementSibling;

                    for (const child2 of Array.from(guiEmbedTemplate.children)) {
                        if (!child2.classList.contains('edit')) {
                            const row = guiEmbed.appendChild(child2.cloneNode(true));
                            const edit = child2.nextElementSibling?.cloneNode(true);
                            edit?.classList.contains('edit') && guiEmbed.appendChild(edit);

                            switch (child2.classList[1]) {
                                case 'author':
                                    const authorURL = embed?.author?.icon_url || '';
                                    if (authorURL)
                                        edit.querySelector('.imgParent').style.content = 'url(' + encodeHTML(authorURL) + ')';
                                    edit.querySelector('.editAuthorLink').value = authorURL;
                                    edit.querySelector('.editAuthorName').value = embed?.author?.name || '';
                                    break;
                                case 'title':
                                    row.querySelector('.editTitle').value = embed?.title || '';
                                    break;
                                case 'description':
                                    edit.querySelector('.editDescription').value = embed?.description || '';
                                    break;
                                case 'thumbnail':
                                    const thumbnailURL = embed?.thumbnail?.url || '';
                                    if (thumbnailURL)
                                        edit.querySelector('.imgParent').style.content = 'url(' + encodeHTML(thumbnailURL) + ')';
                                    edit.querySelector('.editThumbnailLink').value = thumbnailURL;
                                    break;
                                case 'image':
                                    const imageURL = embed?.image?.url || '';
                                    if (imageURL)
                                        edit.querySelector('.imgParent').style.content = 'url(' + encodeHTML(imageURL) + ')';
                                    edit.querySelector('.editImageLink').value = imageURL;
                                    break;
                                case 'footer':
                                    const footerURL = embed?.footer?.icon_url || '';
                                    if (footerURL)
                                        edit.querySelector('.imgParent').style.content = 'url(' + encodeHTML(footerURL) + ')';
                                    edit.querySelector('.editFooterLink').value = footerURL;
                                    edit.querySelector('.editFooterText').value = embed?.footer?.text || '';
                                    break;
                                case 'fields':
                                    for (const f of embed?.fields || []) {
                                        const fields = edit.querySelector('.fields');
                                        const field = fields.appendChild(createElement({ 'div': { className: 'field' } }));

                                        for (const child of Array.from(fieldFragment.firstChild.children)) {
                                            const newChild = field.appendChild(child.cloneNode(true));

                                            if (child.classList.contains('inlineCheck'))
                                                newChild.querySelector('input').checked = !!f.inline;

                                            // else if (child.classList.contains('removeBtn'))
                                            //     newChild.addEventListener('click', () => {
                                            //         const index = Array.from(fields.children).indexOf(field);
                                            //         if (jsonObject.embeds[i].fields[index] !== -1) {
                                            //             object.embeds[i].fields.splice(index, 1);
                                            //             field.remove();
                                            //             buildEmbed();
                                            //         }
                                            //     })

                                            else if (f.value && child.classList?.contains('fieldInner'))
                                                newChild.querySelector('.designerFieldName input').value = f.name || '',
                                                    newChild.querySelector('.designerFieldValue textarea').value = f.value || '';
                                        }
                                    }
                            }
                        }
                    }
                }

            // Expand last embed in GUI
            const names = gui.querySelectorAll('.guiEmbedName');
            names[names.length - 1]?.classList.add('active');
        }

        for (const e of document.querySelectorAll('.top>.gui .item'))
            e.addEventListener('click', el => {
                const item = el.target.closest('.gui .item');

                if (item?.classList.contains('active'))
                    getSelection().anchorNode !== item && item.classList.remove('active');
                else if (item) {
                    let inlineField = item.closest('.inlineField'),
                        input = item.nextElementSibling.querySelector('input[type="text"]'),
                        txt = item.nextElementSibling.querySelector('textarea');

                    item.classList.add('active');
                    if (item.classList.contains('guiEmbedName'))
                        return changeLastActiveGuiEmbed(Array.from(gui.querySelectorAll('.guiEmbedName')).indexOf(item));
                    else if (inlineField)
                        inlineField.querySelector('.ttle~input').focus();
                    else if (input) {
                        !smallerScreen.matches && input.focus();
                        input.selectionStart = input.selectionEnd = input.value.length;
                    }

                    else if (txt && !smallerScreen.matches)
                        txt.focus();

                    if (item.classList.contains('fields')) {
                        if (reverseColumns && smallerScreen.matches)
                            // return elm.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: "end" });
                            return item.parentNode.scrollTop = item.offsetTop;

                        item.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }
            })

        content = gui.querySelector('.editContent');
        title = gui.querySelector('.editTitle');
        authorName = gui.querySelector('.editAuthorName');
        authorLink = gui.querySelector('.editAuthorLink');
        desc = gui.querySelector('.editDescription');
        thumbLink = gui.querySelector('.editThumbnailLink');
        imgLink = gui.querySelector('.editImageLink');
        footerText = gui.querySelector('.editFooterText');
        footerLink = gui.querySelector('.editFooterLink');

        // Scroll into view when tabs are opened in the GUI.
        const lastTabs = Array.from(document.querySelectorAll('.footer.rows2, .image.largeImg'));
        const requiresView = matchMedia(`${smallerScreen.media}, (max-height: 845px)`);
        const addGuiEventListeners = () => {
            for (const e of document.querySelectorAll('.gui .item:not(.fields)'))
                e.onclick = () => {
                    if (lastTabs.includes(e) || requiresView.matches) {
                        if (!reverseColumns || !smallerScreen.matches)
                            e.scrollIntoView({ behavior: 'smooth', block: "center" });
                        else if (e.nextElementSibling.classList.contains('edit') && e.classList.contains('active'))
                            // e.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: "end" });
                            e.parentNode.scrollTop = e.offsetTop;
                    }
                };

            for (const e of document.querySelectorAll('.addField'))
                e.onclick = () => {
                    const guiEmbed = e.closest('.guiEmbed');
                    const indexOfGuiEmbed = Array.from(gui.querySelectorAll('.guiEmbed')).indexOf(guiEmbed);
                    if (indexOfGuiEmbed === -1) return error('Could not find the embed to add the field to.', 5000);

                    const fieldsObj = jsonObject.embeds[indexOfGuiEmbed].fields ??= [];
                    if (fieldsObj.length >= 25) return error('Cannot have more than 25 fields', 5000);
                    fieldsObj.push({ name: "Field name", value: "Field value", inline: false });

                    const newField = guiEmbed?.querySelector('.item.fields+.edit>.fields')?.appendChild(fieldFragment.firstChild.cloneNode(true));

                    buildEmbed();
                    addGuiEventListeners();

                    newField.scrollIntoView({ behavior: "smooth", block: "center" });
                    if (!smallerScreen.matches) {
                        const firstFieldInput = newField.querySelector('.designerFieldName input');

                        firstFieldInput?.setSelectionRange(firstFieldInput.value.length, firstFieldInput.value.length);
                        firstFieldInput?.focus();
                    }
                };

            for (const e of document.querySelectorAll('.fields .field .removeBtn'))
                e.onclick = () => {
                    const embedIndex = guiEmbedIndex(e);
                    const fieldIndex = Array.from(e.closest('.fields').children).indexOf(e.closest('.field'));

                    if (jsonObject.embeds[embedIndex]?.fields[fieldIndex] === -1)
                        return error('Failed to find the index of the field to remove.', 5000);

                    jsonObject.embeds[embedIndex].fields.splice(fieldIndex, 1);

                    buildEmbed();
                    e.closest('.field').remove();
                };

            for (const e of gui.querySelectorAll('textarea, input'))
                e.oninput = el => {
                    const value = el.target.value;
                    const index = guiEmbedIndex(el.target);
                    const field = el.target.closest('.field');
                    const fields = field?.closest('.fields');

                    if (field) {
                        const jsonField = jsonObject.embeds[index].fields[Array.from(fields.children).indexOf(field)];
                        if (jsonField)
                            if (el.target.type === 'text') jsonField.name = value;
                            else if (el.target.type === 'textarea') jsonField.value = value;
                            else jsonField.inline = el.target.checked;
                    } else {
                        // if (!jsonObject.embeds[index])
                        //     jsonObject.embeds[index] = unsedEmbeds.pop() || {};

                        switch (el.target.classList?.[0]) {
                            case 'editContent': jsonObject.content = value; break;
                            case 'editTitle':
                                jsonObject.embeds[index].title = value;
                                const guiEmbedName = e.closest('.guiEmbed')?.previousElementSibling;
                                if (guiEmbedName?.classList.contains('guiEmbedName'))
                                    guiEmbedName.querySelector('.text').innerHTML = `${guiEmbedName.innerText.split(':')[0]}${value ? `: <span>${value}</span>` : ''}`;
                                break;
                            case 'editAuthorName': jsonObject.embeds[index].author ??= {}, jsonObject.embeds[index].author.name = value; break;
                            case 'editAuthorLink': jsonObject.embeds[index].author ??= {}, jsonObject.embeds[index].author.icon_url = value;
                                imgSrc(el.target.previousElementSibling, value);
                                break;
                            case 'editDescription': jsonObject.embeds[index].description = value;
                                break;
                            case 'editThumbnailLink':
                                jsonObject.embeds[index].thumbnail ??= {}, jsonObject.embeds[index].thumbnail.url = value;
                                imgSrc(el.target.closest('.editIcon').querySelector('.imgParent'), value);
                                break;
                            case 'editImageLink':
                                jsonObject.embeds[index].image ??= {}, jsonObject.embeds[index].image.url = value;
                                imgSrc(el.target.closest('.editIcon').querySelector('.imgParent'), value);
                                break;
                            case 'editFooterText': jsonObject.embeds[index].footer ??= {}, jsonObject.embeds[index].footer.text = value; break;
                            case 'editFooterLink': jsonObject.embeds[index].footer ??= {}, jsonObject.embeds[index].footer.icon_url = value;
                                imgSrc(el.target.previousElementSibling, value);
                                break;
                        }

                        // Find and remove any empty objects ({}) in the embeds array as Discord doesn't like them.
                        const nonEmptyEmbedObjects = json.embeds?.filter(o => 0 in Object.keys(o));
                        if (nonEmptyEmbedObjects?.length)
                            json.embeds = nonEmptyEmbedObjects;
                    }

                    buildEmbed();
                };

            for (const input of document.querySelectorAll('input[type="file"]'))
                input.onchange = e => {
                    if (input.files) {
                        const form = e.target.parentElement;
                        const formData = new FormData(form);
                        const fileInput = document.querySelectorAll('input[type="file"]');

                        formData.append('file', fileInput.files);
                        formData.append('datetime', '5m');

                        fetch('https://tempfile.site/api/files', { method: 'POST', body: formData })
                            .then(res => res.json())
                            .then(res => {
                                const browse = form.closest('.edit').querySelector('.browse');

                                browse.classList.remove('loading');
                                if (!res.ok) {
                                    console.log(res.error);
                                    browse.classList.add('error');
                                    return setTimeout(() => browse.classList.remove('error'), 5000)
                                }

                                imgSrc(form.previousElementSibling.querySelector('.editIcon > .imgParent') || form.closest('.editIcon').querySelector('.imgParent'), res.link);
                                const input = form.previousElementSibling.querySelector('.editIcon > input') || form.previousElementSibling;
                                input.value = res.link;

                                const msg = `File (${res.link}) will be deleted in 5 minutes. To delete it now, go to ${res.link.replace('/files', '/del')} and enter this code: ${res.authkey}`;
                                console.info(msg);

                                input.dispatchEvent(new Event('input'));
                                // !smallerScreen.matches && setTimeout(error, 1500, `Image will be deleted in 5 minutes. To delete it now, go to ${res.link.replace('/files', '/del')} and enter this code: ${res.authkey}`, 20000);
                            }).catch(err => error(`Request to tempfile.site failed with error: ${err}`, 5000))

                        e.target.closest('.edit').querySelector('.browse').classList.add('loading');
                    }
                };

            if (multiEmbeds) {
                for (const e of document.querySelectorAll('.guiEmbed'))
                    e.onclick = () => {
                        const guiEmbed = e.closest('.guiEmbed');
                        const indexOfGuiEmbed = Array.from(gui.querySelectorAll('.guiEmbed')).indexOf(guiEmbed);
                        if (indexOfGuiEmbed === -1) return error('Could not find the embed to add the field to.', 5000);

                        changeLastActiveGuiEmbed(indexOfGuiEmbed);
                    };


                if (!jsonObject.embeds[lastActiveGuiEmbedIndex])
                    changeLastActiveGuiEmbed(
                        jsonObject.embeds[lastActiveGuiEmbedIndex - 1] ?
                            lastActiveGuiEmbedIndex - 1 :
                            jsonObject.embeds.length ? 0 : -1
                    );
            } else {
                changeLastActiveGuiEmbed(-1);
            }
        }

        addGuiEventListeners();

        let activeGuiEmbed;

        if (opts?.guiEmbedIndex) {
            activeGuiEmbed = Array.from(document.querySelectorAll('.gui .item.guiEmbedName'))[opts.guiEmbedIndex];
            activeGuiEmbed?.classList.add('active');
            activeGuiEmbed = activeGuiEmbed?.nextElementSibling;
        }


        if (opts?.activateClassNames)
            for (const cName of opts.activateClassNames)
                for (const e of document.getElementsByClassName(cName))
                    e.classList.add('active');

        else if (opts?.guiTabs) {
            const tabs = opts.guiTabs.split?.(/, */) || opts.guiTabs, bottomKeys = ['footer', 'image'], topKeys = ['author', 'content'];
            document.querySelectorAll(`.${tabs.join(', .')}`).forEach(e => e.classList.add('active'));

            // Autoscroll GUI to the bottom if necessary.
            if (!tabs.some(item => topKeys.includes(item)) && tabs.some(item => bottomKeys.includes(item))) {
                const gui2 = document.querySelector('.top .gui');
                gui2.scrollTo({ top: gui2.scrollHeight });
            }
        }

        else if (opts?.activate)
            for (const clss of Array.from(opts.activate).map(el => el.className).map(clss => '.' + clss.split(' ').slice(0, 2).join('.')))
                for (const e of document.querySelectorAll(clss))
                    e.classList.add('active');

        else for (const clss of document.querySelectorAll('.item.author, .item.description'))
            clss.classList.add('active');
    }

    buildGui(jsonObject, { guiTabs });
    gui.classList.remove('hidden');

    fields = gui.querySelector('.fields ~ .edit .fields');

    buildEmbed = (jsonObj, guiEmbedOrChild) => {
        if (jsonObj) json = jsonObj;

        try {
            if (!jsonObject.content) document.body.classList.add('emptyContent');
            else {
                innerHTML(embedContent, markup(encodeHTML(jsonObject.content), { replaceEmojis: true }));
                document.body.classList.remove('emptyContent');
            }

            if (!jsonObject.embeds?.length)
                document.body.classList.add('emptyEmbed');

            if (multiEmbeds) embedCont.innerHTML = '';

            for (const embedObj of jsonObject.embeds) {
                if (!allGood(embedObj)) continue;
                if (!multiEmbeds) embedCont.innerHTML = '';

                validationError = false;

                const embedElement = embedCont.appendChild(embedFragment.firstChild.cloneNode(true));
                const embedGrid = embedElement.querySelector('.embedGrid');
                const msgEmbed = embedElement.querySelector('.msgEmbed');
                const embedTitle = embedElement.querySelector('.embedTitle');
                const embedDescription = embedElement.querySelector('.embedDescription');
                const embedAuthor = embedElement.querySelector('.embedAuthor');
                const embedFooter = embedElement.querySelector('.embedFooter');
                const embedImage = embedElement.querySelector('.embedImage > img');
                const embedThumbnail = embedElement.querySelector('.embedThumbnail > img');
                const embedFields = embedElement.querySelector('.embedFields');

                if (embedObj.title) display(embedTitle, markup(`${embedObj.url ? '<a class="anchor" target="_blank" href="' + encodeHTML(url(embedObj.url)) + '">' + encodeHTML(embedObj.title) + '</a>' : encodeHTML(embedObj.title)}`, { replaceEmojis: true, inlineBlock: true }));
                else hide(embedTitle);

                if (embedObj.description) display(embedDescription, markup(encodeHTML(embedObj.description), { inEmbed: true, replaceEmojis: true }));
                else hide(embedDescription);

                if (embedObj.color) embedGrid.closest('.embed').style.borderColor = (typeof embedObj.color === 'number' ? '#' + embedObj.color.toString(16).padStart(6, "0") : embedObj.color);
                else embedGrid.closest('.embed').style.removeProperty('border-color');

                if (embedObj.author?.name) display(embedAuthor, `
                    ${embedObj.author.icon_url ? '<img class="embedAuthorIcon" src="' + encodeHTML(url(embedObj.author.icon_url)) + '">' : ''}
                    ${embedObj.author.url ? '<a class="embedAuthorNameLink embedLink embedAuthorName" href="' + encodeHTML(url(embedObj.author.url)) + '" target="_blank">' + encodeHTML(embedObj.author.name) + '</a>' : '<span class="embedAuthorName">' + encodeHTML(embedObj.author.name) + '</span>'}`, 'flex');
                else hide(embedAuthor);

                const pre = embedGrid.querySelector('.markup pre');
                if (embedObj.thumbnail?.url) {
                    embedThumbnail.src = embedObj.thumbnail.url,
                        embedThumbnail.parentElement.style.display = 'block';
                    if (pre) pre.style.maxWidth = '90%';
                } else {
                    hide(embedThumbnail.parentElement);
                    if (pre) pre.style.removeProperty('max-width');
                }

                if (embedObj.image?.url)
                    embedImage.src = embedObj.image.url,
                        embedImage.parentElement.style.display = 'block';
                else hide(embedImage.parentElement);

                if (embedObj.footer?.text) display(embedFooter, `
                    ${embedObj.footer.icon_url ? '<img class="embedFooterIcon" src="' + encodeHTML(url(embedObj.footer.icon_url)) + '">' : ''}<span class="embedFooterText">
                        ${encodeHTML(embedObj.footer.text)}
                    ${embedObj.timestamp ? '<span class="embedFooterSeparator">•</span>' + encodeHTML(timestamp(embedObj.timestamp)) : ''}</span></div>`, 'flex');
                else if (embedObj.timestamp) display(embedFooter, `<span class="embedFooterText">${encodeHTML(timestamp(embedObj.timestamp))}</span></div>`, 'flex');
                else hide(embedFooter);

                if (embedObj.fields) {
                    innerHTML(embedFields, '');
                    let index, gridCol;

                    embedObj.fields.forEach((f, i) => {
                        if (f.name && f.value) {
                            let fieldElement = embedFields.insertBefore(document.createElement('div'), null);
                            // Figuring out if there are only two fields on a row to give them more space.
                            // e.fields = json.embeds.fields.

                            // if both the field of index 'i' and the next field on its right are inline and -
                            if (embedObj.fields[i].inline && embedObj.fields[i + 1]?.inline &&
                                // it's the first field in the embed or -
                                ((i === 0 && embedObj.fields[i + 2] && !embedObj.fields[i + 2].inline) || ((
                                    // it's not the first field in the embed but the previous field is not inline or - 
                                    i > 0 && !embedObj.fields[i - 1].inline ||
                                    // it has 3 or more fields behind it and 3 of those are inline except the 4th one back if it exists -
                                    i >= 3 && embedObj.fields[i - 1].inline && embedObj.fields[i - 2].inline && embedObj.fields[i - 3].inline && (embedObj.fields[i - 4] ? !embedObj.fields[i - 4].inline : !embedObj.fields[i - 4])
                                    // or it's the first field on the last row or the last field on the last row is not inline or it's the first field in a row and it's the last field on the last row.
                                ) && (i == embedObj.fields.length - 2 || !embedObj.fields[i + 2].inline))) || i % 3 === 0 && i == embedObj.fields.length - 2) {
                                // then make the field halfway (and the next field will take the other half of the embed).
                                index = i, gridCol = '1 / 7';
                            }
                            // The next field.
                            if (index === i - 1)
                                gridCol = '7 / 13';

                            if (!f.inline)
                                fieldElement.outerHTML = `
                                    <div class="embedField" style="grid-column: 1 / 13;">
                                        <div class="embedFieldName">${markup(encodeHTML(f.name), { inEmbed: true, replaceEmojis: true, inlineBlock: true })}</div>
                                        <div class="embedFieldValue">${markup(encodeHTML(f.value), { inEmbed: true, replaceEmojis: true })}</div>
                                    </div>`;
                            else {
                                if (i && !embedObj.fields[i - 1].inline) colNum = 1;

                                fieldElement.outerHTML = `
                                    <div class="embedField ${num}${gridCol ? ' colNum-2' : ''}" style="grid-column: ${gridCol || (colNum + ' / ' + (colNum + 4))};">
                                        <div class="embedFieldName">${markup(encodeHTML(f.name), { inEmbed: true, replaceEmojis: true, inlineBlock: true })}</div>
                                        <div class="embedFieldValue">${markup(encodeHTML(f.value), { inEmbed: true, replaceEmojis: true })}</div>
                                    </div>`;

                                if (index !== i) gridCol = false;
                            }
                            colNum = (colNum === 9 ? 1 : colNum + 4);
                            num++;
                        }
                    });

                    document.querySelectorAll('.embedField[style="grid-column: 1 / 5;"]').forEach(e => {
                        if (!e.nextElementSibling || e.nextElementSibling.style.gridColumn === '1 / 13')
                            e.style.gridColumn = '1 / 13';
                    });
                    colNum = 1;

                    display(embedFields, undefined, 'grid');
                } else hide(embedFields);

                document.body.classList.remove('emptyEmbed');
                for (const block of document.querySelectorAll('.markup pre > code'))
                    hljs.highlightBlock(block);

                if (embedElement.innerText.trim() || embedElement.querySelector('.embedGrid > [style*=display] img'))
                    embedElement.classList.remove('emptyEmbed');
                else
                    embedElement.classList.add('emptyEmbed');

                !multiEmbeds && error(false);
                twemoji.parse(document.querySelector('.msgEmbed'));
            }

            // Make sure that the embed has no text or any visible images such as custom emojis before hiding.
            if (!multiEmbeds && !embedCont.innerText.trim() && !embedCont.querySelector('.embedGrid > [style*=display] img'))
                document.body.classList.add('emptyEmbed');

            autoUpdateURL && urlOptions({ set: ['data', jsonToBase64(json)] })
        } catch (e) {
            console.error(e);
            error(e);
        }
    }

    editor.on('change', editor => {
        try {
            // Autofill when " is typed on new line
            const line = editor.getCursor().line;
            const text = editor.getLine(line)

            if (text.trim() === '"') {
                editor.replaceRange(text.trim() + ':', { line, ch: line.length });
                editor.setCursor(line, text.length)
            }

            const jsonData = JSON.parse(editor.getValue());
            const dataKeys = Object.keys(jsonData);

            if (dataKeys.length && !jsonKeys.some(key => dataKeys.includes(key))) {
                let usedKeys = dataKeys.filter(key => !jsonKeys.includes(key));
                if (usedKeys.length > 2)
                    return error(`'${usedKeys[0] + "', '" + usedKeys.slice(1, usedKeys.length - 1).join("', '")}', and '${usedKeys[usedKeys.length - 1]}' are invalid keys.`);
                return error(`'${usedKeys.length == 2 ? usedKeys[0] + "' and '" + usedKeys[usedKeys.length - 1] + "' are invalid keys." : usedKeys[0] + "' is an invalid key."}`);
            }

            // else if (!validationError)
            //     error(false);

            buildEmbed(jsonData);

        } catch (e) {
            if (editor.getValue()) return;
            document.body.classList.add('emptyEmbed');
            innerHTML(embedContent, '');
        }
    });

    const picker = new CP(document.querySelector('.picker'),
        state = { parent: document.querySelector('.cTop') });

    picker.fire('change', toRGB('#41f097'));

    let colors = document.querySelector('.colors'),
        hexInput = colors.querySelector('.hex>div input'),
        typingHex = true, exit = false,

        removePicker = () => {
            if (exit) return exit = false;
            if (typingHex) picker.enter();
            else {
                typingHex = false, exit = true;
                colors.classList.remove('picking');
                picker.exit();
            }
        }
    document.querySelector('.colBack').addEventListener('click', () => {
        picker.self.remove();
        typingHex = false;
        removePicker();
    })

    picker.on('exit', removePicker);
    picker.on('enter', () => {
        if (jsonObject?.embed?.color) {
            hexInput.value = jsonObject.embed.color.toString(16).padStart(6, '0');
            document.querySelector('.hex.incorrect')?.classList.remove('incorrect');
        }
        colors.classList.add('picking')
    })

    document.querySelectorAll('.color').forEach(e => e.addEventListener('click', el => {
        const embedIndex = multiEmbeds && lastActiveGuiEmbedIndex !== -1 ? lastActiveGuiEmbedIndex : 0;
        const embed = document.querySelectorAll('.msgEmbed .container>.embed')[embedIndex];
        const embedObj = jsonObject.embeds[embedIndex];

        const clr = el.target.closest('.color');
        embedObj.color = toRGB(clr.style.backgroundColor, false, true);
        embed.style.borderColor = clr.style.backgroundColor;
        picker.source.style.removeProperty('background');
    }))

    hexInput.addEventListener('focus', () => typingHex = true);
    setTimeout(() => {
        picker.on('change', function (r, g, b, a) {
            const embedIndex = multiEmbeds && lastActiveGuiEmbedIndex !== -1 ? lastActiveGuiEmbedIndex : 0;
            const embed = document.querySelectorAll('.msgEmbed .container>.embed')[embedIndex];
            const embedObj = jsonObject.embeds[embedIndex];

            picker.source.style.background = this.color(r, g, b);
            embedObj.color = parseInt(this.color(r, g, b).slice(1), 16);
            embed.style.borderColor = this.color(r, g, b);
            hexInput.value = embedObj.color.toString(16).padStart(6, '0');
        })
    }, 1000)

    document.querySelector('.timeText').innerText = timestamp();

    for (const block of document.querySelectorAll('.markup pre > code'))
        hljs.highlightBlock(block);

    document.querySelector('.opt.gui').addEventListener('click', () => {
        json = JSON.parse(editor.getValue() || '{}');

        if (lastGuiJson && lastGuiJson !== JSON.stringify(json, null, 4))
            buildGui(json);
            
        lastGuiJson = false
        activeFields = null;

        document.body.classList.add('gui');
        if (pickInGuiMode) {
            pickInGuiMode = false;
            togglePicker();
        }
    })

    document.querySelector('.opt.json').addEventListener('click', () => {
        const emptyEmbedIndex = indexOfEmptyGuiEmbed(false);
        if (emptyEmbedIndex !== -1)
            // Clicked GUI tab while a blank embed is added from GUI.
            return error(gui.querySelectorAll('.item.guiEmbedName')[emptyEmbedIndex].innerText.split(':')[0] + ' should not be empty.', 3000);

        const jsonStr = JSON.stringify(json, null, 4);
        lastGuiJson = jsonStr;

        document.body.classList.remove('gui');
        editor.setValue(jsonStr === '{}' ? '{\n\t\n}' : jsonStr);
        editor.refresh();
        editor.focus();

        activeFields = document.querySelectorAll('.gui > .item.active');
        if (document.querySelector('section.side1.low'))
            togglePicker(true);
    })

    document.querySelector('.clear').addEventListener('click', () => {
        jsonObject = {};

        embedGrid.style.removeProperty('border-color');
        picker.source.style.removeProperty('background');

        buildEmbed();
        buildGui(jsonObject);
        editor.setValue('{\n\t\n}');

        for (const e of document.querySelectorAll('.gui .item'))
            e.classList.add('active');

        if (!smallerScreen.matches)
            content.focus();
    })

    document.querySelector('.top-btn.menu')?.addEventListener('click', e => {
        if (e.target.closest('.item.dataLink')) {
            const data = jsonToBase64(jsonObject, true).replace(/=&/g, '&');
            // With long text inside a 'prompt' on Chromium based browsers, some text will but cut and replaced with '...'.
            // So, for the Chromium users, we copy to clipboard instead of showing a prompt.
            if (!window.chrome)
                return prompt('Here\'s the current URL with base64 embed data:', data);
            if (location.protocol === 'http:')
                // Clipboard API only works on HTTPS protocol.
                navigator.clipboard.writeText(data);
            else {
                const input = document.createElement('input');
                input.value = data;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
            }

            alert('Copied to clipboard.');
        }

        const input = e.target.closest('.item')?.querySelector('input');
        if (input) input.checked = !input.checked;

        if (e.target.closest('.item.auto')) {
            autoUpdateURL = document.body.classList.toggle('autoUpdateURL');
            if (autoUpdateURL) localStorage.setItem('autoUpdateURL', true);
            else localStorage.removeItem('autoUpdateURL');
            buildEmbed();
        } else if (e.target.closest('.item.reverse')) {
            reverse(reverseColumns);
            reverseColumns = !reverseColumns;
            toggleStored('reverseColumns');
        } else if (e.target.closest('.item.noUser')) {
            if (options.avatar) document.querySelector('img.avatar').src = options.avatar;
            document.body.classList.toggle('no-user');
            toggleStored('noUser');
        } else if (e.target.closest('.item.auto-params')) {
            if (input.checked) localStorage.setItem('autoParams', true);
            else localStorage.removeItem('autoParams');
            autoParams = input.checked;
        } else if (e.target.closest('.toggles>.item')) {
            const win = input.closest('.item').classList[2];

            if (input.checked) {
                document.body.classList.remove(`no-${win}`);
                localStorage.removeItem(`hide${win}`);
            } else {
                document.body.classList.add(`no-${win}`);
                localStorage.setItem(`hide${win}`, true);
            }
        } else if (e.target.closest('.item.multi') && !noMenuMultiEmbeds) {
            multiEmbeds = document.body.classList.toggle('multiEmbeds');

            if (multiEmbeds) localStorage.setItem('multiEmbeds', true);
            else localStorage.removeItem('multiEmbeds');

            activeFields = document.querySelectorAll('.gui > .item.active');
            if (!multiEmbeds)
                jsonObject.embeds = jsonObject.embeds?.[0] ? [jsonObject.embeds[0]] : [];

            unsedEmbeds = [];

            buildGui();
            buildEmbed();
            editor.setValue(JSON.stringify(json, null, 4));
        }

        e.target.closest('.top-btn').classList.toggle('active')
    })

    document.querySelectorAll('.img').forEach(e => {
        if (e.nextElementSibling?.classList.contains('spinner-container'))
            e.addEventListener('error', el => {
                el.target.style.removeProperty('display');
                el.target.nextElementSibling.style.display = 'block';
            })
    })

    let pickInGuiMode = false;
    togglePicker = pickLater => {
        colors.classList.toggle('display');
        document.querySelector('.side1').classList.toggle('low');
        if (pickLater) pickInGuiMode = true;
    };

    document.querySelector('.pickerToggle').addEventListener('click', () => togglePicker());
    buildEmbed(json);

    document.body.addEventListener('click', e => {
        if (e.target.classList.contains('low') || (e.target.classList.contains('top') && colors.classList.contains('display')))
            togglePicker();
    })

    document.querySelector('.colors .hex>div').addEventListener('input', e => {
        let inputValue = e.target.value;

        if (inputValue.startsWith('#'))
            e.target.value = inputValue.slice(1), inputValue = e.target.value;
        if (inputValue.length !== 6 || !/^[a-zA-Z0-9]{6}$/g.test(inputValue))
            return e.target.closest('.hex').classList.add('incorrect');

        e.target.closest('.hex').classList.remove('incorrect');
        jsonObject.embed.color = parseInt(inputValue, 16);
        buildEmbed();
    })

    if (onlyEmbed) document.querySelector('.side1')?.remove();

    document.querySelector('.top-btn.copy').addEventListener('click', e => {
        const mark = e.target.closest('.top-btn.copy').querySelector('.mark'),
            jsonData = JSON.stringify(jsonObject, null, 4),
            next = () => {
                mark.classList.remove('hidden');
                mark.previousElementSibling.classList.add('hidden');

                setTimeout(() => {
                    mark.classList.add('hidden');
                    mark.previousElementSibling.classList.remove('hidden');
                }, 1500);
            }

        if (!navigator.clipboard?.writeText(jsonData).then(next).catch(err => console.log('Could not copy to clipboard: ' + err.message))) {
            const textarea = document.createElement('textarea');

            textarea.value = jsonData;
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, 50000);
            document.execCommand('copy');
            document.body.removeChild(textarea);
            next();
        }
    });
});

Object.defineProperty(window, 'json', {
    configurable: true,
    set: val => {
        jsonObject = { content: val.content, embeds: val.embed ? [val.embed] : val.embeds || [], ...(delete val.embed && val) };
        buildEmbed();
    },
    get: () => {
        if (multiEmbeds)
            return jsonObject;

        const json = {};
        if (jsonObject.content) json.content = jsonObject.content;
        if (jsonObject.embeds?.length) json.embed = jsonObject.embeds[0];

        return json;
    },
});

console.__proto__.message = function (title, message, collapse = true) {
    collapse && this.groupCollapsed(title) || this.group(title);
    this.dir(message);
    this.groupEnd();
}