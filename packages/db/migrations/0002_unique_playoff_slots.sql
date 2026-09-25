DELETE FROM predictions_playoff
WHERE id NOT IN (
  SELECT MIN(id)
  FROM predictions_playoff
  GROUP BY season_id, round, slot
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_playoff_season_round_slot
ON predictions_playoff(season_id, round, slot);
