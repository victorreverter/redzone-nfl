import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AppEnv } from './env';
import { seasonsRouter } from './routes/seasons';
import { teamsRouter } from './routes/teams';
import { gamesRouter } from './routes/games';
import { predictionsRouter } from './routes/predictions';
import { awardsRouter } from './routes/awards';
import { espnRouter, syncSeasonFromEspn } from './routes/espn';

const app = new Hono<{ Bindings: AppEnv['Bindings'] }>();

app.use('*', cors());

app.get('/', (c) => c.json({ status: 'ok', name: 'Redzone NFL API' }));

app.route('/seasons', seasonsRouter);
app.route('/teams', teamsRouter);
app.route('/games', gamesRouter);
app.route('/predictions', predictionsRouter);
app.route('/awards', awardsRouter);
app.route('/espn', espnRouter);

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: AppEnv['Bindings'], ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const season = await env.DB.prepare(
          "SELECT id FROM seasons WHERE status != 'completed' ORDER BY year DESC LIMIT 1"
        ).first() as { id: number } | null;

        if (!season) return;
        const result = await syncSeasonFromEspn(env.DB, season.id);
        console.log('Scheduled ESPN sync:', JSON.stringify(result));
      })()
    );
  },
};
