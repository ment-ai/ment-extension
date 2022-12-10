import * as vscode from "vscode";
import { MENT_AI_CONF_PATH } from "./extension";

export const textToMarkdownPreview = async (
  textResponse: string,
  query: string,
  shouldAppend: boolean = true
) => {
  if (shouldAppend) {
    const chatLog = vscode.Uri.file(`${MENT_AI_CONF_PATH}/result`);
    let tempFileContents: string = "";

    try {
      tempFileContents = (
        await vscode.workspace.fs.readFile(chatLog)
      ).toString();
    } catch (EntryNotFound) {}

    await vscode.workspace.fs.writeFile(
      chatLog,
      Buffer.from(
        `${tempFileContents}\n\n-----\n\n# ${query}\n\n${textResponse}`
      )
    );
    await vscode.commands.executeCommand("markdown.showPreview", chatLog);
  } else {
    const tempFile = vscode.Uri.file(`${MENT_AI_CONF_PATH}/.temp-result`);
    await vscode.workspace.fs.writeFile(tempFile, Buffer.from(textResponse));
    await vscode.commands.executeCommand("markdown.showPreview", tempFile);
  }
};

const cssLoader = `
.book {
    --color: #fff;
    --duration: 6.8s;
    width: 32px;
    height: 12px;
    position: relative;
    margin: 32px 0 0 0;
    //Demo
    zoom: 1.5;
    .inner {
        width: 32px;
        height: 12px;
        position: relative;
        transform-origin: 2px 2px;
        transform: rotateZ(-90deg);
        animation: book var(--duration) ease infinite;
        .left,
        .right {
            width: 60px;
            height: 4px;
            top: 0;
            border-radius: 2px;
            background: var(--color);
            position: absolute;
            &:before {
                content: '';
                width: 48px;
                height: 4px;
                border-radius: 2px;
                background: inherit;
                position: absolute;
                top: -10px;
                left: 6px;
            }
        }
        .left {
            right: 28px;
            transform-origin: 58px 2px;
            transform: rotateZ(90deg);
            animation: left var(--duration) ease infinite;
        }
        .right {
            left: 28px;
            transform-origin: 2px 2px;
            transform: rotateZ(-90deg);
            animation: right var(--duration) ease infinite;
        }
        .middle {
            width: 32px;
            height: 12px;
            border: 4px solid var(--color);
            border-top: 0;
            border-radius: 0 0 9px 9px;
            transform: translateY(2px);
        }
    }
    ul {
        margin: 0;
        padding: 0;
        list-style: none;
        position: absolute;
        left: 50%;
        top: 0;
        li {
            height: 4px;
            border-radius: 2px;
            transform-origin: 100% 2px;
            width: 48px;
            right: 0;
            top: -10px;
            position: absolute;
            background: var(--color);
            transform: rotateZ(0deg) translateX(-18px);
            animation-duration: var(--duration);
            animation-timing-function: ease;
            animation-iteration-count: infinite;
            $i: 0;
            @while $i < 19 {
                &:nth-child(#{$i}) {
                    animation-name: page-#{$i};
                }
                $i: $i + 1;
            }
        }
    }
}

$i: 0;
@while $i < 19 {
    $delay: $i * 1.86;
    $delay-after: $i * 1.74;
    @keyframes page-#{$i} {
        #{4 + $delay}% {
            transform: rotateZ(0deg) translateX(-18px);
        }
        #{13 + $delay-after}%,
        #{54 + $delay}% {
            transform: rotateZ(180deg) translateX(-18px);
        }
        #{63 + $delay-after}% {
            transform: rotateZ(0deg) translateX(-18px);
        }
    }
    $i: $i + 1;
}

@keyframes left {
    4% {
        transform: rotateZ(90deg);
    }
    10%,
    40% {
        transform: rotateZ(0deg);
    }
    46%,
    54% {
        transform: rotateZ(90deg);
    }
    60%,
    90% {
        transform: rotateZ(0deg);
    }
    96% {
        transform: rotateZ(90deg);
    }
}

@keyframes right {
    4% {
        transform: rotateZ(-90deg);
    }
    10%,
    40% {
        transform: rotateZ(0deg);
    }
    46%,
    54% {
        transform: rotateZ(-90deg);
    }
    60%,
    90% {
        transform: rotateZ(0deg);
    }
    96% {
        transform: rotateZ(-90deg);
    }
}

@keyframes book {
    4% {
        transform: rotateZ(-90deg);
    }
    10%,
    40% {
        transform: rotateZ(0deg);
        transform-origin: 2px 2px;
    }
    40.01%,
    59.99% {
        transform-origin: 30px 2px;
    }
    46%,
    54% {
        transform: rotateZ(90deg);
    }
    60%,
    90% {
        transform: rotateZ(0deg);
        transform-origin: 2px 2px;
    }
    96% {
        transform: rotateZ(-90deg);
    }
}

html {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
}

* {
    box-sizing: inherit;
    &:before,
    &:after {
        box-sizing: inherit;
    }
}

// Center & dribbble
body {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}`;

export const spinner = `<style>
${cssLoader}
</style><body>
<!-- Credit spinner: https://codepen.io/aaroniker/pen/zYOewEP -->
<h1 style="text-align: center; font-family: sans-serif;">Processing your awesome request 🚀</h1>
<div style="text-align: center;">
  <div class="book">
    <div class="inner">
      <div class="left"></div>
      <div class="middle"></div>
      <div class="right"></div>
    </div>
    <ul>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
    </ul>
  </div>
</div>
</body>`;
