# @atomist/automate-graphql-deploy

This repository contains the code described in
 [Automation Story: GraphQL schema deployment](https://the-composition.com/automation-story-graphql-schema-deployment-7893eb55ed18)

There are three automations here, and they run based on the Atomist automation client.
To build your own automations, I recommend starting with [Quick Start](https://docs.atomist.com/quick-start/).

To peruse this code, I recommend starting with [src/atomist.config.ts](src/atomist.config.ts) .
This configures the automations described in the video:

*  a "deploy graphql schema" [command](src/graphql-schema/PushSchemaToNeo.ts)
*  respond to GitHub pushes by noticing schema changes in [NoticeSchemaChange.ts](src/graphql-schema/NoticeSchemaChange.ts)
*  respond to changes in the schema by sending a message in [SuggestSchemaDeploy.ts](src/graphql-schema/SuggestSchemaDeploy.ts)

If you run this code yourself, it won't do much for you, unless you have a setup just like ours. 
Atomist is about building automations for _your_ team. If there's anything you can do over HTTP that you'd like
to make trivially easy in Slack, or if you'd like to see 
GitHub push notifications that highlight particular files or particular content when it changes,
 you'll find this code useful as examples when you build your own automations with Atomist. 

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack team][slack].

[atomist]: https://www.atomist.com/
[slack]: https://join.atomist.com
