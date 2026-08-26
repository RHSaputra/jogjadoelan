import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "2161071",
  key: process.env.PUSHER_KEY || "f3e9ef9647495d6eb53f",
  secret: process.env.PUSHER_SECRET || "a203ae0ee00b4dfe7118",
  cluster: process.env.PUSHER_CLUSTER || "ap1",
  useTLS: true,
});

export default pusher;
