# Project HEARMES AI coach transparency

The AI coach is a decision-support feature, not an institutional decision-maker. It receives only the authenticated user’s selected assessment profile: role, institution, optional unit, scored and excluded responses, optional dimension comments, report strengths/opportunities, methodology version, and the conversation being continued.

The production coach retrieves from the curated Project HEARMES knowledge corpus stored in `KnowledgeDocument` and `KnowledgeChunk`. It does not use open-web retrieval in the current implementation. Retrieved content is treated as untrusted reference text; the system prompt instructs the model not to follow instructions contained in source material.

## Private coach context

Authenticated users may add a text-based department policy, supervisor guidance, institutional guidance, or planning note to personalize their own coaching. The initial Neon-backed implementation accepts `.txt`, `.md`, `.csv`, and `.json` files up to **2 MB** each and stores the original bytes, extracted text, and retrieval chunks in `CoachContextDocument` and `CoachContextChunk`.

Every upload is `private` by default, is filtered by the authenticated user ID on every list, retrieval, and deletion operation, and is never copied into the shared Project HEARMES research corpus. Users can delete an uploaded document; its chunks are deleted with it. This small-file path is appropriate only for approved, non-sensitive material. PDF/Word extraction and a UNC-managed document store require separate institutional approval and infrastructure.

Conversations are stored only for the account that created them. Users can start a new conversation, continue a saved one, rename it through the API, and delete it. They are retained until the user deletes them or an approved institutional retention policy changes. Administrators must not receive raw user chats through aggregate dashboards or exports.

The coach may discuss institution or role aggregates only after the backend privacy threshold is met. It cannot identify individuals, rank respondents, or compare the user with another institution. Users should verify local policy, privacy, procurement, and academic-integrity requirements with authorized institutional stakeholders.
