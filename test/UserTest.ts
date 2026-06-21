import {assert} from "chai";
import {pc} from "../src/process";
import * as fs from "node:fs";
import {ServiceInstance} from "@nbeyer/pms-process-creator";
import {Noop} from "@nbeyer/pms-noop";

process.env.TRACE = "true";

describe("Club User Activate/Deactivation", async function () {

    it("user/active", async function () {
        await pc.startTest();

        const request = JSON.parse(fs.readFileSync("test/data/proxyRequest.json").toString());

        const event = pc.getInstance("club");
        const shopify = pc.getInstance("pms2-shopify");

        const res = await event.testRun(request);

        assert.deepEqual(res.result[0], {
            "body": "{\"status\":\"success\"}",
            "headers": {
                "Content-Type": "application/json"
            },
            "statusCode": 200
        } as any);

        await shopify.testRun();
    });

    it("user/deactive", async function () {
        await pc.startTest();

        const request = JSON.parse(fs.readFileSync("test/data/proxyRequestDeactivate.json").toString());

        const event = pc.getInstance("club");
        const shopify = pc.getInstance("pms2-shopify");

        const res = await event.testRun(request);

        assert.deepEqual(res.result[0], {
            "body": "{\"status\":\"success\"}",
            "headers": {
                "Content-Type": "application/json"
            },
            "statusCode": 200
        } as any);

        await shopify.testRun();
    });

    it("user/active reject wrong hash", async function () {
        await pc.startTest();

        const request = JSON.parse(fs.readFileSync("test/data/proxyRequest.json").toString());
        const body = JSON.parse(request.body);
        body.hash += "wrong";
        request.body = JSON.stringify(body);

        const event = pc.getInstance("club");
        const shopify = pc.getInstance("pms2-shopify");

        const res = await event.testRun(request);

        assert.deepEqual(res.result[0], {
            "body": "{\"status\":\"error\",\"isValid\":\"false\"}",
            "headers": {
                "Content-Type": "application/json"
            },
            "statusCode": 400
        } as any);

        const msgs = shopify.getReceivedMessages();

        assert.deepEqual(msgs, []);
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