import {
    CommandHandler,
    failure,
    HandleCommand,
    HandlerContext, HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret, Secrets, Success, Tags,
} from "@atomist/automation-client";
import * as slack from "@atomist/slack-messages/SlackMessages";
import axios from "axios";

import { graphqlSchemaConfiguration } from "../atomist.config";
import * as graphql from "../typings/types";
import {
    errorReport, getSchemaContents, isErrorReport,
    linkToSchema, Report, reportingChannels, SchemaLocation,
} from "./common";

@CommandHandler("Post a schema.idl to a Neo4j database", // description
    "deploy graphql schema") // intent: type this in Slack to trigger this command
@Tags("graphql") // someday this will be useful for searching
export class PushSchemaToNeo implements HandleCommand {

    public static Name = "PushSchemaToNeo"; // used to reference this command in a button

    // who ran this command? useful for tracking
    @MappedParameter(MappedParameters.SlackUser)
    public slackUser: string;

    // a GitHub token belonging to the user who invoked the command. (*)
    @Secret(Secrets.UserToken)
    public githubToken: string;

    // All these parameters will either be supplied (by a button) or can be provided by the person invoking in Slack
    @Parameter({ required: false, description: "how to describe the branch/SHA we're publishing from" })
    public refDescription?: string;

    @Parameter({ description: "branch or SHA to publish the schema from " })
    public ref: string = "master"; // it's optional because there's a default.

    @Parameter({ pattern: /^staging|production$/, description: "staging or production" })
    public database: "staging" | "production" = "staging";

    // here's the business method!
    public handle(ctx: HandlerContext, params: this): Promise<HandlerResult> {

        const refDescription = params.refDescription || params.ref;

        // deploy the schema, then send messages about the result.
        return pushSchemaToNeo(this.githubToken,
            graphqlSchemaConfiguration[params.database].url,
            graphqlSchemaConfiguration[params.database].token, params.ref)
            .then(r => {
                if (isErrorReport(r)) {
                    return ctx.messageClient.respond("It failed. " + r.errorMessage)
                        .then(failure);
                } else {
                    return publishAuditTrail(ctx, params.slackUser, params.database, params.ref, refDescription)
                        .then(() => ctx.messageClient.respond("It thinks it succeeded"))
                        .then(z => Success);
                }
            });
    }
}

function publishAuditTrail(ctx: HandlerContext, slackUser: string,
                           database: string, ref: string, refDescription: string) {
    return ctx.messageClient.addressChannels(
        `${slack.user(slackUser)} updated the GraphQL schema in ${database} from ${
            slack.url(linkToSchema(ref), refDescription)}`,
        reportingChannels);
}

function pushSchemaToNeo(githubToken: string, databaseUrl: string, dbToken: string, ref: string): Promise<Report> {
    const schemaIdl: Promise<Report | string> =
        getSchemaContents(githubToken, ref);

    return schemaIdl.then(idl => {
        if (isErrorReport(idl)) {
            return idl;
        }
        return pushToDatabase(databaseUrl, dbToken, idl);
    });
}

function pushToDatabase(databaseUrl: string, dbToken: string, idl: string): Promise<Report> {
    const url = databaseUrl + "/graphql/idl/";
    const headers = { Authorization: `Basic ${dbToken} ` };

    return axios.post(url, idl, { headers })
        .then(z => ({ success: true }))
        .catch(e => errorReport(`Failure posting to ${url}: ${e.message} `));
}

// (*) currently, you'll actually get the GitHub token that you supplied in this automation's atomist.config.ts
