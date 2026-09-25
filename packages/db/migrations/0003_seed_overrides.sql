CREATE TABLE IF NOT EXISTS predictions_seed_override (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  conference TEXT NOT NULL,
  seed INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  UNIQUE(season_id, conference, seed)
);
