import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
    const commitHash = execSync('git rev-parse HEAD', {
        encoding: 'utf-8',
        cwd: __dirname
    }).trim();

    const content = `// This is auto-generated file - do not modify manually
export const DYNDATA = {
    commithash: "${commitHash}",
};`;

    const targetPath = join(__dirname, 'src', 'dynamic.ts');
    writeFileSync(targetPath, content, 'utf-8');

} catch (error) {
    console.error('Error generating dynamic.ts:', error.message);

    const fallbackContent = `export const DYNDATA = {
    commithash: ""
};`;

    try {
        const targetPath = join(__dirname, 'src', 'dynamic.ts');
        writeFileSync(targetPath, fallbackContent, 'utf-8');
    } catch (writeError) {
        console.error('Error writing fallback content:', writeError.message);
    }

    process.exit(1);
}