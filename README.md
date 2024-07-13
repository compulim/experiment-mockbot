## Issues to resolve

- Cognitive Services Speech Services
   - Token `#aad#/subscription/...#eyJ...` does not work on Web Socket nor issuing token
   - The same token does work with Text-to-Speech
- Azure Bot Services
   - Chicken-and-egg
      - Direct Line extension key vs. bot endpoint URL
   - (Need to verify) Does not support managed identity to issue Direct Line token
- Need RBAC
