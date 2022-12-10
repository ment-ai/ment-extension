import * as vscode from "vscode";
import { queryChatGPT } from "./editor";
import { OpenAIManager } from "./openai";
import * as os from "os";
import { CourseManager, ExerciseBasedCourse } from "./course";
import { spinner, textToMarkdownPreview } from "./preview";

export const USER_EMAIL_KEY = "ment-ai.user_email";
export const USER_PASSWORD_KEY = "ment-ai.user_password";

export const MENT_AI_CONF_PATH = `${os.homedir()}/.mentai/`;
export const MENT_AI_CONF_PATH_COURSE = `${MENT_AI_CONF_PATH}/courses/`;
export const MENT_AI_CONF_PATH_BACKUP = `${MENT_AI_CONF_PATH}/backups/`;
export const MENT_AI_CONF_PATH_AUTH = `${MENT_AI_CONF_PATH}/auth.json`;

const outputChannel: vscode.OutputChannel =
  vscode.window.createOutputChannel("Ment-ai");

export function activate(context: vscode.ExtensionContext) {
  context.globalState.setKeysForSync([USER_EMAIL_KEY, USER_PASSWORD_KEY]);
  outputChannel.appendLine("That's how it begin!");
  const apiManager = new OpenAIManager(context);
  const courseManager = new CourseManager(
    context.globalState,
    vscode.workspace.fs
  );
  const exerciseCourse = new ExerciseBasedCourse(apiManager, courseManager);
  vscode.workspace.fs.createDirectory(vscode.Uri.file(MENT_AI_CONF_PATH));
  vscode.workspace.fs.createDirectory(
    vscode.Uri.file(MENT_AI_CONF_PATH_COURSE)
  );
  vscode.workspace.fs.createDirectory(
    vscode.Uri.file(MENT_AI_CONF_PATH_BACKUP)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ment-ai.initProfile", initProfile),
    vscode.commands.registerCommand("ment-ai.startGoal", startGoal),
    vscode.commands.registerCommand("ment-ai.newExercise", newExercise),
    vscode.commands.registerCommand(
      "ment-ai.answerExerciseText",
      answerExerciseText
    ),
    vscode.commands.registerCommand(
      "ment-ai.answerExerciseCode",
      answerExerciseCode
    ),
    vscode.commands.registerCommand("ment-ai.askGPT", askChatGPT),
    vscode.commands.registerCommand("ment-ai.whyBroken", askGPTWhyBroken),
    vscode.commands.registerCommand("ment-ai.explainPls", askGPTToExplain),
    vscode.commands.registerCommand("ment-ai.refactor", askGPTToRefactor),
    vscode.commands.registerCommand("ment-ai.clearLogs", clearChatGPTLogs)
  );

  /** ----- User learning commands ----- */

  async function initProfile() {
    const email =
      (await vscode.window.showInputBox({
        placeHolder: "OpenAI login email address",
        prompt: "Type your OpenAI email address to connect",
        value: "",
      })) || "";

    const password =
      (await vscode.window.showInputBox({
        placeHolder: "OpenAI login password",
        prompt:
          "Type your password to connect to OpenAI (we are not storing this information, please see README.md)",
        value: "",
      })) || "";

    context.globalState.update(USER_EMAIL_KEY, email);
    context.globalState.update(USER_PASSWORD_KEY, password);
    apiManager.loginUser(email, password);

    vscode.window.showInformationMessage("Let's start !");
  }

  async function startGoal() {
    vscode.commands.executeCommand("ment-ai.clearLogs");
    const goal =
      (await vscode.window.showInputBox({
        placeHolder:
          "(e.g. become python backend developer, learn statistics with python)",
        prompt: "Type the goal you want to achieve:",
        value: "",
      })) || "";
    await textToMarkdownPreview(spinner, "Processing...", false);
    let response = await exerciseCourse.generateEntryExercise(goal);
    response = `> See extension [README](url to github repo/readme.md) to know what to do next. \n\n${response}`;
    await textToMarkdownPreview(response, goal);
  }

  async function newExercise() {
    await textToMarkdownPreview(spinner, "Processing...", false);
    const response = await exerciseCourse.generateNextExercise();
    await textToMarkdownPreview(response, "Move to the next exercise");
  }

  async function answerExerciseText() {
    const answer =
      (await vscode.window.showInputBox({
        placeHolder: "Write your answer to the question.",
        prompt: "Type your response:",
        value: "",
      })) || "";
    await textToMarkdownPreview(spinner, "Processing...", false);
    const response = await exerciseCourse.answerExercise(answer);
    await textToMarkdownPreview(
      response,
      `Attempt to answer by text\n> ${answer}`
    );
  }

  async function answerExerciseCode() {
    const languageId = vscode.window.activeTextEditor?.document.languageId;
    const selectedCode = vscode.window.activeTextEditor?.document.getText(
      vscode.window.activeTextEditor?.selection
    );
    const entireFileContents =
      vscode.window.activeTextEditor?.document.getText();

    const query = selectedCode
      ? `\`\`\`\n${selectedCode}\n\`\`\``
      : `This is the ${languageId} file I'm working on: \n\n` +
        `\`\`\`\n${entireFileContents}\n\`\`\``;
    await textToMarkdownPreview(spinner, "Processing...", false);
    const response = await exerciseCourse.answerExercise(query);
    await textToMarkdownPreview(
      response,
      `Attempt to answer with code\n\`\`\`\`${query}\`\`\n\n`
    );
  }

  /** ------ Helpers commands independant from course ------ */
  async function clearChatGPTLogs() {
    const resultPath = vscode.Uri.file(`${MENT_AI_CONF_PATH}/result`);
    const resultContent = await vscode.workspace.fs.readFile(resultPath);

    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(
        `${MENT_AI_CONF_PATH_BACKUP}/result-${new Date().toString()}`
      ),
      resultContent
    );
    await textToMarkdownPreview(spinner, "Processing...", false);
    await vscode.workspace.fs.writeFile(resultPath, Buffer.from(""));
    vscode.window.showInformationMessage("Ment.ai result logs cleared");
  }

  async function askGPTToExplain() {
    await askChatGPT("Can you explain what this code does?");
  }
  async function askGPTWhyBroken() {
    await askChatGPT("Why is this code broken?");
  }
  async function askGPTToRefactor() {
    await askChatGPT("Can you refactor this code and explain what's changed?");
  }

  async function askChatGPT(queryOverride?: string) {
    if (!queryOverride) {
      const query = await vscode.window.showInputBox({
        prompt: "Enter your query",
      });
      if (!query) {
        return;
      }
      queryChatGPT(query, apiManager);
    } else {
      queryChatGPT(queryOverride, apiManager);
    }
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
