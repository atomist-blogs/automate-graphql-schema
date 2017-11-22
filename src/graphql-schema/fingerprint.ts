import axios from "axios";
import * as _ from "lodash";
import { atomistWebhookUrl } from "../atomist.config";
import { errorReport, Report, SchemaLocation } from "./common";

export function pushFingerprint(teamId: string,
                                ref: string,
                                fingerprint: string): Promise<Report | string> {
    const url = atomistWebhookUrl + "/fingerprints/teams/" + teamId;
    const data = {
        commit:
        {
            provider: SchemaLocation.baseUrl,
            owner: SchemaLocation.owner,
            repo: SchemaLocation.name,
            sha: ref,
        },
        fingerprints: [{ name: "graphql-schema", sha: fingerprint }],
    };
    console.log("Sending fingerprint: " + JSON.stringify(data) + " to " + url);
    return axios.post(url, data).
        then(z => fingerprint).    // want to return something
        catch(z => errorReport(
            `Failure posting fingerprint.
Error: ${z.message},
Response body: ${JSON.stringify(_.get(z, "result.body", "(none)"))}
URL: ${url}
Data: ${JSON.stringify(data)}`));
}
