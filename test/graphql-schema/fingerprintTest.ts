import "mocha";

import * as assert from "power-assert";
import { calculateFingerprint } from "../../src/graphql-schema/NoticeSchemaChange";

describe("fingerprinting the graphql schema", () => {

    it("has different fingerprints for different schemas", () => {
        const sha1 = calculateFingerprint(`type Hoo {
            deHoo: string }`);
        const sha2 = calculateFingerprint(`type Hoo {
            deHoo: String,
            hooHoo: Int
        }`);
        assert(sha1.length <= 64);
        assert(sha1 !== sha2);
    });

    it("has the same fingerprint for a whitespace change", () => {
        const sha1 = calculateFingerprint(`type Hoo {
            deHoo: string }`);
        const sha2 = calculateFingerprint(`type Hoo {
deHoo: String }`);
        assert(sha1 !== sha2);
    });
});
