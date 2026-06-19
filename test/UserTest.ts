import {assert} from "chai";
import {AggregateMessage} from "@nbeyer/beyer-pms2-customerdb";
import {Event} from "@nbeyer/pms-event";
import * as moment from "moment";
import * as _ from "lodash";
import {pc} from "../src/process";
import * as fs from "node:fs";
import {ServiceInstance} from "@nbeyer/pms-process-creator";
import {Noop} from "@nbeyer/pms-noop";

process.env.TRACE = "true";

describe("NewCustomerTest", async function () {

    it("new-customers event transformation", async function () {
        await pc.startTest();

        const request = JSON.parse(fs.readFileSync("test/data/proxyRequest.json").toString());

        const event = pc.getInstance("club");
        const shopify = pc.getInstance("pms2-shopify");

        await event.testRun(request);

        const msgs = shopify.getReceivedMessages();

        assert.deepEqual(msgs, [
            {
                type: 'GraphQl',
                query: 'mutation {\n' +
                    '        tagsAdd(id: "gid://shopify/Customer/2565335236", tags: ["ClubMember"]) {\n' +
                    '            node {\n' +
                    '                id\n' +
                    '            }\n' +
                    '            userErrors {\n' +
                    '                message\n' +
                    '            }\n' +
                    '        }\n' +
                    '    }',
                messageSource: 'club-user-activate',
                _pmsProcessNamespace: 'bs-club'
            }
        ]);

        await shopify.testRun();
    });

    before(async function () {
        pc.addInstance(new ServiceInstance<Noop>(Noop, {instanceName: "noop"}));
        pc.connectInstance("club", "noop");
    });

    after(async function () {

    });

    beforeEach(async function () {

    });

    afterEach(async function() {
        await pc.endTest();
    })


});