#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function countLinesInFile(filePath, excludeComments, excludeEmptyLines) {
    return new Promise((resolve, reject) => {
        let lineCount = 0;
        let insideBlockComment = false;

        const readStream = fs.createReadStream(filePath, 'utf8');
        readStream.on('data', chunk => {
            const lines = chunk.split('\n');

            lines.forEach(line => {
                const trimmedLine = line.trim();

                if (excludeEmptyLines && trimmedLine === '') {
                    return;
                }

                if (excludeComments) {
                    if (insideBlockComment) {
                        if (trimmedLine.includes('*/')) {
                            insideBlockComment = false;
                        }
                        return;
                    }

                    if (trimmedLine.startsWith('/*')) {
                        insideBlockComment = true;
                        return;
                    }

                    if (trimmedLine.startsWith('//')) {
                        return;
                    }
                }

                lineCount += 1;
            });
        });

        readStream.on('end', () => resolve(lineCount));
        readStream.on('error', reject);
    });
}

async function countLinesInDirectory(dirPath, excludePaths = [], extensions = [], excludeComments, excludeEmptyLines) {
    let totalLines = 0;

    const filesAndDirs = fs.readdirSync(dirPath);

    for (const fileOrDir of filesAndDirs) {
        const fullPath = path.join(dirPath, fileOrDir);

        if (excludePaths.some(excludedPath => fullPath.includes(excludedPath))) {
            continue;
        }

        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            totalLines += await countLinesInDirectory(fullPath, excludePaths, extensions, excludeComments, excludeEmptyLines);
        } else if (stats.isFile()) {
            const extname = path.extname(fullPath).toLowerCase();
            if (extensions.includes(extname)) {
                const linesInFile = await countLinesInFile(fullPath, excludeComments, excludeEmptyLines);
                console.log(`파일: ${fullPath} - 라인 수: ${linesInFile}`);
                totalLines += linesInFile;
            }
        }
    }

    return totalLines;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function run() {
    rl.question('스캔할 디렉토리를 입력하세요: ', async (startDir) => {
        rl.question('제외할 경로를 입력하세요 (쉼표로 구분): ', async (excludeInput) => {
            rl.question('포함할 파일 확장자를 입력하세요 (쉼표로 구분, 예: .js,.json,.tsx): ', async (extensionsInput) => {
                rl.question('주석과 공백 줄을 제외하고 라인 수를 계산하시겠습니까? (y/n, 예: y로 둘 다 제외): ', async (excludeChoice) => {
                    const excludePaths = excludeInput
                        .split(',')
                        .map(path => path.trim())
                        .filter(path => path !== '');

                    const extensions = extensionsInput
                        .split(',')
                        .map(ext => ext.trim().toLowerCase())
                        .filter(ext => ext.startsWith('.'));

                    const excludeComments = excludeChoice.toLowerCase().includes('y');  
                    const excludeEmptyLines = excludeChoice.toLowerCase().includes('y');

                    try {
                        const totalLines = await countLinesInDirectory(startDir.trim(), excludePaths, extensions, excludeComments, excludeEmptyLines);
                        console.log(`지정한 파일들의 총 라인 수 (주석 제외: ${excludeComments ? '예' : '아니오'}, 공백 줄 제외: ${excludeEmptyLines ? '예' : '아니오'}) : ${totalLines}`);
                    } catch (error) {
                        console.error('라인 수 계산 중 오류:', error);
                    }

                    rl.question('다시 실행하시겠습니까? (y/n): ', (answer) => {
                        if (answer.toLowerCase() === 'y') {
                            run();
                        } else {
                            console.log('프로그램을 종료합니다.');
                            rl.close();
                        }
                    });
                });
            });
        });
    });
}

run();
