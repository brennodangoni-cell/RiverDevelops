import fs from 'fs';
import path from 'path';

const fileRegex = /\.(tsx|ts|jsx|js)$/;
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
    /\btransition(?:-[a-zA-Z0-9]+)?\b/g,
    /\bduration-\d+\b/g,
    /\bdelay-\d+\b/g,
    /\bease-(?:linear|in|out|in-out)\b/g,
    /\bshadow(?:-[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)?(?:\/\d+)?|-\[[^\]]+\])?\b/g,
    /\bdrop-shadow(?:-[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)?(?:\/\d+)?|-\[[^\]]+\])?\b/g,
];

function cleanClasses(classStr) {
    let res = classStr;
    tokens.forEach(tok => {
        res = res.replace(tok, '');
    });
    return res;
}

const files = walk('src');
let changedCount = 0;

function processMatch(match, quote, p1) {
    const keywords = ['transition', 'duration', 'shadow', 'ease', 'delay'];
    if (keywords.some(k => p1.includes(k))) {
        return quote + cleanClasses(p1) + quote;
    }
    return match;
}

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;

    // Single quotes
    newContent = newContent.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1) => processMatch(match, "'", p1));
    // Double quotes
    newContent = newContent.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => processMatch(match, '"', p1));
    // Backticks
    newContent = newContent.replace(/`([^`\\]*(?:\\.[^`\\]*)*)`/g, (match, p1) => processMatch(match, '`', p1));

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        changedCount++;
    }
});
console.log(`Done safe speedup! Modified ${changedCount} files.`);
