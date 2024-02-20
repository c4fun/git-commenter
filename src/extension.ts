import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

// 全局变量，跟踪是否应自动显示注释
let autoShowComments = false;

const workspaceDir = "~/.llm-project-helper/workspaces";

// localRepoFolder is dependent on the os, for example, it is "/home/richardliu/code" in Ubuntu and "/Users/laurichard/code" in MacOS
const localRepoFolder = homedir() + "/code";

// a list of str called availableSaaS including github.com, gitee.com, gitlab.com, jihulab.com
const availableSaaS = ["github.com", "gitee.com", "gitlab.com", "jihulab.com"];

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

function constructAnalysisFilePath(filePath: string): string {
    // 转换工作空间目录为绝对路径
    const baseWorkspacePath = expandHomeDirectory(workspaceDir);

    // 查找路径中包含的 SaaS 平台名称
    const saasName = availableSaaS.find(saas => filePath.includes(saas));

    // 如果找到了 SaaS 平台名称，使用它作为分割点来构造相对路径
    if (saasName) {
        // 获取 SaaS 平台名称在路径中的索引，并据此切割字符串，构造相对路径部分
        const relativePathParts = filePath.split(path.sep).slice(filePath.split(path.sep).indexOf(saasName));
        const relativePath = path.join(...relativePathParts);

        // 构造并返回分析文件的完整路径
        return path.join(baseWorkspacePath, `${relativePath}.comments.json`);
    } else {
        // 如果路径中不包含已知的 SaaS 平台名称，则可能需要返回一个错误或者使用一个默认行为
        console.error('Unable to locate SaaS platform name in the file path.');
        return ''; // 或者采取其他默认行为
    }
}

function constructAdjustedFilePath(filePath: string): string {

    // 查找路径中包含的 SaaS 平台名称
    const saasName = availableSaaS.find(saas => filePath.includes(saas));

    // 如果找到了 SaaS 平台名称，使用它作为分割点来构造相对路径
    if (saasName) {
        // 获取 SaaS 平台名称在路径中的索引，并据此切割字符串，构造相对路径部分
        const parts = filePath.split(saasName);
        const adjustedPath = saasName + parts[1];

        // 构造并返回分析文件的完整路径
        return path.join(localRepoFolder, adjustedPath);
    } else {
        // 如果路径中不包含已知的 SaaS 平台名称，则可能需要返回一个错误或者使用一个默认行为
        console.error('Unable to locate SaaS platform name in the file path.');
        return ''; // 或者采取其他默认行为
    }
}


// 把显示注释的逻辑封装成一个函数
function showCommentsForActiveFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

       // 获取当前激活的文件路径
       const currentFilePath = editor.document.uri.fsPath;
       // 根据当前文件路径构造分析文件路径
       const jsonFilePath = constructAnalysisFilePath(currentFilePath);
       console.log("分析文件路径为：" + jsonFilePath);

       fs.readFile(jsonFilePath, 'utf8', (err, data) => {
           if (err) {
               vscode.window.showErrorMessage('Failed to read analysis data');
               return;
           }

           const analysisData = JSON.parse(data);

           const adjustedFilePath = constructAdjustedFilePath(analysisData.file_path);
           console.log("调整后的文件路径为：" + adjustedFilePath);
           // 确保当前打开的文件是我们想要分析的文件
           if (editor.document.uri.fsPath !== adjustedFilePath) {
               vscode.window.showWarningMessage('The open file does not match the analysis data');
               return;
           }

           const decorationsArray: vscode.DecorationOptions[] = analysisData.comments.map((comment: { line_no: number; remark: string }) => {
               const startPos = new vscode.Position(comment.line_no - 1, 0);
               const endPos = new vscode.Position(comment.line_no - 1, 0);
               return {
                   range: new vscode.Range(startPos, endPos),
                   hoverMessage: comment.remark
               };
           });

           const decorationType = vscode.window.createTextEditorDecorationType({
               isWholeLine: true,
               backgroundColor: 'rgba(255,255,0,0.1)'
           });

           editor.setDecorations(decorationType, decorationsArray);
       });
}

export function activate(context: vscode.ExtensionContext) {
    // 注册命令
    let disposable = vscode.commands.registerCommand('extension.showAnalysisFromJSON', () => {
        // 切换自动显示注释的状态
        autoShowComments = !autoShowComments;
        if (autoShowComments) {
            // 如果启用了自动显示注释，立即显示当前文件的注释
            showCommentsForActiveFile();
        }
    });
    context.subscriptions.push(disposable);

    // 监听文件打开事件
    vscode.workspace.onDidOpenTextDocument(() => {
        if (autoShowComments) {
            showCommentsForActiveFile();
        }
    });
}

export function deactivate() {}