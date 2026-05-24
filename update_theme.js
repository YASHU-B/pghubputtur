const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'client/src');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.css')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir(directoryPath);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace color classes
    content = content.replace(/indigo-/g, 'orange-');
    content = content.replace(/purple-/g, 'orange-');
    
    // Reduce massive rounded corners
    content = content.replace(/rounded-3xl/g, 'rounded-2xl');
    content = content.replace(/rounded-2xl/g, 'rounded-xl'); // This will cascade down one tick

    // Lighten heavy full-color blocks (from purple-something to orange-something earlier)
    // we want a cleaner UI so we reduce massive gradients
    content = content.replace(/bg-gradient-to-[a-z]+ from-orange-[0-9]+ to-orange-[0-9]+/g, 'bg-orange-600');
    content = content.replace(/from-orange-[0-9]+ via-white to-orange-[0-9]+/g, 'bg-white');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${file}`);
    }
});

console.log('Theme replacement complete!');
