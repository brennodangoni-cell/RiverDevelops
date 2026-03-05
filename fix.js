const fs = require('fs');
const path = require('path');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

walk('src/pages', function(err, results) {
  if (err) throw err;
  results.forEach(file => {
    if (file.endsWith('.tsx') && !file.includes('Finance.tsx')) {
      let c = fs.readFileSync(file, 'utf8');
      
      // Remove all shadow-* classes
      c = c.replace(/\s*shadow(-\[[^\]]+\]|-[a-z0-9/-]+)/g, '');
      c = c.replace(/\bshadow\b/g, '');
      
      // Add backdrop-blur
      c = c.replace('absolute inset-0 bg-black/80 "', 'absolute inset-0 bg-black/80 backdrop-blur-sm "');
      c = c.replace('absolute inset-0 bg-black/60 "', 'absolute inset-0 bg-black/60 backdrop-blur-sm "');
      c = c.replace('fixed inset-0 z-50 flex items-center justify-center p-4', 'fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md');
      c = c.replace('fixed inset-0 z-[60] flex items-center justify-center p-4', 'fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md');
      c = c.replace('fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8', 'fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-md');
      
      // fix Login border glow
      c = c.replace(/ring-cyan-500\/50/g, '');
      c = c.replace(/ring-emerald-500\/50/g, '');

      fs.writeFileSync(file, c, 'utf8');
    }
  });
  console.log('Done fix.js');
});
