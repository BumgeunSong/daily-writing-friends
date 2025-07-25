Great—using an existence check it is. Here’s the finalized requirement specification, updated to reflect that choice:

⸻

AI-Powered Writing Question Generator

Generate one thought-provoking, open-ended question per user’s newest post—once a day—storing it in Firestore so clients can fetch it immediately.

1. User Stories
   • Author: “When I write a post, I want an insightful question generated from my newest post each day.”
   • Reader: “I can fetch and view questions generated for any user, sorted by recency.”
   • Admin/Developer: “I can tweak the AI prompt template at runtime via Remote Config.”

2. Firestore Data Model

2.1 Questions Collection
• Path: users/{uid}/questions/{qid}
• Fields:

{
postId: string; // ID of the source post
text: string; // Generated question
createdAt: Timestamp; // Generation timestamp
attemptCount: number; // Number of AI attempts
status: "pending" | "done" | "failed";
}

    •	Indexes:
    •	createdAt descending for “most recent first” queries.

2.2 Remote Config for Prompt
• Path: Firebase Remote Config (e.g. genkit_prompt_template, genkit_max_retries)
• Keys:
• template (string): AI prompt with placeholder (e.g. “Based on the following post, ask an open-ended question that…: {{postText}}”)
• maxRetries (number): e.g. 3

3. Processing Logic

3.1 Scheduled Batch Function
• Trigger: Cloud Scheduler → Pub/Sub → Cloud Function
• Frequency: Daily at 00:00 Asia/Seoul
• Steps per run (per active user): 1. Fetch Newest Post:

const newestPost = await db
.collection(`users/${uid}/posts`)
.orderBy("createdAt", "desc")
.limit(1)
.get();

    2.	Existence Check:

const exists = await db
.collection(`users/${uid}/questions`)
.where("postId", "==", newestPost.id)
.limit(1)
.get();
if (!exists.empty) return; // already processed

    3.	Create Pending Question Doc:

const qRef = db.collection(`users/${uid}/questions`).doc();
await qRef.set({
postId: newestPost.id,
createdAt: admin.firestore.FieldValue.serverTimestamp(),
attemptCount: 0,
status: "pending"
});

    4.	Enqueue GenKit Flow: Call the GenKit-defined flow with { uid, postId, postText } and qRef.id as context.

3.2 GenKit Flow Definition
• Entry point: functions/src/generateQuestion.ts
• Using:

import { ai, onCallGenkit } from "genkit";
import _ as admin from "firebase-admin";
import _ as z from "zod";

    •	Zod Schemas:

const InputSchema = z.object({
uid: z.string(),
postId: z.string(),
postText: z.string(),
questionId: z.string()
});
const OutputSchema = z.object({
text: z.string()
});

    •	Flow:

export const generateQuestion = ai.defineFlow({
input: InputSchema,
output: OutputSchema,
handler: async ({ input }) => {
// 1. Load Remote Config
const rc = await admin.remoteConfig().getTemplate();
const template = rc.parameters.genkit_prompt_template.defaultValue.value!;
const maxRetries = Number(rc.parameters.genkit_max_retries.defaultValue.value!);

    // 2. Fill prompt
    const prompt = template.replace("{{postText}}", input.postText);

    // 3. Attempt generation with retry
    let attempt = 0, resultText = "";
    while (attempt < maxRetries) {
      try {
        const res = await ai.generate({ prompt });
        resultText = res.choices[0].message.content;
        break;
      } catch {
        attempt++;
        await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
      }
    }
    // 4. Update Firestore
    const qRef = admin.firestore()
      .collection(`users/${input.uid}/questions`)
      .doc(input.questionId);
    await qRef.update({
      text: resultText,
      status: resultText ? "done" : "failed",
      attemptCount: attempt + 1
    });
    return { text: resultText };

}
});

// Expose as callable function
export const onGenerateQuestion = onCallGenkit(generateQuestion);

    •	Deployment: firebase deploy --only functions

4. Client-Side Fetch
   • Query:

const questionsRef = db
.collection(`users/${uid}/questions`)
.orderBy("createdAt", "desc");

    •	Realtime Listener: Subscribed to questionsRef.onSnapshot(...) for live updates.

5. Security Rules

match /users/{uid}/questions/{qid} {
allow read: if request.auth != null;
allow write: if false; // only backend functions may write
}

6. Monitoring & Alerts
   • Logging: Each generation attempt logs status to Cloud Logging.
   • Alert: Set an alert for >10 status=="failed" writes in a 24h window.

⸻

With these requirements solidified, the next step is to implement: 1. Remote Config parameters. 2. Scheduler + Pub/Sub in firebase.json. 3. Cloud Function code (above). 4. Security Rules. 5. Client integration.

Let me know if you’d like to start coding any of these pieces now!
