// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ext } from "./extensionVariables";
import {analyzeContract} from "./commands/analyzeContract";
import {analyzeContractWithoutCompile} from "./commands/analyzeContractWithoutCompile";
import {ItemProvider} from "./utils/itemProvider";
import {GetContextualAutoCompleteByGlobalVariable} from "./utils/Apicompletion";
import {getInputNum} from "./commands/getInputNum";

let diagnosticsCollection: vscode.DiagnosticCollection;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// not enable token recommend at initialization
	let recommendEnabled: boolean = false;
	let maxTime: number = 60;  // default set to 1 miniute

	ext.context = context;
	ext.outputChannel = vscode.window.createOutputChannel("SCStudio");

	diagnosticsCollection = vscode.languages.createDiagnosticCollection('scstudio');

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "SCStudio" is now active!');
	let solidityExt = vscode!.extensions!.getExtension('JuanBlanco.solidity')!;
	solidityExt.activate();
	console.log('the solidity extension has been activated')

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let analyzeSub = vscode.commands.registerCommand('scstudio.analyzecontract', async () => {
		const FILEPATH = vscode.window!.activeTextEditor!.document.uri.fsPath;
		var indexStart = Math.max(FILEPATH.lastIndexOf('\\'), FILEPATH.lastIndexOf('/'));
		const filedir = FILEPATH.substring(0,indexStart);
		if((vscode.workspace.workspaceFolders === undefined)){
			vscode.window.showWarningMessage(
				'SCStudio: Please open a folder as a workspace and put your contract in it!',
			);
		}
		else if(filedir != vscode.workspace.workspaceFolders![0].uri.fsPath){
			vscode.window.showWarningMessage(
				'SCStudio: Please put your contract in the workspace which is:'+vscode.workspace.workspaceFolders![0].uri.fsPath
			);
		}
		else{
			analyzeContract(diagnosticsCollection, vscode.window!.activeTextEditor!.document.uri,vscode.window!.activeTextEditor!.document, maxTime);
		}
	});

	let analyzeSubWithoutCompiler = vscode.commands.registerCommand('scstudio.analyzeContractWithoutCompile', async () => {
		analyzeContractWithoutCompile(diagnosticsCollection, vscode.window!.activeTextEditor!.document.uri,vscode.window!.activeTextEditor!.document, maxTime);
	});

	let demoProvider = new ItemProvider([], []);
	let solPv : vscode.Disposable;  
 
	let provideStatement = vscode.commands.registerCommand('scstudio.enablerecommand', () => {
		recommendEnabled = true;
		solPv = vscode.languages.registerCompletionItemProvider("solidity", demoProvider, '.', ' ', '\n'); 
		context.subscriptions.push(solPv);
	}); 

	let disprovideStatement = vscode.commands.registerCommand('scstudio.disablerecommand', () => {
		recommendEnabled = false;
		solPv.dispose();
	}); 

	let setTimeStatement = vscode.commands.registerCommand('scstudio.settime', async () => {
		maxTime = await getInputNum(maxTime);
		console.log("Maxtime set to:", maxTime);
	}); 

    // context.subscriptions.push(solPv);
	context.subscriptions.push(analyzeSub);
	context.subscriptions.push(analyzeSubWithoutCompiler);
	context.subscriptions.push(provideStatement);
	context.subscriptions.push(disprovideStatement);
	context.subscriptions.push(setTimeStatement);

	if(recommendEnabled) {

		vscode.workspace.onDidChangeTextDocument(async function(event) {
			// demoProvider.Items = [];
			// demoProvider.codeComs = [];

			if(event.contentChanges[0]) {
				var s = event.contentChanges[0].text;

				/* Token Suggestion */
				if(s === ' ') {
					// vscode.Range.arguments
					console.log('Space trigger.');
				}
				
				/* API Completion */
				else if(s === '.') {
					// vscode.Range.arguments
					console.log('Dot trigger.');
					if(event.contentChanges[0].range) {
						let range = event.contentChanges[0].range;
						let str_range = JSON.stringify(range);
						let json_range = JSON.parse(str_range);
						let currentLine = json_range[0].line + 1;
						let currentSen = vscode.window.activeTextEditor?.document.lineAt(currentLine - 1).text;
						let codes : string[];
						codes = [];
						let start = 0;
						if (currentSen) {
							for(let i = 0;;i++) {
								if(currentSen[i] === '.') {
									start = i;
									break;
								}
							}
							const globalVariableContext = GetContextualAutoCompleteByGlobalVariable(currentSen, start);

							demoProvider.Items = globalVariableContext;
							demoProvider.codeComs = [];
						}
					}
				}
			}
		});
	}
}
