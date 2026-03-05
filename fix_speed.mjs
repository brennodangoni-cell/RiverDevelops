import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const files = walk('src');
let changedCount = 0;

files.forEach(file => {
    if (file.endsWith('.tsx')) {
        let c = fs.readFileSync(file, 'utf8');
        let original = c;

        // Remove transitions
        c = c.replace(/\btransition(?:-[a-zA-Z0-9]+)?\b/g, '');
        // Remove durations
        c = c.replace(/\bduration-\d+\b/g, '');
        // Remove delays
        c = c.replace(/\bdelay-\d+\b/g, '');
        // Remove easing
        c = c.replace(/\bease-(?:linear|in|out|in-out)\b/g, '');

        // Remove shadows
        c = c.replace(/\bshadow(?:-[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)?(?:\/\d+)?|-\[[^\]]+\])?\b/g, '');
        c = c.replace(/\bdrop-shadow(?:-[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)?(?:\/\d+)?|-\[[^\]]+\])?\b/g, '');

        // Sometimes we have multiple spaces left over like  "class1   class2"
        // Just a basic cleanup of 2 or more spaces ONLY between quotes
        // Actually it's safer to just leave them. The DOM handles multiple spaces in class attributes fine.

        if (c !== original) {
            fs.writeFileSync(file, c, 'utf8');
            changedCount++;
        }
    }
});
console.log(`Done speedup! Modified ${changedCount} files.`);
