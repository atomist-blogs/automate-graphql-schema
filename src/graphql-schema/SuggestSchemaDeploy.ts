import {
    EventFired,
    EventHandler,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Success,
    Tags,
} from "@atomist/automation-client";
import * as GraphQL from "@atomist/automation-client/graph/graphQL";
import { logger } from "@atomist/automation-client/internal/util/logger";
import { buttonForCommand } from "@atomist/automation-client/spi/message/MessageClient";
import * as slack from "@atomist/slack-messages/SlackMessages";
import * as graphql from "../typings/types";
import { linkToSchema,
    reportingChannels,
    SchemaLocation,
} from "./common";
import { PushSchemaToNeo } from "./PushSchemaToNeo";

@EventHandler("Supply deploy button on schema change",
    GraphQL.subscriptionFromFile("graphql/impact")) // this responds to fingerprint-difference events
@Tags("graphql")
export class SuggestSchemaDeploy implements HandleEvent<graphql.PushImpact.Subscription> {

    public handle(e: EventFired<graphql.PushImpact.Subscription>, ctx: HandlerContext): Promise<HandlerResult> {
        logger.info(`Incoming event is %s`, JSON.stringify(e.data, null, 2));

        const impact = e.data.PushImpact[0];
        const changedThings = JSON.parse(impact.data) as Array<[string, number]>;
        const repo = impact.push.repo;
        const sha = impact.push.after.sha;
        const branch = impact.push.branch;

        // Is this even relevant?
        if (!(repo.owner === SchemaLocation.owner && repo.name === SchemaLocation.name)) {
            return Promise.resolve({ code: 0, reason: "not neo4j-ingester" });
        }
        if (!changedThings.some(t => t[0] === "graphql-schema" && t[1] !== 0)) {
            return Promise.resolve({ code: 0, reason: "graphql-schema didn't change" });
        }

        // It is! send a message!
        const message: slack.SlackMessage = constructMessage(branch === repo.defaultBranch,
            branch, sha);
        return ctx.messageClient.addressChannels(
            message,
            reportingChannels).
            then(z => Success);
    }
}

function constructMessage(defaultBranch: boolean,
                          branch: string,
                          ref: string): slack.SlackMessage {

    const database: "staging" | "production" = defaultBranch ? "production" : "staging";

    // Define the button!
    const buttons: slack.Attachment = {
        fallback: `deploy graphql button`,
        actions: [
            buttonForCommand({ text: `Push to ${database}` }, // this is what the button looks like
                PushSchemaToNeo.Name, // it will run this command
                { database, ref, refDescription: branch }), // parameters for the command
        ],
    };

    const message: slack.SlackMessage = {
        text: `The GraphQL schema was updated in ${slack.url(linkToSchema(ref), branch)}.`,
        attachments: [buttons],
    };

    return message;
}
