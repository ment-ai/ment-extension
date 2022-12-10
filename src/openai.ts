import { ChatGPTAPI } from "chatgpt";
import * as vscode from "vscode";
import {
  MENT_AI_CONF_PATH_AUTH,
  USER_EMAIL_KEY,
  USER_PASSWORD_KEY,
} from "./extension";

import * as fs from "fs";
const outputChannel: vscode.OutputChannel =
  vscode.window.createOutputChannel("Ment-ai");
const LOGIN_CODE_SNIPPET = `from pychatgpt import Chat\nchat = Chat(email="{{email}}", password="{{password}}")`;

const GET_PATH_TOKEN = `from pychatgpt.classes import openai\nimport os, pathlib, shutil\npath = os.path.abspath(openai.__file__)\nshutil.copyfile(str(pathlib.Path(path).parent / "auth.json"), "{{path}}")`;

const generatePythonCmd = (code: string) => `echo -e '${code}' | python`;

export class OpenAIManager {
  private terminal: vscode.Terminal;
  private accessToken!: string;
  private store: vscode.Memento;
  private expiresAt!: number;
  private api!: ChatGPTAPI;

  public constructor(private context: vscode.ExtensionContext) {
    this.terminal = vscode.window.createTerminal({
      name: `Ment - OpenAI Manager`,
    });
    this.terminal.sendText("pip install chatgptpy --upgrade");
    this.terminal.show();
    this.store = context.globalState;
    this.loadConfig();
  }

  public loadConfig() {
    try {
      const conf = fs.readFileSync(MENT_AI_CONF_PATH_AUTH, "utf8");
      outputChannel.appendLine(conf);
      const auth = JSON.parse(conf);
      this.accessToken = auth.access_token;
      this.expiresAt = auth.expires_at;
      this.api = new ChatGPTAPI({ sessionToken: this.accessToken });
    } catch {
      outputChannel.appendLine("failed to load conf from file");
      vscode.window.showErrorMessage("Failed to login.");
    }
  }

  public loginUser(email: string, password: string): void {
    this.terminal.sendText(
      generatePythonCmd(
        LOGIN_CODE_SNIPPET.replace("{{email}}", email).replace(
          "{{password}}",
          password
        )
      )
    );

    this.terminal.sendText(
      generatePythonCmd(
        GET_PATH_TOKEN.replace("{{path}}", MENT_AI_CONF_PATH_AUTH)
      )
    );
    setTimeout(() => {
      this.loadConfig();
    }, 2000);
  }

  public refreshToken(): void {
    let currTime = new Date().getTime() / 1000;
    if (this.expiresAt <= currTime) {
      const email = this.store.get(USER_EMAIL_KEY, "");
      const password = this.store.get(USER_PASSWORD_KEY, "");
      this.loginUser(email, password);
      this.loadConfig();
    }
  }

  public async request(text: string): Promise<string> {
    this.refreshToken();
    return await this.api.sendMessage(text);
  }
}
