import * as GitHubApi from "github";
import { stringify } from "querystring";
import * as URL from "url";

// this matches the format of a chunk of Atomist GraphQL
export const SchemaLocation = {
    baseUrl: "https://www.github.com",
    apiUrl: "https://api.github.com",
    owner: "atomisthq",
    name: "neo4j-ingester",
    path: "resources/schema.idl",
};

export function linkToSchema(ref: string) {
    return `${SchemaLocation.baseUrl}/${
        SchemaLocation.owner}/${
        SchemaLocation.name}/tree/${ref}/${SchemaLocation.path}`;
}

export const reportingChannels = ["neo4j-ingester"];

/*
 * for when I want to do a thing and then return from the promise whether it succeeded
 */
export interface Report {
    success: boolean;
    errorMessage?: string;
}

export function errorReport(errorMessage: string): Report {
    return { success: false, errorMessage };
}

export function isErrorReport(thing: any): thing is Report {
    return (thing && thing.success !== undefined && thing.success === false);
}

export interface LocationDescriptor {
    org?: { provider?: { apiUrl?: string } };
    owner?: string;
    name?: string;
}

// fetch a file from GitHub
export function getSchemaContents(token: string,
                                  ref: string): Promise<Report | string> {

    const location = SchemaLocation;
    return api(token, location.apiUrl).repos.getContent({
        owner: location.owner,
        repo: location.name,
        path: location.path,
        ref,
    }).then(response => {
        if (response.data === undefined) {
            return errorReport("No data in result: " + response);
        }
        if (response.data.content === undefined) {
            return errorReport("No content in result data: " + stringify(response.data));
        }

        const encodedContent = response.data.content;
        const unencoded = new Buffer(encodedContent, "base64").toString("ascii");

        return unencoded;
    }, err => {
        console.log(
            `failed to fetch file at ${
                location.apiUrl}/repos/${
                location.owner}/${location.name}/contents/${location.path}?ref=${ref}`);
        return errorReport(`${err.message}`);
    });
}

// I totally copied this from cdupuis code somewhere
function api(token: string, apiUrl: string = "https://api.github.com/"): GitHubApi {
    // separate the url
    const url = URL.parse(apiUrl);

    const ghapi = new GitHubApi({
        debug: false,
        host: url.hostname,
        protocol: url.protocol.slice(0, -1),
        port: +url.port,
        followRedirects: false,
    });

    ghapi.authenticate({ type: "token", token });
    return ghapi;
}
