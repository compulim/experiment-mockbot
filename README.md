## Issues to resolve

- Cognitive Services Speech Services
   - Token `#aad#/subscription/...#eyJ...` got 401 on Web Socket (STT) and 401 on issuing token
   - Verified the same token works with Text-to-Speech
- Azure Bot Services
   - Chicken-and-egg
      - Direct Line extension key vs. bot endpoint URL
      - Which services to create first? Azure Bot Services or Azure Web Apps?
   - Does not support managed identity to issue Direct Line token
      - It seems ABS need to onboard MSI, `getToken('https://directline.botframework.com/')` fail with HTTP 500
- Need RBAC
- DLASE does not return activity ID of outgoing activity
   - `const { id } = await context.sendActivity({})`
   - `id` is `undefined`
- Bot SDK `replyToId` bug
   - `getContinuationActivity()` also return `id: uuid()`
   - To workaround, hack the `context.activity.id`
   - `adapter.continueConversationAsync(..., context => { context.activity.id = replyToId || ''; ... })`
