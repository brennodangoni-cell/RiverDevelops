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

const files = walk('src/pages');
files.forEach(file => {
    if (file.endsWith('.tsx') && !file.includes('Finance.tsx')) {
        let c = fs.readFileSync(file, 'utf8');

        // Remove shadow classes
        c = c.replace(/\s*shadow(-\[[^\]]+\]|-[a-z0-9/-]+)/g, '');
        c = c.replace(/\bshadow\b/g, '');

        // modal overlay backdrop-blurs
        c = c.replace(/absolute inset-0 bg-black\/80 /g, 'absolute inset-0 bg-black/80 backdrop-blur-[8px] ');
        c = c.replace(/absolute inset-0 bg-black\/90 /g, 'absolute inset-0 bg-black/90 backdrop-blur-[8px] ');
        c = c.replace(/fixed inset-0 z-50 flex items-center justify-center p-4/g, 'fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-[8px]');
        c = c.replace(/fixed inset-0 z-\[60\] flex items-center justify-center p-4/g, 'fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-[8px]');
        c = c.replace(/fixed inset-0 z-\[100\] bg-black\/90 flex items-center justify-center p-8/g, 'fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-[8px]');

        // remove glow from login page specifically:
        c = c.replace(/ring-cyan-500\/50/g, '');
        c = c.replace(/ring-cyan-500\/30/g, '');

        fs.writeFileSync(file, c, 'utf8');
    }
});
console.log('Done!');
