#!/usr/bin/env node

const { execSync } = require("child_process");
const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { Configuration, OpenAIApi } = OpenAI;

const program = new Command();

program
  .version("1.0.0")
  .option("-k, --api-key <key>", "OpenAI API key")
  .parse(process.argv);

const options = program.opts();

const CONFIG_PATH = path.resolve(__dirname, ".config.json");

function saveApiKey(apiKey) {
  const config = { apiKey };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function loadApiKey() {
  if (fs.existsSync(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return config.apiKey;
  }
  return null;
}

async function getOpenAISummary(diff) {
  const apiKey = options.apiKey || loadApiKey();
  if (!apiKey) {
    console.error(
      "OpenAI API key is required. Use -k or --api-key option to provide it.",
    );
    process.exit(1);
  }

  saveApiKey(apiKey);

  const configuration = new Configuration({
    apiKey: apiKey,
  });
  const openai = new OpenAIApi(configuration);

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Summarize the following git diff in three lines:\n\n${diff}`,
    max_tokens: 150,
  });

  return response.data.choices[0].text.trim();
}

function getGitDiff() {
  return execSync("git diff --cached --name-status").toString();
}

async function generateCommitMessage() {
  const diff = getGitDiff();
  const summary = await getOpenAISummary(diff);
  const commitMessage = `${summary}\n\n`;
  const commitMsgFile = process.argv[2];

  fs.writeFileSync(
    commitMsgFile,
    commitMessage + fs.readFileSync(commitMsgFile, "utf8"),
  );
}

generateCommitMessage();
