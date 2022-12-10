import { ChatGPTAPI } from "chatgpt";
import * as vscode from "vscode";
import { OpenAIManager } from "./openai";
import { spinner, textToMarkdownPreview } from "./preview";

export const queryChatGPT = async (
  userInput: string,
  manager: OpenAIManager
) => {
  await textToMarkdownPreview(spinner, "Thinking...", false);
  const languageId = vscode.window.activeTextEditor?.document.languageId;
  const selectedCode = vscode.window.activeTextEditor?.document.getText(
    vscode.window.activeTextEditor?.selection
  );
  const entireFileContents = vscode.window.activeTextEditor?.document.getText();

  const query = selectedCode
    ? selectedCode + "\n\n" + userInput
    : `This is the ${languageId} file I'm working on: \n\n` +
      entireFileContents +
      "\n\n" +
      userInput;

  const response = await manager.request(query);
  await textToMarkdownPreview(response, userInput);
  return response;
};
