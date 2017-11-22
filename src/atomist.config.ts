import { Configuration } from "@atomist/automation-client/configuration";
import * as appRoot from "app-root-path";
import * as cfenv from "cfenv";
import { HelloWorld } from "./commands/simple/HelloWorld";
import { NoticeSchemaChange } from "./graphql-schema/NoticeSchemaChange";
import { PushSchemaToNeo } from "./graphql-schema/PushSchemaToNeo";
import { SuggestSchemaDeploy } from "./graphql-schema/SuggestSchemaDeploy";

const pj = require(`${appRoot}//package.json`);

// when running in Cloud Foundry, we get credentials here.
const appEnv = cfenv.getAppEnv();
const tokenCreds = appEnv.getServiceCreds("github-token");
const stagingNeoCreds = appEnv.getServiceCreds("staging-neo4j");
const productionNeoCreds = appEnv.getServiceCreds("production-neo4j");
const webhookCreds = appEnv.getServiceCreds("atomist-webhook");

// This GitHub token is the core authentication tool for this program
// to connect to Atomist.
// This automation will need repo:read and org:read scopes
const token = tokenCreds ? tokenCreds.token : process.env.GITHUB_TOKEN;

export const configuration: Configuration = {
    name: pj.name,
    version: pj.version,
    teamIds: ["T29E48P34"], // run "@atomist pwd" in your Slack to get yours; this is atomist-community.slack.com
    commands: [
        () => new HelloWorld(), // a very simple command that lets me check whether this is running
        () => new PushSchemaToNeo(), // the core automation: schema deployment
    ],
    events: [
        () => new NoticeSchemaChange(), // on every push to GitHub, notice whether the schema changed
        () => new SuggestSchemaDeploy(), // on every noticed-change, if it was the schema, send a message with a button
    ],
    token,
};

export const graphqlSchemaConfiguration = {
    staging: {
        token: appEnv.isLocal ? process.env.STAGING_DB_TOKEN : stagingNeoCreds.token,
        url: appEnv.isLocal ? process.env.STAGING_DB_URL : stagingNeoCreds.url,
    }
    , production: {
        token: appEnv.isLocal ? process.env.PRODUCTION_DB_TOKEN : productionNeoCreds.token,
        url: appEnv.isLocal ? process.env.PRODUCTION_DB_URL : productionNeoCreds.url,
    },
};

export const atomistWebhookUrl = webhookCreds ? webhookCreds.url : "https://webhook.atomist.com/atomist";
