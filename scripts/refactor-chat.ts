import fs from 'fs';
import path from 'path';

const dirs = [
  'app/api/admin/komplain',
  'app/api/admin/tukar',
  'app/api/admin/refund',
  'app/api/komplain',
  'app/api/tukar',
  'app/api/refund'
];

function findFiles(dir: string, fileList: string[] = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

let files: string[] = [];
for (const dir of dirs) {
  files = files.concat(findFiles(path.join(process.cwd(), dir)));
}

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Simple replace:
  // find: `tx.komplainchat.create({`
  //   data: {
  //     komplainId: XXX,
  //     fromRole: "ADMIN",
  //     filesPaths: [],
  //     pesan: YYY,
  //   }
  // })`
  
  // Since regex on multi-line is fragile, let's use a simpler match
  const regex2 = /(?:await\s+)?(prisma|tx)\.komplainchat\.create\(\s*\{\s*data:\s*\{[\s\S]*?komplainId:\s*([a-zA-Z0-9_\.\?]+)[\s\S]*?pesan:\s*([^,\n]+)[\s\S]*?\}\s*,?\s*\}\s*\)/g;

  content = content.replace(regex2, (match, db, komplainId, pesan) => {
    let userIdVar = 'k.userId';
    if (komplainId === 'id' || komplainId.includes('komplainId')) {
      if (original.includes('const k =') || original.includes('k.userId')) userIdVar = 'k.userId';
      else if (original.includes('const t =') || original.includes('t.userId')) userIdVar = 't.userId';
      else if (original.includes('const r =') || original.includes('r.userId')) userIdVar = 'r.userId';
      else if (original.includes('komplain.userId')) userIdVar = 'komplain.userId';
      else userIdVar = 'userId'; 
    }
    return `await pushSystemChatLog(${userIdVar}, ${pesan.trim()}, { kind: "komplain", refId: ${komplainId}, label: "Komplain " + ${komplainId}, href: "/komplain/" + ${komplainId} }, ${db})`;
  });

  content = content.replace(/komplainchat:\s*true\s*,?/g, '');
  content = content.replace(/include:\s*\{\s*komplainchat:\s*\{\s*orderBy:\s*\{\s*createdAt:\s*['"]asc['"]\s*\}\s*\}\s*,?/g, 'include: {');

  // remove dangling includes
  content = content.replace(/,\s*include:\s*\{\s*\}/g, '');
  content = content.replace(/include:\s*\{\s*\}\s*,?/g, '');

  if (content !== original) {
    if (content.includes('pushSystemChatLog(') && !content.includes('import { pushSystemChatLog }')) {
      content = 'import { pushSystemChatLog } from "@/lib/chat-system-server";\n' + content;
    }
    fs.writeFileSync(file, content);
    console.log("Updated", file);
  }
}
