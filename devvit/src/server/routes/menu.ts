import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from './core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();
    return c.json(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      } as UiResponse,
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json(
      {
        showToast: 'Failed to create QOKAH post',
      } as UiResponse,
      400
    );
  }
});
