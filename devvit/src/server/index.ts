import { context, reddit } from '@devvit/web/server';
import { createServer } from '@devvit/web/server';

const app = createServer();

// Player profile: returns Reddit username + snoovatar (or default) for the current viewer.
app.get('/api/profile', async (_req, res) => {
  try {
    const username = await reddit.getCurrentUsername();
    let avatarUrl: string | null = null;
    if (username) {
      const user = await reddit.getUserByUsername(username);
      avatarUrl = (await user?.getSnoovatarUrl()) ?? null;
    }
    res.json({ username: username ?? null, avatarUrl });
  } catch (err) {
    console.error('[qokah] /api/profile failed', err);
    res.json({ username: null, avatarUrl: null });
  }
});

// Menu action: create a new QOKAH post in the current subreddit.
app.post('/internal/menu/post-create', async (_req, res) => {
  try {
    const subreddit = context.subredditName;
    if (!subreddit) {
      res.status(400).json({ status: 'error', message: 'No subreddit context' });
      return;
    }
    const post = await reddit.submitCustomPost({
      subredditName: subreddit,
      title: 'QOKAH — Your Avatar Creates History',
      splash: { appDisplayName: 'QOKAH' },
    });
    res.json({ status: 'success', postId: post.id });
  } catch (err) {
    console.error('[qokah] post-create failed', err);
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

const port = Number(process.env.WEBBIT_PORT ?? process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`[qokah] server listening on :${port}`);
});
