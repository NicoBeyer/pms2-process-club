import {ProcessCreator, ServiceInstance} from "@nbeyer/pms-process-creator";
import {Event} from "@nbeyer/pms-event";
import {Shopify} from "@nbeyer/pms2-shopify";
import {LambdaQueueConfig} from "@nbeyer/beyer-pms2-customerdb";

process.env.ServiceDbEndpoint = process.env.ServiceDbEndpoint || "https://mvj08xzxrd.execute-api.eu-west-1.amazonaws.com:8244/prod";

const secret = "AeEV%b3f3Lr9IamY%4d9";

export const pc = new ProcessCreator({name: "bs-club"});
pc.addInstance(new ServiceInstance<Event>(Event, {instanceName: "club", executedByPms: false}));
pc.addInstance(new ServiceInstance<Shopify>(Shopify, {
    instanceName: "pms2-shopify",
    serviceName: "Shopify",
    mixins: {
        messagebus: {
            in: {
                "type" : "SQSQueue",
                "name" : "pms2-process-shopify_pms2-shopify",
                "config" : {
                    "QueueUrl" : "https://sqs.eu-west-1.amazonaws.com/095565711062/beyer_prod_pms2_pms2-process-shopify_pms2-shopify"
                }
            },
            stopConsumeOnError: true,
            concurrentNumber: 20
        }
    },
    shopifyConfig: {
        app_name: "dev:beyer-prod-pms2",
        shop_name: "beyer-soehne",
        token: process.env.SHOPIFY_TOKEN,
        api_secret: process.env.SHOPIFY_SECRET,
        api_key: process.env.SHOPIFY_KEY,
        scope: "write_customers, read_customers, read_customer_events, write_files, read_files, write_fulfillments, read_fulfillments, write_inventory, read_inventory, write_locations, read_locations, write_metaobject_definitions, read_metaobject_definitions, write_metaobjects, read_metaobjects, write_order_edits, read_order_edits, write_orders, read_orders, write_product_listings, read_product_listings, write_products, read_products, write_content, read_content, write_assigned_fulfillment_orders, read_assigned_fulfillment_orders, write_third_party_fulfillment_orders, read_third_party_fulfillment_orders",
        version: "2024-04"
    },
    owner: {
        processName: "pms2-process-shopify"
    }

}));

pc.connectInstance("club", "pms2-shopify", {
    type: "LambdaQueue",
    transformation: [
        {$match: {
            "pathParameters.proxy": "user/activate"
        }},
        {$addFields: {
                bodyStr: "$body",
                body: {$json: "$body"},
                params: {
                    header: "$headers"
                },
                method: "$httpMethod",
                instanceName: "$pathParameters.instance",
                path: "$pathParameters.proxy"
            }},
        {$addFields: {
            isValidHash: {$eq: ["$body.hash", {$md5: {$concat: ["$body.id", secret]}}]}
        }},
        {$match: {
            "body.id": {$exists: true},
            "isValidHash": true
        }},
        {$project: {
                type: "GraphQl",
                query: {$concat: [`mutation {
        tagsAdd(id: "gid://shopify/Customer/`, "$body.id", `", tags: ["ClubMember"]) {
            node {
                id
            }
            userErrors {
                message
            }
        }
    }`]},
            messageSource: "club-user-activate",
        }}
    ],
    resultTransformation: [
        {$addFields: {
            path: "$$message.path"
        }},
        {$match: {
            "messageSource": {$in: ["club-user-activate", null]},
            path: {$ne: "/club/user/deactivate"}
        }},
        {$addFields: {
            body: {$json: "$$message.body"}
        }},
        {$addFields: {
            isValid:  {$and: [
                {$eq: ["$result.data.tagsAdd.node.id", {$concat: ["gid://shopify/Customer/", "$body.id"]}]}
            ]}
        }},
        {$project: {
            statusCode: {$cond: ["$isValid", {$literal: 200}, {$literal: 400}]},
            headers: {
                "Content-Type": "application/json"
            },
            body: {$cond: ["$isValid",
                '{"status":"success"}',
                {$json: {
                    status: "error",
                    result: "$result",
                    isValid:{$cond: ["$isValid", "true", "false"]}
                }}
            ]}
        }}
    ]
})

pc.connectInstance("club", "pms2-shopify", {
    type: "LambdaQueue",
    transformation: [
        {$match: {
            "pathParameters.proxy": "user/deactivate"
        }},
        {$addFields: {
            bodyStr: "$body",
            body: {$json: "$body"},
            params: {
                header: "$headers"
            },
            method: "$httpMethod",
            instanceName: "$pathParameters.instance",
            path: "$pathParameters.proxy"
        }},
        {$addFields: {
            isValidHash: {$eq: ["$body.hash", {$md5: {$concat: ["$body.id", secret]}}]}
        }},
        {$match: {
            "body.id": {$exists: true},
            "isValidHash": true
        }},
        {$project: {
                type: "GraphQl",
                query: {$concat: [`mutation {
        tagsRemove(id: "gid://shopify/Customer/`, "$body.id", `", tags: ["ClubMember"]) {
            node {
                id
            }
            userErrors {
                message
            }
        }
    }`]},
        messageSource: "club-user-deactivate",
    }}
    ],
    resultTransformation: [
        {$match: {
            "messageSource": "club-user-deactivate"
        }},
        {$addFields: {
            body: {$json: "$$message.body"}
        }},
        {$addFields: {
            isValid:  {$and: [
                {$eq: ["$result.data.tagsRemove.node.id", {$concat: ["gid://shopify/Customer/", "$body.id"]}]}
            ]}
        }},
        {$project: {
            statusCode: {$cond: ["$isValid", {$literal: 200}, {$literal: 400}]},
            headers: {
                "Content-Type": "application/json"
            },
            body: {$cond: ["$isValid",
                '{"status":"success"}',
                {$json: {
                    status: "error",
                    result: "$result",
                    isValid:{$cond: ["$isValid", "true", "false"]}
                }}
            ]}
        }}
    ]
})
