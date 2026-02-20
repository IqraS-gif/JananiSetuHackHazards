const fs = require('fs');
const path = require('path');

const filePath = path.resolve('learn_content.json');
const raw = fs.readFileSync(filePath, 'utf8');

console.log('File size:', Math.round(raw.length / 1024), 'KB', '| chars:', raw.length);

// ---- Find where the FIRST complete JSON object ends ----
let depth = 0, firstObjEnd = -1, inString = false, escape = false;
for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
        depth--;
        if (depth === 0) { firstObjEnd = i; break; }
    }
}

if (firstObjEnd === -1) {
    console.log('❌ Could not find end of first JSON object');
    process.exit(1);
}

console.log('First object ends at char index:', firstObjEnd, '(of', raw.length, ')');

let part1;
try {
    part1 = JSON.parse(raw.substring(0, firstObjEnd + 1));
    console.log('✅ Part1 parsed OK. Topics:', part1.topics.map(t => t.id));
} catch (e) {
    console.log('❌ Part1 parse error:', e.message);
    process.exit(1);
}

const part2Raw = raw.substring(firstObjEnd + 1).trim();
console.log('Part2 length:', part2Raw.length, 'chars');

if (part2Raw.length === 0) {
    console.log('ℹ️  No Part2 — file already clean. Verifying...');
    try {
        JSON.parse(raw);
        console.log('✅ VALID JSON');
        console.log('Topics:', part1.topics.map(t => t.id));
        console.log('daily_tips:', part1.daily_tips ? part1.daily_tips.length : 0);
    } catch (e) {
        console.log('❌ Invalid:', e.message);
    }
    process.exit(0);
}

console.log('Part2 starts with:', JSON.stringify(part2Raw.substring(0, 100)));

const existingIds = new Set(part1.topics.map(t => t.id));

// ---- Extract daily_tips if not already present ----
if (!part1.daily_tips) {
    const dtPos = part2Raw.indexOf('"daily_tips"');
    if (dtPos !== -1) {
        const arrStart = part2Raw.indexOf('[', dtPos);
        let d = 0, inS = false, es = false, arrEnd = -1;
        for (let i = arrStart; i < part2Raw.length; i++) {
            const c = part2Raw[i];
            if (es) { es = false; continue; }
            if (c === '\\' && inS) { es = true; continue; }
            if (c === '"') { inS = !inS; continue; }
            if (inS) continue;
            if (c === '[') d++;
            else if (c === ']') { d--; if (d === 0) { arrEnd = i; break; } }
        }
        if (arrEnd !== -1) {
            try {
                part1.daily_tips = JSON.parse(part2Raw.substring(arrStart, arrEnd + 1));
                console.log('✅ Extracted daily_tips:', part1.daily_tips.length, 'tips');
            } catch (e) { console.log('❌ daily_tips error:', e.message.substring(0, 80)); }
        }
    }
}

// ---- Try parsing Part2 as a full object, then extract each key as a topic ----
const KNOWN_IDS = ['exercise', 'danger_signs', 'breastfeeding', 'baby_care', 'mental_health'];

// Try parsing Part2 as a complete object first
let part2Obj = null;
try {
    part2Obj = JSON.parse(part2Raw);
    console.log('✅ Part2 is valid JSON. Keys:', Object.keys(part2Obj));
} catch (e) {
    console.log('⚠️  Part2 not valid JSON:', e.message.substring(0, 80));
}

if (part2Obj) {
    // Part2 parsed successfully - extract topics from it
    for (const key of Object.keys(part2Obj)) {
        const val = part2Obj[key];
        if (val && typeof val === 'object' && val.id && !existingIds.has(val.id)) {
            part1.topics.push(val);
            existingIds.add(val.id);
            console.log('✅ Added from Part2 object:', val.id);
        } else if (val && typeof val === 'object' && !val.id) {
            // Try treating key itself as a topic with id = key
            const withId = { id: key, ...val };
            if (!existingIds.has(key)) {
                part1.topics.push(withId);
                existingIds.add(key);
                console.log('✅ Added (inferred id):', key);
            }
        }
    }
    // Also extract new_topics array if present
    if (part2Obj.new_topics && Array.isArray(part2Obj.new_topics)) {
        for (const t of part2Obj.new_topics) {
            if (t.id && !existingIds.has(t.id)) {
                part1.topics.push(t);
                existingIds.add(t.id);
                console.log('✅ Added from new_topics:', t.id);
            }
        }
    }
} else {
    // Part2 is truncated/invalid - extract topic objects one at a time
    for (const topicId of KNOWN_IDS) {
        if (existingIds.has(topicId)) continue;

        // Find the key in part2Raw - it may be "breastfeeding": { or "breastfeeding":{
        const keyRegex = new RegExp(`"${topicId}"\\s*:`);
        const match = keyRegex.exec(part2Raw);
        if (!match) { console.log(`⚠️  Key "${topicId}" not found in Part2`); continue; }

        const keyPos = match.index;
        // Find opening brace of this topic's value
        let scanPos = keyPos + match[0].length;
        while (scanPos < part2Raw.length && /[\s]/.test(part2Raw[scanPos])) scanPos++;

        if (part2Raw[scanPos] !== '{') { console.log(`⚠️  "${topicId}" value not an object`); continue; }

        // Extract this object
        let objD = 0, inS = false, es = false, objEnd = -1;
        for (let i = scanPos; i < part2Raw.length; i++) {
            const c = part2Raw[i];
            if (es) { es = false; continue; }
            if (c === '\\' && inS) { es = true; continue; }
            if (c === '"') { inS = !inS; continue; }
            if (inS) continue;
            if (c === '{') objD++;
            else if (c === '}') { objD--; if (objD === 0) { objEnd = i; break; } }
        }

        if (objEnd !== -1) {
            try {
                const topicObj = JSON.parse(part2Raw.substring(scanPos, objEnd + 1));
                // Ensure id field matches
                if (!topicObj.id) topicObj.id = topicId;
                part1.topics.push(topicObj);
                existingIds.add(topicId);
                console.log(`✅ Added topic: ${topicId} (fields: ${Object.keys(topicObj).slice(0, 6).join(', ')})`);
            } catch (e) {
                console.log(`❌ Parse error for ${topicId}:`, e.message.substring(0, 80));
            }
        } else {
            console.log(`⚠️  "${topicId}" object is truncated (depth never hit 0)`);
        }
    }
}

// ---- Save result ----
const output = JSON.stringify(part1, null, 4);
fs.writeFileSync(filePath, output, 'utf8');

console.log('\n=== FINAL STATUS ===');
const finalSize = Math.round(fs.statSync(filePath).size / 1024);
console.log('File size:', finalSize, 'KB');
console.log('Topics:', part1.topics.map(t => t.id));
console.log('daily_tips:', part1.daily_tips ? part1.daily_tips.length : 0);

try {
    JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('✅ VALID JSON');
} catch (e) {
    console.log('❌ Still invalid:', e.message);
}
