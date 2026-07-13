import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from './core/post';

export const triggers = new Hono();

triggers.post('/on-app-install', async (_c) => {
  try {
    const post = await createPost();

    return c.json(
      {
        status: 'success',
        message: `QOKAH post created in r/${context.subredditName} (id ${post.id})`,
      } as TriggerResponse,
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json(
      {
        status: 'error',
        message: 'Failed to create QOKAH post',
      } as TriggerResponse,
      400
    );
  }
});
