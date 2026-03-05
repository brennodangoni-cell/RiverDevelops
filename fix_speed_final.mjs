import fs from 'fs';
import path from 'path';

const fileRegex = /\.(tsx|ts|jsx|js|css)$/;
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) results = results.concat(walk(file));
        else if (fileRegex.test(file)) results.push(file);
    });
    return results;
}

const tokens = [
    // Matches transition-* classes
    /\btransition-[a-zA-Z0-9-]+\b/g,
    // Matches duration-* classes
    /\bduration-\d+\b/g,
    // Matches delay-* classes
    /\bdelay-\d+\b/g,
    // Matches ease-* classes
    /\bease-(?:linear|in-out|in|out)\b/g,
    // Matches shadow-* and drop-shadow-* classes
    // including custom shadows like shadow-[0_0_20px_rgba(255,255,255,0.4)]
    /\bshadow(?:-[a-zA-Z0-9/-]+(?:\[[^\]]+\])?(?:\/[0-9]+)?)?\b/g,
    // specifically handle bracket notation for shadow
    /\bshadow-\[[^\]]+\]\b/g,
    /\bdrop-shadow(-\[[^\]]+\]|-[a-zA-Z0-9/-]+)?\b/g,
];

function cleanContent(c) {
    let res = c;
    tokens.forEach(tok => {
        res = res.replace(tok, '');
    });
    // Finally cleanly handle the lonely 'transition' class
    // making sure it is either space boundary or string boundary
    res = res.replace(/(^|['"`\s])transition(?=['"`\s]|$)/g, '$1');
    return res;
}

const files = walk('src');
let changedCount = 0;

files.forEach(file => {
    // Only run if it's a client/admin page or component, and we EXCLUDE finance!
    if (file.includes('Finance.tsx')) return;

    let content = fs.readFileSync(file, 'utf8');
    let newContent = cleanContent(content);

    // Also remove the explicit box-shadows in index.css if it's index.css
    if (file.includes('index.css')) {
        newContent = newContent.replace(/box-shadow:[^;]+;/g, '');
    }

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        changedCount++;
    }
});

console.log(`Done safe speedup! Modified ${changedCount} files.`);
