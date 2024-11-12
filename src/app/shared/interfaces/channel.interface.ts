import { PostInterface } from "./post.interface";

export interface ChannelInterface {
  name: string,
  description: string,
  user: string[],
  owner: string,
  posts?: PostInterface[],
  id?: string
}
