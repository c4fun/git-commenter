import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

/**
 * 将含有 "~" 的路径转换为绝对路径。
 * @param {string} relativePath - 相对路径，可能包含 "~" 符号。
 * @returns {string} 转换后的绝对路径。
 */
function expandHomeDirectory(relativePath: string): string {
    // 检查路径是否以 "~" 开头
    if (relativePath.startsWith('~')) {
        // 将 "~" 替换为用户的主目录路径
        const homeDirectory = homedir();
        return path.join(homeDirectory, relativePath.slice(1));
    }
    // 如果路径不以 "~" 开头，假设它已经是一个绝对路径或者相对于当前工作目录的相对路径
    return relativePath;
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.showAnalysisFromJSON', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        // 假设 JSON 数据文件位于工程的根目录或已知路径
        // const jsonFilePath = path.join(vscode.workspace.rootPath || '', 'analysis.json');
		// TODO: 根据当前文件位置，找到相应的comments.json文件

		const rawJsonFilePath = "~/.llm-project-helper/workspaces/LWM/lwm/ring_attention.py.comments.json";
		// turn the ~ into real home folder
		const jsonFilePath = expandHomeDirectory(rawJsonFilePath);
        fs.readFile(jsonFilePath, 'utf8', (err, data) => {
            if (err) {
                vscode.window.showErrorMessage('Failed to read analysis data');
                return;
            }

            const analysisData = JSON.parse(data);

            // 确保当前打开的文件是我们想要分析的文件
            if (editor.document.uri.fsPath !== analysisData.file_path) {
                vscode.window.showWarningMessage('The open file does not match the analysis data');
                return;
            }

            const decorationsArray: vscode.DecorationOptions[] = analysisData.comments.map((comment: { line_no: number; remark: string }) => {
                const startPos = new vscode.Position(comment.line_no - 1, 0); // 行号从0开始
                const endPos = new vscode.Position(comment.line_no - 1, 0);
                return {
                    range: new vscode.Range(startPos, endPos),
                    hoverMessage: comment.remark
                };
            });

            const decorationType = vscode.window.createTextEditorDecorationType({
                isWholeLine: true, // 可以根据需要调整装饰器的样式
                backgroundColor: 'rgba(255,255,0,0.1)' // 举例：淡黄色背景
            });

            editor.setDecorations(decorationType, decorationsArray);
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
