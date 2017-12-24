import * as GraphQL from "@atomist/automation-client/graph/graphQL";
import {
    EventFired,
    EventHandler,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Secret,
    Secrets,
    Tags,
} from "@atomist/automation-client/Handlers";
import { logger } from "@atomist/automation-client/internal/util/logger";
import * as slack from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";
import shajs = require("sha.js");
import { configuration } from "../atomist.config";
import * as graphql from "../typings/types";
import {
    getSchemaContents,
    isErrorReport,
    linkToSchema,
    Report,
    reportingChannels,
    SchemaLocation,
} from "./common";
import { pushFingerprint } from "./fingerprint";

/**
 * This produces a fingerprint on a commit and passes it back to Atomist.
 *
 * A "fingerprint" is a small piece of data representing the essence of some important portion of the code.
 * In this case it's "the contents of the schema.idl"
 *
 * This handler looks at the new contents, takes their SHA, and pushes that to Atomist as a fingerprint.
 * Atomist then produces Impact events whenever the fingerprints are different as the result of a push.
 *
 * The SuggestSchemaDeploy event handler responds to those impact events.
 */
@EventHandler("Add fingerprint on schema change",
    GraphQL.subscriptionFromFile("graphql/push")) // look in graphql/push.idl to see the events we'll get
@Tags("graphql")
export class NoticeSchemaChange implements HandleEvent<graphql.PushWithRepo.Subscription> {

    @Secret(Secrets.OrgToken)
    public githubToken: string;

    public handle(e: EventFired<graphql.PushWithRepo.Subscription>,
                  ctx: HandlerContext, params: this): Promise<HandlerResult> {
        logger.info(`Incoming event is %s`, JSON.stringify(e.data, null, 2));

        const push = e.data.Push[0];
        const repo = push.repo;
        const afterSha = push.after.sha;
        const beforeSha: string = _.get(push, "before.sha");
        const token = params.githubToken;
        const teamId = configuration.teamIds[0];

        // Is this even relevant?
        if (!(repo.owner === SchemaLocation.owner && repo.name === SchemaLocation.name)) {
            // this successful HandlerResult will also show in the log
            return Promise.resolve({ code: 0, reason: "This is not the repo I care about" });
        }

        // get the contents, and if that worked, then calculate a fingerprint and push it
        const contents = getSchemaContents(token, afterSha);
        const pushedFingerprint: Promise<Report | string> = contents.then(idl => {
            if (isErrorReport(idl)) {
                return idl;
            } else {
                const fingerprint = calculateFingerprint(idl);
                return pushFingerprint(teamId, afterSha, fingerprint);
            }
        });

        // notify people if that didn't work.
        return fingerprintIfPossible(teamId, token, beforeSha)
            .then(() => pushedFingerprint)
            .then(fingerprint => {
                if (isErrorReport(fingerprint)) {
                    return ctx.messageClient.addressChannels(
                        `FYI: I couldn't fingerprint the schema in ${
                            slack.url(linkToSchema(afterSha), afterSha)}: ${fingerprint.errorMessage}`,
                        reportingChannels)
                        .then(z => ({ code: 1, message: z.errorMessage }));
                } else {
                    // yay. This successful HandleResult will show in the log.
                    return Promise.resolve({
                        code: 0, message:
                            `reported fingerprint ${fingerprint}`,
                    });
                }
            });
    }
}

/**
 * What is the essence of the schema.idl?
 *
 * It would be more optimal to strip whitespace and then take the SHA.
 * But this is simple and it works so why get any more complicated.
 *
 * @param {string} idl
 * @returns {string}
 */
export function calculateFingerprint(idl: string): string {
    const hash = shajs("sha256").update(idl).digest("hex");
    return hash;
}

/**
 * I want to publish the fingerprint on the "before" commit for the push, in case this automation
 * wasn't running yet when that one happened. Otherwise we won't see the diff for two pushes.
 * However, if it's a first commit or something, I never want this to make the automation fail.
 * Explicitly ignore all errors, and eat the output.
 */
export function fingerprintIfPossible(teamId: string, token: string, sha: string): Promise<void> {
    if (!sha) {
        return Promise.resolve();
    }
    return getSchemaContents(token, sha).then(idl => {
        if (isErrorReport(idl)) {
            console.log(`WARN: could not fingerprint, ${sha} ignoring: ${idl}`);
            return Promise.resolve();
        } else {
            return pushFingerprint(teamId, sha, calculateFingerprint(idl))
                .then(() => {
                        return;
                    },
                    err => {
                        console.log(`WARN: could not fingerprint, ${sha} ignoring: ${err.message}`);
                    });
        }
    });
}
