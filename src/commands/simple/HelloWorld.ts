import { MappedParameter } from "@atomist/automation-client/decorators";
import {
    CommandHandler,
    HandleCommand,
    HandlerContext,
    MappedParameters,
} from "@atomist/automation-client/Handlers";
import * as slack from "@atomist/slack-messages/SlackMessages";
import { configuration } from "../../atomist.config";

// this decorator attaches metadata to the class that turns it into a Slack command
@CommandHandler("Sends a hello back to the invoking user/channel", // description
    "hello automate-graphql-schema") // this is what to type in Slack to trigger it
export class HelloWorld implements HandleCommand {

    // the MappedParameter gets populated with the Slack user who typed the command
    @MappedParameter(MappedParameters.SlackUserName)
    public slackUser: string;

    public handle(ctx: HandlerContext, params: this): Promise<void> {

        const myNameAndVersion = `${configuration.name}:${configuration.version}`;

        // return a promise that sends a message back to Slack
        return ctx.messageClient.respond(
                        `Hello ${slack.user(params.slackUser)} from ${myNameAndVersion}`);
    }
}
