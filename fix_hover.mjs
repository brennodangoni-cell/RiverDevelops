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

        // Clean up stranded classnames from naive replacement
        c = c.replace(/ hover:\s/g, ' ');
        c = c.replace(/ hover:\"/g, '"');
        c = c.replace(/ hover:'/g, "'");

        // clean up specific broken classes in Login.tsx
        c = c.replace(/ring-1 ring-inset  text-cyan-400/, 'ring-1 ring-inset ring-white/10 text-cyan-400');
        c = c.replace(/gap-3 group\/btn select-none/, 'gap-3 hover:ring-white/30 group/btn select-none');

        fs.writeFileSync(file, c, 'utf8');
    }
});
console.log('Fixed hover tags');
