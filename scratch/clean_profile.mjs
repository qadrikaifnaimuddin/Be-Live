import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/Kaif Qadri/Downloads/social-media-app/Be-Live/src/components/ProfileScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startKey = '                {/* Real-time complexity / character gauge */}';
const startIndex = content.indexOf(startKey);

if (startIndex === -1) {
  console.error('Start key not found!');
  process.exit(1);
}

// We want to find the next '        </>\n      )}'
const endKey = '        </>\n      )}';
let endIndex = content.indexOf(endKey, startIndex);

if (endIndex === -1) {
  const endKeyR = '        </>\r\n      )}';
  endIndex = content.indexOf(endKeyR, startIndex);
}

if (endIndex === -1) {
  console.error('End key not found!');
  process.exit(1);
}

// Since we want to replace the whole block up to the closed fragment,
// let's do:
const finalEndIndex = endIndex + (content.includes('\r\n') ? 14 : 12); // length of '        </>\n      )}' or '        </>\r\n      )}'

const before = content.substring(0, startIndex);
const after = content.substring(finalEndIndex);

const newContent = before + '        </>\n      )}' + after;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Success! Cleaned ProfileScreen.tsx');
