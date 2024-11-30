import * as v2 from "firebase-functions/v2";
import { onCommentCreated } from './notifications/commentOnPost';
import { onReplyCreatedOnComment } from './notifications/replyOnComment';
export const helloWorld = v2.https.onRequest((request, response) => {
  const name = request.query.name;
  response.send(`<h1>Hello ${name}!</h1>`);
});

export { onCommentCreated, onReplyCreatedOnComment };