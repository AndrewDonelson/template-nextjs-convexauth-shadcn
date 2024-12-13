/**
 * Cross-platform setup script for Convex Auth configuration
 */

import fs from "fs";
import { config as loadEnvFile } from "dotenv";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { platform } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEBUG = true;

function debugLog(message, data = null) {
    if (DEBUG) {
        console.log('\n[DEBUG] ' + message);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
}

async function runSetup() {
    try {
        const envPath = path.join(process.cwd(), ".env.local");
        debugLog(`Checking for .env.local at: ${envPath}`);

        if (!fs.existsSync(envPath)) {
            console.error("The .env.local file is missing. Skipping the setup script.");
            process.exit(0);
        }

        const config = {};
        loadEnvFile({ path: envPath, processEnv: config });
        debugLog("Loaded environment variables", config);

        const runOnceWorkflow = process.argv.includes("--once");
        const deploymentName = config.CONVEX_DEPLOYMENT?.split(":").slice(-1)[0] ?? "<your deployment name>";
        debugLog(`Deployment name: ${deploymentName}`);

        // Create the variables object
        const variablesObj = {
            help: "This template includes prebuilt sign-in via GitHub OAuth and magic links via Resend. This command can help you configure the credentials for these services via additional Convex environment variables.",
            providers: [
                {
                    name: "GitHub OAuth",
                    help: `Create a GitHub OAuth App, follow the instruction here: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app\n\nWhen you're asked for a callback URL use:\n\nhttps://${deploymentName}.convex.site/api/auth/callback/github`,
                    variables: [
                        {
                            name: "AUTH_GITHUB_ID",
                            description: "the Client ID of your GitHub OAuth App"
                        },
                        {
                            name: "AUTH_GITHUB_SECRET",
                            description: "the generated client secret"
                        }
                    ]
                },
                {
                    name: "Resend",
                    help: "Sign up for Resend at https://resend.com/signup. Then create an API Key.",
                    variables: [
                        {
                            name: "AUTH_RESEND_KEY",
                            description: "the API Key"
                        }
                    ]
                }
            ],
            success: "You're all set. If you need to, you can rerun this command with 'node setup.mjs'."
        };

        // Convert to string and properly escape for command line
        const variables = JSON.stringify(variablesObj);
        const escapedVariables = variables
            .replace(/"/g, '\\"')  // Escape double quotes
            .replace(/`/g, "'");   // Replace backticks with single quotes

        debugLog("Escaped variables string", escapedVariables);

        console.log(
            "You chose Convex Auth as the auth solution. " +
            "This command will walk you through setting up " +
            "the required Convex environment variables"
        );

        // Platform-specific command configuration
        const isWindows = platform() === "win32";
        const npmCmd = isWindows ? 'npx.cmd' : 'npx';
        const command = `${npmCmd} @convex-dev/auth --variables "${escapedVariables}" --skip-git-check`;
        
        debugLog("Command to execute:", command);

        // Execute the command
        execSync(command, {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, FORCE_COLOR: true }
        });

        if (runOnceWorkflow) {
            await fs.promises.appendFile(envPath, `\nSETUP_SCRIPT_RAN=1\n`);
            debugLog("Successfully updated .env.local with SETUP_SCRIPT_RAN flag");
        }

    } catch (error) {
        debugLog("Setup failed with error", error);
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

// Run the setup
console.log("Starting setup script...");
runSetup().catch((error) => {
    debugLog("Top level error caught", error);
    console.error('Setup failed:', error);
    process.exit(1);
});